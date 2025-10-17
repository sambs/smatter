import { Observable } from "rxjs";
import { type Logger } from "@matter/main";
import { Switch } from "@matter/main/clusters";
import type { Endpoint } from "@project-chip/matter.js/device";
import type { DecodedEventData } from "@matter/main/protocol";

export function getDimmerSwitch(
  logger: Logger,
  name: string,
  endpoint?: Endpoint,
) {
  if (!endpoint) {
    logger.warn(`Dimmer Switch "${name}" not found"`);
  }

  const [e0, e1, e2, e3] = endpoint?.parts.values() ?? [];

  return {
    topButton: createSwitchObservables(e0),
    brightenButton: createSwitchObservables(e1),
    dimButton: createSwitchObservables(e2),
    bottomButton: createSwitchObservables(e3),
  };
}

function createSwitchObservables(endpoint?: Endpoint) {
  const client = endpoint?.getClusterClient(Switch.Complete);

  return {
    initialPress: new Observable<DecodedEventData<any>>((subscriber) => {
      client?.events.initialPress.addListener((event) => {
        subscriber.next(event);
      });
    }),
    shortRelease: new Observable<DecodedEventData<any>>((subscriber) => {
      client?.events.shortRelease.addListener((event) => {
        subscriber.next(event);
      });
    }),
  };
}
