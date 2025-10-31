import { BehaviorSubject } from "rxjs";
import { Endpoint } from "@matter/main";
import { OnOffPlugInUnitDevice } from "@matter/main/devices";
import { Switch } from "./switch.ts";
import { mapValues } from "../utils/utils.ts";

export type RadioButtonConfig<S extends string> = Record<S, string>;
export type RadioButtonEndpoints<S extends string> = Record<
  S,
  Endpoint<OnOffPlugInUnitDevice>
>;

export class RadioButtons<S extends string> extends BehaviorSubject<S | null> {
  endpoints: RadioButtonEndpoints<S>;

  constructor(endpoints: RadioButtonEndpoints<S>) {
    super(null);

    this.endpoints = endpoints;

    for (const id in endpoints) {
      if (Object.hasOwn(endpoints, id)) {
        const endpoint = endpoints[id];

        endpoint.events.onOff.onOff$Changed.on((onOff) => {
          console.log("OnOff", onOff, endpoint.id, this.value);

          const otherEndpoints = Object.values(
            this.endpoints as Record<string, Endpoint<OnOffPlugInUnitDevice>>,
          ).filter((other) => other !== endpoint);

          if (onOff || id === this.value) {
            super.next(onOff ? id : null);

            // Turn off the other switches
            otherEndpoints.forEach((other) => {
              other.commands.onOff.off(undefined);
            });
          }
        });
      }
    }
  }

  override next(value: S | null): void {
    console.log(`Request for ${value}`);
    // if (value) {
    //   this.endpoint.commands.onOff.on(undefined);
    // } else {
    //   this.endpoint.commands.onOff.off(undefined);
    // }
  }

  static createEndpoints<S extends string>(
    idPrefix: string,
    buttonConfig: RadioButtonConfig<S>,
  ) {
    return mapValues(buttonConfig, (name, id) => {
      return Switch.createEndpoint(`${idPrefix}-${id}`, name);
    });
  }
}
