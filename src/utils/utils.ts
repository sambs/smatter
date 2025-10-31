import type { DecodedEventData } from "@matter/main/protocol";

export function getEventDelay(event: DecodedEventData<any>) {
  return (
    event.epochTimestamp && BigInt(Date.now()) - BigInt(event.epochTimestamp)
  );
}

export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

type AnyRecord = Record<PropertyKey, unknown>;

export function mapValues<T extends AnyRecord, R>(
  obj: T,
  fn: <K extends keyof T>(value: T[K], key: K) => R,
): { [K in keyof T]: R } {
  const out = {} as { [K in keyof T]: R };
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const k = key as keyof T;
      out[k] = fn(obj[k], k);
    }
  }
  return out;
}
