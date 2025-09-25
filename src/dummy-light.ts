import { Endpoint } from "@matter/main";
import { AggregatorEndpoint } from "@matter/main/endpoints/aggregator";
import { DimmableLightDevice } from "@matter/main/devices";
import {
  BridgedDeviceBasicInformationServer,
  LevelControlServer,
} from "@matter/main/behaviors";

export async function createDummyLight(
  aggregator: Endpoint<AggregatorEndpoint>,
  id: string,
  name: string,
) {
  const endpoint = await createDummyLightEndpoint(aggregator, id, name);

  const getLevelControlState = () => {
    return endpoint.stateOf(LevelControlServer);
  };

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
  };
}

export async function deleteDummyLight(
  aggregator: Endpoint<AggregatorEndpoint>,
  id: string,
  name: string,
) {
  const endpoint = await createDummyLightEndpoint(aggregator, id, name);

  await endpoint.delete();
}

export async function createDummyLightEndpoint(
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
