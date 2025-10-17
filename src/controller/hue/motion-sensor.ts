import { Observable } from "rxjs";
import { type Logger } from "@matter/main";
import type { ClusterClientObj } from "@matter/main/protocol";
import {
  OccupancySensing,
  TemperatureMeasurement,
} from "@matter/main/clusters";
import type { Endpoint } from "@project-chip/matter.js/device";

export function getMotionSensor(
  logger: Logger,
  name: string,
  endpoint?: Endpoint,
) {
  if (!endpoint) {
    logger.warn(`Motion Sensor "${name}" not found"`);
  }

  let occupancyClient: ClusterClientObj<OccupancySensing.Complete> | undefined;
  let temperatureClient:
    | ClusterClientObj<TemperatureMeasurement.Cluster>
    | undefined;

  if (endpoint) {
    for (const child of endpoint?.parts.values()) {
      if (!occupancyClient) {
        occupancyClient = child.getClusterClient(OccupancySensing.Complete);
      }
      if (!temperatureClient) {
        temperatureClient = child.getClusterClient(
          TemperatureMeasurement.Complete,
        );
      }
    }
    if (!occupancyClient) {
      logger.warn(
        `"${name}" is missing the occupancy behviour and may not be a motion sensor`,
      );
    }
  }

  return {
    isOccupied: new Observable<boolean>((subscriber) => {
      if (occupancyClient) {
        occupancyClient.attributes.occupancy.addListener(({ occupied }) => {
          if (occupied !== undefined) {
            subscriber.next(occupied);
          }
        });
        occupancyClient.attributes.occupancy.get().then((value) => {
          if (value?.occupied !== undefined) {
            subscriber.next(value.occupied);
          }
        });
      }
    }),
    temperature: new Observable<number>((subscriber) => {
      if (temperatureClient) {
        temperatureClient.attributes.measuredValue.addListener(
          (temperature) => {
            if (temperature !== null) {
              subscriber.next(temperature);
            }
          },
        );
        temperatureClient.attributes.measuredValue.get().then((temperature) => {
          if (temperature !== undefined && temperature !== null) {
            subscriber.next(temperature);
          }
        });
      }
    }),
  };
}
