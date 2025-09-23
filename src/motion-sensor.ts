import { type Logger } from "@matter/main";
import type { Endpoint } from "@project-chip/matter.js/device";
import {
  OccupancySensing,
  TemperatureMeasurement,
} from "@matter/main/clusters";
import type { ClusterClientObj } from "@matter/main/protocol";

export function getMotionSensor(
  logger: Logger,
  name: string,
  endpoint?: Endpoint,
) {
  if (!endpoint) {
    logger.warn(`Motion Sensor "${name}" not found"`);
  }

  let occupancy: ClusterClientObj<OccupancySensing.Complete> | undefined;
  let temperature: ClusterClientObj<TemperatureMeasurement.Cluster> | undefined;

  if (endpoint) {
    for (const child of endpoint?.parts.values()) {
      if (!occupancy) {
        occupancy = child.getClusterClient(OccupancySensing.Complete);
      }
      if (!temperature) {
        temperature = child.getClusterClient(TemperatureMeasurement.Complete);
      }
    }
    if (!occupancy) {
      logger.warn(
        `"${name}" is missing the occupancy behviour and may not be a motion sensor`,
      );
    }
  }

  return {
    occupancy: {
      get value() {
        return occupancy?.attributes.occupancy.getLocal();
      },
      onChange: (handler: (occupied: boolean) => void) => {
        occupancy?.attributes.occupancy.addListener((value) => {
          if (value && value.occupied !== undefined) {
            handler(value.occupied);
          }
        });
      },
    },
    temperature: {
      get value() {
        return temperature?.attributes.measuredValue.getLocal() ?? null;
      },
      onChange: (handler: (temperature: number | null) => void) => {
        temperature?.attributes.measuredValue.addListener(handler);
      },
    },
  };
}
