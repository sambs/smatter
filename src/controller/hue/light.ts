import { Observable } from "rxjs";
import { type Logger } from "@matter/main";
import { ColorControl, LevelControl, OnOff } from "@matter/main/clusters";
import type { BitFlag, TypeFromPartialBitSchema } from "@matter/main/types";
import type { Endpoint } from "@project-chip/matter.js/device";
import { clamp } from "../../utils/utils.ts";
import { ColorTemperature } from "../../constants.ts";

const INTESITY_COLOR_TEMPERATURE_OFFSET = 500;

type MoveToIntensityRequest = {
  intensity: number;
  transitionTime: number;
  optionsMask: TypeFromPartialBitSchema<{
    executeIfOff: BitFlag;
  }>;
  optionsOverride: TypeFromPartialBitSchema<{
    executeIfOff: BitFlag;
  }>;
};

export function getLight(logger: Logger, name: string, endpoint?: Endpoint) {
  if (!endpoint) {
    logger.warn(`Light "${name}" not found"`);
  }

  const onOffClient = endpoint?.getClusterClient(OnOff.Complete);
  const colorClient = endpoint?.getClusterClient(ColorControl.Complete);
  const levelClient = endpoint?.getClusterClient(LevelControl.Complete);

  return {
    isOn: new Observable<boolean>((subscriber) => {
      if (onOffClient) {
        onOffClient.attributes.onOff.addListener((value) => {
          subscriber.next(value);
        });
        onOffClient.attributes.onOff.get().then((value) => {
          if (value !== undefined) {
            subscriber.next(value);
          }
        });
      }
    }),
    turnOn: {
      next: () => {
        onOffClient?.on();
      },
    },
    turnOff: {
      next: () => {
        onOffClient?.off();
      },
    },
    level: new Observable<number>((subscriber) => {
      if (levelClient) {
        levelClient.attributes.currentLevel.addListener((level) => {
          if (level !== null) {
            subscriber.next(level);
          }
        });
        levelClient.attributes.currentLevel.get().then((level) => {
          if (level !== undefined && level !== null) {
            subscriber.next(level);
          }
        });
      }
    }),
    moveToLevel: {
      next: (request: Partial<LevelControl.MoveToLevelRequest>) => {
        levelClient?.moveToLevel({
          level: 128,
          transitionTime: 0,
          optionsMask: { executeIfOff: true },
          optionsOverride: { executeIfOff: true },
          ...request,
        });
      },
    },
    moveToLevelWithOnOff: {
      next: (request: Partial<LevelControl.MoveToLevelRequest>) => {
        levelClient?.moveToLevelWithOnOff({
          level: 128,
          transitionTime: 0,
          optionsMask: { executeIfOff: true },
          optionsOverride: { executeIfOff: true },
          ...request,
        });
      },
    },
    colorTemperature: new Observable<number>((subscriber) => {
      if (colorClient) {
        colorClient.attributes.colorTemperatureMireds.addListener(
          (temperature) => {
            if (temperature !== undefined) {
              subscriber.next(temperature);
            }
          },
        );
        colorClient.attributes.colorTemperatureMireds
          .get()
          .then((temperature) => {
            if (temperature !== undefined) {
              subscriber.next(temperature);
            }
          });
      }
    }),
    moveToColorTemperature: {
      next: (request: Partial<ColorControl.MoveToColorTemperatureRequest>) => {
        colorClient?.moveToColorTemperature({
          colorTemperatureMireds: ColorTemperature.WARM,
          transitionTime: 0,
          optionsMask: { executeIfOff: true },
          optionsOverride: { executeIfOff: true },
          ...request,
        });
      },
    },
    moveToIntensity: {
      next: ({ intensity, ...request }: Partial<MoveToIntensityRequest>) => {
        intensity = intensity ?? 127;

        colorClient?.moveToColorTemperature({
          colorTemperatureMireds: INTESITY_COLOR_TEMPERATURE_OFFSET - intensity,
          transitionTime: 0,
          optionsMask: { executeIfOff: true },
          optionsOverride: { executeIfOff: true },
          ...request,
        });

        levelClient?.moveToLevel({
          level: clamp(intensity * 1.2, 0, 254),
          transitionTime: 0,
          optionsMask: { executeIfOff: true },
          optionsOverride: { executeIfOff: true },
          ...request,
        });
      },
    },
  };
}
