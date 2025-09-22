import { Logger } from "@matter/main";
import { createDummyBridge } from "./dummy-bridge.ts";
import { createDummySwitch } from "./dummy-switch.ts";
import { createController } from "./controller.ts";

const logger = Logger.get("Smatter");

const { server, aggregator } = await createDummyBridge();
const { getLight } = await createController();

const bedsideLight = getLight("Bedside Light");

const bedtimeSwitch = await createDummySwitch(
  aggregator,
  "bedtime-switch",
  "Bedtime",
);

bedtimeSwitch.events.change.on((value) => {
  logger.info(value ? "Entering bedtime mode" : "Exiting bedtime mode");
  if (value) bedsideLight.setTemperature(400);
});

setInterval(() => bedsideLight.setTemperature(200), 5000);

await server.start();
