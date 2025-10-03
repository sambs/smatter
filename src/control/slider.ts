import { BehaviorSubject } from "rxjs";
import { Endpoint } from "@matter/main";
import { DimmableLightDevice } from "@matter/main/devices";
import { BridgedDeviceBasicInformationServer } from "@matter/main/behaviors";

export class Slider extends BehaviorSubject<number> {
  endpoint: Endpoint<DimmableLightDevice>;

  constructor(endpoint: Endpoint<DimmableLightDevice>) {
    super(endpoint.state.levelControl.currentLevel ?? 0);

    this.endpoint = endpoint;

    endpoint.events.levelControl.currentLevel$Changed.on((value) => {
      super.next(value ?? 0);
    });
  }

  override next(value: number): void {
    this.endpoint.commands.levelControl.moveToLevel({
      level: value,
      transitionTime: 0,
      optionsMask: { coupleColorTempToLevel: true }, // Specify that we want executeIfOff to be respected
      optionsOverride: { coupleColorTempToLevel: true },
    });
  }

  static createEndpoint(id: string, name: string) {
    return new Endpoint(
      DimmableLightDevice.with(BridgedDeviceBasicInformationServer),
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
