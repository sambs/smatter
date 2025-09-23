import { Diagnostic, type Logger } from "@matter/main";
import type { Endpoint } from "@project-chip/matter.js/device";
import { ColorControl, OnOff } from "@matter/main/clusters";
import { temperature } from "@matter/main/model";

export function getLight(logger: Logger, name: string, endpoint?: Endpoint) {
  if (!endpoint) {
    logger.warn(`Light "${name}" not found"`);
  }

  const onOff = endpoint?.getClusterClient(OnOff.Complete);
  const color = endpoint?.getClusterClient(ColorControl.Complete);

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
    temperature: {
      get value() {
        return color?.attributes.colorTemperatureMireds.getLocal();
      },
      set: async (
        temperature: number,
        transitionTime = 10, // in tenths of a second
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
  };
}
