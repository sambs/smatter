import { Logger } from "@matter/main";
import { createDummyBridge } from "./dummy-bridge.ts";
import { createDummySwitch } from "./dummy-switch.ts";
import { createHueController } from "./hue-controller.ts";

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
const landingMotionSensor = getMotionSensor("Landing Motion Sensor");

const isBedtime = await createDummySwitch(
  aggregator,
  "bedtime-switch",
  "Bedtime",
);

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

isBedtime.onChange((value) => {
  logger.info(value ? "Entering bedtime mode" : "Exiting bedtime mode");
});

await server.start();
