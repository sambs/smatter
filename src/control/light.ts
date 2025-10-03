import { Endpoint } from "@matter/main";
import { AggregatorEndpoint } from "@matter/main/endpoints/aggregator";
import { DimmableLightDevice } from "@matter/main/devices";
import {
  BridgedDeviceBasicInformationServer,
  LevelControlServer,
} from "@matter/main/behaviors";
import { Observable } from "rxjs";

export async function createLightControl(
  aggregator: Endpoint<AggregatorEndpoint>,
  id: string,
  name: string,
) {
  const endpoint = await createLightControlEndpoint(aggregator, id, name);

  const getLevelControlState = () => {
    return endpoint.stateOf(LevelControlServer);
  };

  const observable = new Observable<number>((subscriber) => {
    endpoint.events.levelControl.currentLevel$Changed.on((value) => {
      if (value !== null) subscriber.next(value);
    });
    endpoint.events.onOff.onOff$Changed.on((value) => {
      if (value !== false) subscriber.next(0);
    });
  });

  return {
    endpoint,
    get value() {
      return getLevelControlState().currentLevel;
    },
    onChange(handler: (value: number) => void) {
      endpoint.events.levelControl.currentLevel$Changed.on((value) => {
        if (value !== null) handler(value);
      });
      endpoint.events.onOff.onOff$Changed.on((value) => {
        if (value !== false) handler(0);
      });
    },
    subscribe: observable.subscribe.bind(observable),
  };
}

export async function deleteLightControl(
  aggregator: Endpoint<AggregatorEndpoint>,
  id: string,
  name: string,
) {
  const endpoint = await createLightControlEndpoint(aggregator, id, name);

  await endpoint.delete();
}

export async function createLightControlEndpoint(
  aggregator: Endpoint<AggregatorEndpoint>,
  id: string,
  name: string,
) {
  const endpoint = new Endpoint(
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

  await aggregator.add(endpoint);

  return endpoint;
}
