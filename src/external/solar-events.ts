import { GeoLocation, NOAACalculator } from "@hebcal/noaa";
import { Temporal } from "temporal-polyfill";
import { defer, merge, mergeMap, map, timer, Observable } from "rxjs";
import type { Location } from "./location.ts";

type SolarEventName = "sunrise" | "sunset";

export type SolarEvent = {
  name: SolarEventName;
  at: Temporal.ZonedDateTime; // when it happens (zoned)
  day: Temporal.PlainDate; // civil day used for calc
};

export type SolarEventsOptions = {
  offsets?: Partial<Record<SolarEventName, number | Temporal.DurationLike>>;
  includeMostRecent?: boolean;
};

const toDate = (zdt: Temporal.ZonedDateTime) =>
  new Date(zdt.toInstant().epochMilliseconds);

const addOffset = (
  zdt: Temporal.ZonedDateTime | null,
  offset: number | Temporal.DurationLike = 0,
): Temporal.ZonedDateTime | null => {
  if (!zdt) return zdt;
  return zdt.add(
    typeof offset === "number" ? { milliseconds: offset } : offset,
  );
};

const compareByTime = (a: SolarEvent, b: SolarEvent) =>
  Temporal.ZonedDateTime.compare(a.at, b.at);

/** Emits at Sunrise & sunset every day */
export function createSolarEvents(
  location: Location,
  options: SolarEventsOptions = {},
): Observable<SolarEvent> {
  const { offsets = {}, includeMostRecent = false } = options;

  return defer(() => {
    const now = Temporal.Now.zonedDateTimeISO(location.tz);
    const today = now.toPlainDate();
    const startOfTomorrow = today.add({ days: 1 }).toZonedDateTime({
      timeZone: location.tz,
      plainTime: Temporal.PlainTime.from("00:00"),
    });

    const noaLocation = new GeoLocation(
      location.name ?? null,
      location.lat,
      location.long,
      location.elevation,
      location.tz,
    );

    const isAfterNow = (event: SolarEvent) =>
      Temporal.ZonedDateTime.compare(event.at, now) === 1;

    const pickMostRecent = (events: SolarEvent[]): SolarEvent | undefined =>
      events
        .filter((event) => !isAfterNow(event))
        .sort((a, b) => compareByTime(b, a))[0];

    const getDaysEvents = (day: Temporal.PlainDate): SolarEvent[] => {
      const calculator = new NOAACalculator(noaLocation, day);
      const sunrise = calculator.getSunrise();
      const sunset = calculator.getSunset();

      return (
        [
          sunrise && {
            name: "sunrise" as const,
            at: addOffset(sunrise, offsets.sunrise)!,
            day,
          },
          sunset && {
            name: "sunset" as const,
            at: addOffset(sunset, offsets.sunset)!,
            day,
          },
        ].filter(Boolean) as SolarEvent[]
      ).sort(compareByTime);
    };

    const todaysEvents = getDaysEvents(today);
    const todaysPendingEvents = todaysEvents.filter(isAfterNow);
    const mostRecentEvent =
      pickMostRecent(todaysEvents) ??
      pickMostRecent(getDaysEvents(today.subtract({ days: 1 })));

    const events = [
      ...(includeMostRecent && mostRecentEvent ? [mostRecentEvent] : []),
      ...todaysPendingEvents,
    ].sort(compareByTime);

    const events$ = events.map((event) =>
      timer(toDate(event.at)).pipe(map(() => event)),
    );

    const tomorrow$ = timer(toDate(startOfTomorrow)).pipe(
      mergeMap(() => createSolarEvents(location, { offsets })),
    );

    return merge(...events$, tomorrow$);
  });
}
