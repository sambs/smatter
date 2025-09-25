import { Logger } from "@matter/main";
import { createDummyBridge } from "./dummy-bridge.ts";
import { createDummySwitch, deleteDummySwitch } from "./dummy-switch.ts";
import { createHueController } from "./hue-controller.ts";
import { createDummyLight } from "./dummy-light.ts";
import { clamp } from "./utils.ts";

const logger = Logger.get("Smatter");

const { server, aggregator } = await createDummyBridge();
const { getLight, getMotionSensor } = await createHueController();

const Temperature = {
  COOL: 300,
  NEUTRAL: 350,
  WARM: 400,
  SEEDY: 450,
} as const;

const bedsideLight = getLight("Bedside Light");
const goldStandard = getLight("Gold Standard");
const landingMotionSensor = getMotionSensor("Landing Motion Sensor");

const isBedtime = await createDummySwitch(
  aggregator,
  "bedtime-switch",
  "Bedtime",
);

isBedtime.onChange((value) => {
  logger.info(value ? "Entering bedtime mode" : "Exiting bedtime mode");
});

const lightTemperatureOffset = await createDummyLight(
  aggregator,
  "light-temperature-offset",
  "Light Temperature",
);

lightTemperatureOffset.onChange((level) => {
  logger.info("Light tempererature offset", level - 128);
  goldStandard.level.set(clamp(level * 1.2, 0, 254));
  goldStandard.temperature.set(500 - level);
});

landingMotionSensor.occupancy.onChange((value) => {
  if (value) {
    logger.info(
      "Detected motion",
      isBedtime.value ? "during bedtime" : "outside of bedtime",
    );
    bedsideLight.temperature.set(
      isBedtime.value ? Temperature.WARM : Temperature.NEUTRAL,
    );
  }
});

await server.start();
