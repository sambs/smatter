import { map, withLatestFrom } from "rxjs";
import { Logger } from "@matter/main";
import { createControlBridge } from "./control/bridge.ts";
import { createHueController } from "./hue/controller.ts";
import { locationFromEnv } from "./location.ts";
import { createSolarEvents } from "./solar-events.ts";

const location = locationFromEnv();

const logger = Logger.get("Smatter");

const controls = await createControlBridge();
const hue = await createHueController();

/**
 * Real Hue devices
 */

const bedsideLight = hue.getLight("Bedside Light");
const goldStandard = hue.getLight("Gold Standard");
const deskLight = hue.getLight("Desk Light");
const deskSwitch = hue.getDimmerSwitch("Desk Switch");
const landingMotionSensor = hue.getMotionSensor("Landing Motion Sensor");

/**
 * Fake devices used as control inputs
 */

const isBedtime = await controls.createSwitch("bedtime-switch", "Bedtime");
const lightTemp = await controls.createSlider(
  "light-temp-offset",
  "Light Temperature",
);

/**
 * External inputs
 */

const solarEvents = createSolarEvents(location, {
  offsets: {
    sunrise: { minutes: -10 },
    sunset: { minutes: 5 },
  },
});

/**
 * Log things
 */

solarEvents.subscribe((e) => {
  logger.info(`SolarEvent: ${e.name} at ${e.at.toString()}`);
});
isBedtime.subscribe((value) => {
  logger.info(value ? "Entering bedtime mode" : "Exiting bedtime mode");
});
lightTemp.subscribe((v) => logger.info(`Light temp: ${v}`));
deskLight.isOn.subscribe((v) => logger.info(`Desk Light isOn: ${v}`));

/**
 * Do things
 */

isBedtime.pipe(map((isBedtime) => (isBedtime ? 70 : 200))).subscribe(lightTemp);

// deskSwitch.topButton.initialPress
//   .pipe(
//     withLatestFrom(isBedtime),
//     map(([_event, isBedtime]) => ({
//       level: isBedtime ? 75 : 200,
//       transitionTime: 5,
//     })),
//   )
//   .subscribe(deskLight.moveToLevelWithOnOff);

deskSwitch.topButton.initialPress.subscribe(deskLight.turnOn);
deskSwitch.bottomButton.initialPress.subscribe(deskLight.turnOff);

lightTemp
  .pipe(map((level) => ({ intensity: level })))
  .subscribe(deskLight.moveToIntensity);
