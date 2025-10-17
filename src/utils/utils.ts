import type { DecodedEventData } from "@matter/main/protocol";

export function getEventDelay(event: DecodedEventData<any>) {
  return (
    event.epochTimestamp && BigInt(Date.now()) - BigInt(event.epochTimestamp)
  );
}

export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));
