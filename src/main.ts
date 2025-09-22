import { Logger } from "@matter/main";
import { createDummyBridge } from "./dummy-bridge.ts";
import { createDummySwitch } from "./dummy-switch.ts";

const logger = Logger.get("Smatter");

const { server, aggregator } = await createDummyBridge();

const bedtimeSwitch = await createDummySwitch(
  aggregator,
  "bedtime-switch",
  "Bedtime",
);

bedtimeSwitch.events.change.on((value) => {
  logger.info(value ? "Entering bedtime mode" : "Exiting bedtime mode");
});

await server.start();
