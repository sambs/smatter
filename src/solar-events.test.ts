import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Temporal } from "temporal-polyfill";
import { firstValueFrom, take, toArray } from "rxjs";
import type { Location } from "./location.ts";
import type { SolarEvent } from "./solar-events.ts";

type SolarDayEvents = {
  sunrise: Temporal.ZonedDateTime | null;
  sunset: Temporal.ZonedDateTime | null;
};

const solarDayStore = vi.hoisted(
  () => new Map<string, SolarDayEvents>(),
) as Map<string, SolarDayEvents>;

vi.mock("@hebcal/noaa", () => {
  class GeoLocation {
    name: string | null;
    lat: number;
    long: number;
    elevation: number;
    tz: string;

    constructor(
      name: string | null,
      lat: number,
      long: number,
      elevation: number,
      tz: string,
    ) {
      this.name = name;
      this.lat = lat;
      this.long = long;
      this.elevation = elevation;
      this.tz = tz;
    }
  }

  class NOAACalculator {
    private dateKey: string;

    constructor(_location: GeoLocation, date: Temporal.PlainDate) {
      this.dateKey = date.toString();
    }

    getSunrise() {
      return solarDayStore.get(this.dateKey)?.sunrise ?? null;
    }

    getSunset() {
      return solarDayStore.get(this.dateKey)?.sunset ?? null;
    }
  }

  return { GeoLocation, NOAACalculator };
});

const { createSolarEvents } = await import("./solar-events.ts");

const testLocation: Location = {
  name: "Test City",
  lat: 40.7128,
  long: -74.006,
  elevation: 10,
  tz: "America/New_York",
};

const toEpochMs = (zdt: Temporal.ZonedDateTime) =>
  zdt.toInstant().epochMilliseconds;

function setSolarDay(
  date: Temporal.PlainDate,
  events: Partial<SolarDayEvents>,
): void {
  const existing = solarDayStore.get(date.toString()) ?? {
    sunrise: null,
    sunset: null,
  };
  solarDayStore.set(date.toString(), { ...existing, ...events });
}

function setNow(isoZoned: string): Temporal.ZonedDateTime {
  const zdt = Temporal.ZonedDateTime.from(isoZoned);
  vi.setSystemTime(new Date(toEpochMs(zdt)));
  return zdt;
}

let nowSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  solarDayStore.clear();
  vi.useFakeTimers();
  nowSpy = vi
    .spyOn(Temporal.Now, "zonedDateTimeISO")
    .mockImplementation((timeZoneLike) => {
      if (!timeZoneLike) {
        throw new Error("timeZone is required in mock");
      }
      return Temporal.Instant.fromEpochMilliseconds(Date.now()).toZonedDateTimeISO(
        timeZoneLike,
      );
    });
});

afterEach(() => {
  nowSpy.mockRestore();
  vi.useRealTimers();
});

describe("createSolarEvents", () => {
  it("emits the next upcoming event for today when past events are excluded", async () => {
    const now = setNow("2024-06-10T15:00:00-04:00[America/New_York]");
    const sunrise = Temporal.ZonedDateTime.from(
      "2024-06-10T06:00:00-04:00[America/New_York]",
    );
    const sunset = Temporal.ZonedDateTime.from(
      "2024-06-10T20:15:00-04:00[America/New_York]",
    );

    setSolarDay(now.toPlainDate(), { sunrise, sunset });

    const eventPromise = firstValueFrom(
      createSolarEvents(testLocation).pipe(take(1)),
    );

    await vi.advanceTimersByTimeAsync(toEpochMs(sunset) - toEpochMs(now));

    const event = await eventPromise;

    expect(event.name).toBe("sunset");
    expect(Temporal.ZonedDateTime.compare(event.at, sunset)).toBe(0);
    expect(Temporal.PlainDate.compare(event.day, now.toPlainDate())).toBe(0);
  });

  it("includes past events today when includePastToday is true", async () => {
    const now = setNow("2024-06-10T08:00:00-04:00[America/New_York]");
    const sunrise = Temporal.ZonedDateTime.from(
      "2024-06-10T06:00:00-04:00[America/New_York]",
    );
    const sunset = Temporal.ZonedDateTime.from(
      "2024-06-10T18:30:00-04:00[America/New_York]",
    );

    setSolarDay(now.toPlainDate(), { sunrise, sunset });

    const eventsPromise = firstValueFrom(
      createSolarEvents(testLocation, { includePastToday: true }).pipe(
        take(2),
        toArray(),
      ),
    );

    await vi.runOnlyPendingTimersAsync();
    await vi.advanceTimersByTimeAsync(toEpochMs(sunset) - toEpochMs(now));

    const events = await eventsPromise;

    const names = events.map((event: SolarEvent) => event.name);
    expect(names).toEqual(["sunrise", "sunset"]);
    expect(Temporal.ZonedDateTime.compare(events[0].at, sunrise)).toBe(0);
    expect(Temporal.ZonedDateTime.compare(events[1].at, sunset)).toBe(0);
  });

  it("applies configured offsets to emitted times", async () => {
    const now = setNow("2024-06-10T15:00:00-04:00[America/New_York]");
    const sunset = Temporal.ZonedDateTime.from(
      "2024-06-10T18:00:00-04:00[America/New_York]",
    );

    setSolarDay(now.toPlainDate(), { sunrise: null, sunset });

    const offset = { minutes: 15 };
    const expected = sunset.add(offset);

    const eventPromise = firstValueFrom(
      createSolarEvents(testLocation, { offsets: { sunset: offset } }).pipe(
        take(1),
      ),
    );

    await vi.advanceTimersByTimeAsync(toEpochMs(expected) - toEpochMs(now));

    const event = await eventPromise;

    expect(event.name).toBe("sunset");
    expect(Temporal.ZonedDateTime.compare(event.at, expected)).toBe(0);
  });

  it("recomputes events after midnight for the next day", async () => {
    const now = setNow("2024-06-10T23:55:00-04:00[America/New_York]");
    const today = now.toPlainDate();
    const tomorrow = today.add({ days: 1 });

    const tomorrowSunrise = Temporal.ZonedDateTime.from(
      "2024-06-11T06:05:00-04:00[America/New_York]",
    );
    const tomorrowSunset = Temporal.ZonedDateTime.from(
      "2024-06-11T19:45:00-04:00[America/New_York]",
    );

    setSolarDay(today, { sunrise: null, sunset: null });
    setSolarDay(tomorrow, {
      sunrise: tomorrowSunrise,
      sunset: tomorrowSunset,
    });

    const eventPromise = firstValueFrom(
      createSolarEvents(testLocation).pipe(take(1)),
    );

    await vi.advanceTimersByTimeAsync(toEpochMs(tomorrowSunrise) - toEpochMs(now));

    const event = await eventPromise;

    expect(event.name).toBe("sunrise");
    expect(Temporal.ZonedDateTime.compare(event.at, tomorrowSunrise)).toBe(0);
    expect(Temporal.PlainDate.compare(event.day, tomorrow)).toBe(0);
  });
});
