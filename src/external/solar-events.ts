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
  includePastToday?: boolean;
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

/** Emits at Sunrise & sunset every day */
export function createSolarEvents(
  location: Location,
  opts: SolarEventsOptions = {},
): Observable<SolarEvent> {
  const { offsets = {}, includePastToday = false } = opts;

  return defer(() => {
    const now = Temporal.Now.zonedDateTimeISO(location.tz);
    const today = now.toPlainDate();

    const noaLocation = new GeoLocation(
      location.name ?? null,
      location.lat,
      location.long,
      location.elevation,
      location.tz,
    );
    const calculator = new NOAACalculator(noaLocation, today);

    const events: SolarEvent[] = [
      calculator.getSunrise() && {
        name: "sunrise" as const,
        at: addOffset(calculator.getSunrise(), offsets.sunrise)!,
        day: today,
      },
      calculator.getSunset() && {
        name: "sunset" as const,
        at: addOffset(calculator.getSunset(), offsets.sunset)!,
        day: today,
      },
    ].filter(Boolean) as SolarEvent[];

    const pending = events
      .filter(
        (e) =>
          includePastToday || Temporal.ZonedDateTime.compare(e.at, now) === 1,
      )
      .sort((a, b) => Temporal.ZonedDateTime.compare(a.at, b.at));

    const todaysEvents = pending.map((e) =>
      timer(toDate(e.at)).pipe(map(() => e)),
    );

    const nextMidnight = today.add({ days: 1 }).toZonedDateTime({
      timeZone: location.tz,
      plainTime: Temporal.PlainTime.from("00:00"),
    });

    const tomorrowsEvents = timer(toDate(nextMidnight)).pipe(
      mergeMap(() => createSolarEvents(location, opts)),
    );

    return merge(...todaysEvents, tomorrowsEvents);
  });
}
