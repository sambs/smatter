import { BehaviorSubject } from "rxjs";
import { Endpoint } from "@matter/main";
import { OnOffPlugInUnitDevice } from "@matter/main/devices";
import { BridgedDeviceBasicInformationServer } from "@matter/main/behaviors";

export class Switch extends BehaviorSubject<boolean> {
  endpoint: Endpoint<OnOffPlugInUnitDevice>;

  constructor(endpoint: Endpoint<OnOffPlugInUnitDevice>) {
    super(endpoint.state.onOff.onOff);

    this.endpoint = endpoint;

    endpoint.events.onOff.onOff$Changed.on((value) => {
      super.next(value);
    });
  }

  override next(value: boolean): void {
    if (value) {
      this.endpoint.commands.onOff.on(undefined);
    } else {
      this.endpoint.commands.onOff.off(undefined);
    }
  }

  static createEndpoint(id: string, name: string) {
    return new Endpoint(
      OnOffPlugInUnitDevice.with(BridgedDeviceBasicInformationServer),
      {
        id,
        bridgedDeviceBasicInformation: {
          nodeLabel: name, // Main end user name for the device
          productName: `${name} Product`,
          productLabel: `${name} Product Label`,
          serialNumber: `${id}-serial`,
          reachable: true,
        },
      },
    );
  }
}
