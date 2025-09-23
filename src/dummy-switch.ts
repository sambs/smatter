import { Endpoint } from "@matter/main";
import { AggregatorEndpoint } from "@matter/main/endpoints/aggregator";
import { BridgedDeviceBasicInformationServer } from "@matter/main/behaviors/bridged-device-basic-information";
import { OnOffServer } from "@matter/main/behaviors/on-off";
import { OnOffPlugInUnitDevice } from "@matter/main/devices/on-off-plug-in-unit";

export async function createDummySwitch(
  aggregator: Endpoint<AggregatorEndpoint>,
  id: string,
  name: string,
) {
  const endpoint = await createDummySwitchEndpoint(aggregator, id, name);

  const getOnOffState = () => {
    return endpoint.stateOf(OnOffServer);
  };

  return {
    endpoint,
    get value() {
      return getOnOffState().onOff;
    },
    onChange(handler: (value: boolean) => void) {
      endpoint.events.onOff.onOff$Changed.on(handler);
    },
  };
}

export async function deleteDummySwitch(
  aggregator: Endpoint<AggregatorEndpoint>,
  id: string,
  name: string,
) {
  const endpoint = await createDummySwitchEndpoint(aggregator, id, name);

  await endpoint.delete();
}

export async function createDummySwitchEndpoint(
  aggregator: Endpoint<AggregatorEndpoint>,
  id: string,
  name: string,
) {
  const endpoint = new Endpoint(
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

  await aggregator.add(endpoint);

  return endpoint;
}
