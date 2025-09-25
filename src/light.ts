import { Diagnostic, type Logger } from "@matter/main";
import type { Endpoint } from "@project-chip/matter.js/device";
import { ColorControl, LevelControl, OnOff } from "@matter/main/clusters";
import { clamp } from "./utils.ts";

const INTESITY_COLOR_TEMPERATURE_OFFSET = 500;

export function getLight(logger: Logger, name: string, endpoint?: Endpoint) {
  if (!endpoint) {
    logger.warn(`Light "${name}" not found"`);
  }

  const onOff = endpoint?.getClusterClient(OnOff.Complete);
  const color = endpoint?.getClusterClient(ColorControl.Complete);
  const level = endpoint?.getClusterClient(LevelControl.Complete);

  if (endpoint && !onOff) {
    logger.warn(
      `Light "${name}" is missing the onOff behviour and may not be a light`,
    );
  }

  color
    ?.getOptionsAttribute()
    .then((options) =>
      logger.info(`${name} color options: ${Diagnostic.json(options)}`),
    );

  return {
    onOff: {
      get value() {
        return onOff?.attributes.onOff.getLocal();
      },
      toggle: async () => {
        await onOff?.toggle();
      },
      on: async () => {
        await onOff?.on();
      },
      off: async () => {
        await onOff?.off();
      },
    },
    level: {
      get value() {
        return color?.attributes.colorTemperatureMireds.getLocal();
      },
      set: async (value: number, transitionTime: null | number = null) => {
        await level?.moveToLevel({
          level: value,
          transitionTime,
          optionsMask: { coupleColorTempToLevel: true }, // Specify that we want executeIfOff to be respected
          optionsOverride: { coupleColorTempToLevel: true },
        });
      },
    },
    temperature: {
      get value() {
        return color?.attributes.colorTemperatureMireds.getLocal();
      },
      set: async (
        temperature: number,
        transitionTime: number = 0, // in tenths of a second
        executeIfOff = true,
      ) => {
        await color?.moveToColorTemperature({
          colorTemperatureMireds: temperature,
          transitionTime,
          optionsMask: { executeIfOff: true }, // Specify that we want executeIfOff to be respected
          optionsOverride: { executeIfOff },
        });
      },
    },
    intensity: {
      get value() {
        const colorTemperature =
          color?.attributes.colorTemperatureMireds.getLocal();
        return colorTemperature === undefined
          ? undefined
          : colorTemperature + INTESITY_COLOR_TEMPERATURE_OFFSET;
      },
      set: async (
        value: number,
        transitionTime: number = 0, // in tenths of a second
      ) => {
        color?.moveToColorTemperature({
          colorTemperatureMireds: INTESITY_COLOR_TEMPERATURE_OFFSET - value,
          transitionTime,
          optionsMask: {},
          optionsOverride: {},
        });
        level?.moveToLevel({
          level: clamp(value * 1.2, 0, 254),
          transitionTime,
          optionsMask: {},
          optionsOverride: {},
        });
      },
    },
  };
}
