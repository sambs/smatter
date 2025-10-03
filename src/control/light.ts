import { Endpoint } from "@matter/main";
import { AggregatorEndpoint } from "@matter/main/endpoints/aggregator";
import { DimmableLightDevice } from "@matter/main/devices";
import {
  BridgedDeviceBasicInformationServer,
  LevelControlServer,
} from "@matter/main/behaviors";
import { InterceptingSubject } from "../rxjs/intercepting-subject.ts";
import type { LevelControl } from "@matter/main/clusters";

export async function createLightControl(
  aggregator: Endpoint<AggregatorEndpoint>,
  id: string,
  name: string,
) {
  const endpoint = await createLightControlEndpoint(aggregator, id, name);

  const level = new InterceptingSubject<number | null>(
    endpoint.events.levelControl.currentLevel$Changed,
    (level) => {
      if (level !== null) {
        endpoint.commands.levelControl.moveToLevel({
          level,
          transitionTime: 0,
          optionsMask: { coupleColorTempToLevel: true }, // Specify that we want executeIfOff to be respected
          optionsOverride: { coupleColorTempToLevel: true },
        });
      }
    },
  );
  endpoint.events.levelControl.addEvent;

  const commands = {
    level: {
      moveToLevel: {
        next: (request: Partial<LevelControl.MoveToLevelRequest>) => {
          endpoint.commands.levelControl.moveToLevel({
            level: 128,
            transitionTime: 0,
            optionsMask: { coupleColorTempToLevel: true }, // Specify that we want executeIfOff to be respected
            optionsOverride: { coupleColorTempToLevel: true },
            ...request,
          });
        },
      },
    },
  };

  // level.subscribe({
  //   next: (v) => console.log(`Light ${id} ${name}: ${v}`),
  // });
  //
  // endpoint.events.levelControl.currentLevel$Changed.on((value) => {
  //   if (value !== null) level.next(value);
  // });
  //
  // endpoint.events.onOff.onOff$Changed.on((value) => {
  //   if (value === false) level.next(0);
  // });

  return {
    endpoint,
    level,
    commands,
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
