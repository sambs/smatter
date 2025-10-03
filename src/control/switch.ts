import { Endpoint } from "@matter/main";
import { AggregatorEndpoint } from "@matter/main/endpoints/aggregator";
import { OnOffPlugInUnitDevice } from "@matter/main/devices";
import {
  BridgedDeviceBasicInformationServer,
  OnOffServer,
} from "@matter/main/behaviors";
import { Subject } from "rxjs";

export async function createSwitchControl(
  aggregator: Endpoint<AggregatorEndpoint>,
  id: string,
  name: string,
) {
  const endpoint = await createSwitchControlEndpoint(aggregator, id, name);

  const onOff = new Subject<boolean>();

  onOff.subscribe({
    next: (v) => console.log(`Switch ${id} ${name}: ${v}`),
  });

  endpoint.events.onOff.onOff$Changed.on((value) => {
    onOff.next(value);
  });

  return {
    endpoint,
    onOff,
  };
}

export async function deleteSwitchControl(
  aggregator: Endpoint<AggregatorEndpoint>,
  id: string,
  name: string,
) {
  const endpoint = await createSwitchControlEndpoint(aggregator, id, name);

  await endpoint.delete();
}

export async function createSwitchControlEndpoint(
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
