import { Logger } from "@matter/main";
import { createControlBridge } from "./control/bridge.ts";
import { createHueController } from "./hue/controller.ts";
import { map } from "rxjs";

const logger = Logger.get("Smatter");

const controls = await createControlBridge();
const hue = await createHueController();

const Temperature = {
  COOL: 300,
  NEUTRAL: 350,
  WARM: 400,
  SEEDY: 450,
} as const;

/**
 * Real Hue devices
 */
const bedsideLight = hue.getLight("Bedside Light");
const goldStandard = hue.getLight("Gold Standard");
const deskLight = hue.getLight("Desk Light");
const landingMotionSensor = hue.getMotionSensor("Landing Motion Sensor");

/**
 * Fake devices used as control inputs
 */
const isBedtime = await controls.createSwitch("bedtime-switch", "Bedtime");
const lightTemperatureOffset = await controls.createLight(
  "light-temp-offset",
  "Light Temperature",
);

// isBedtime.onChange((value) => {
//   logger.info(value ? "Entering bedtime mode" : "Exiting bedtime mode");
// });

isBedtime.onOff
  .pipe(
    map((isBedtime) => ({
      level: isBedtime ? 200 : 100,
      transitionTime: 5,
    })),
  )
  // .subscribe(lightTemperatureOffset.level);
  .subscribe(deskLight.level.commands.moveToLevel);

lightTemperatureOffset.level.subscribe((v) => console.log(`Subscriber: ${v}`));

// lightTemperatureOffset.level.subscribe(deskLight.level.observe);
// lightTemperatureOffset.level.subscribe((v) => console.log(`subscriber: ${v}`));

// lightTemperatureOffset.onChange((level) => {
//   logger.info("Light tempererature offset", level - 128);
//   goldStandard.intensity.set(level);
// });

// landingMotionSensor.occupancy.onChange((value) => {
//   if (value) {
//     logger.info(
//       "Detected motion",
//       isBedtime.value ? "during bedtime" : "outside of bedtime",
//     );
//     bedsideLight.temperature.set(
//       isBedtime.value ? Temperature.WARM : Temperature.NEUTRAL,
//     );
//   }
// });

await controls.server.start();
