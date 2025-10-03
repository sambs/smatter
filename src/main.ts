import { Logger } from "@matter/main";
import { createControlBridge } from "./control/bridge.ts";
import { createHueController } from "./hue/controller.ts";
import { map, withLatestFrom } from "rxjs";

const logger = Logger.get("Smatter");

const controls = await createControlBridge();
const hue = await createHueController();

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
const lightTemp = await controls.createSlider(
  "light-temp-offset",
  "Light Temperature",
);

isBedtime.subscribe((value) => {
  logger.info(value ? "Entering bedtime mode" : "Exiting bedtime mode");
});

isBedtime
  .pipe(
    withLatestFrom(lightTemp),
    map(([isBedtime, lightTemp]) => ({
      level: isBedtime ? lightTemp / 2 : lightTemp,
      transitionTime: 5,
    })),
  )
  .subscribe(deskLight.moveToLevel);

lightTemp.subscribe((v) => console.log(`lightTemp: ${v}`));

lightTemp
  .pipe(map((level) => ({ intensity: level })))
  .subscribe(deskLight.moveToIntensity);

deskLight.isOn.subscribe((v) => console.log(`desk light on: ${v}`));

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
