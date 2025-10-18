import { filter, map, mapTo, withLatestFrom } from "rxjs";
import { Logger } from "@matter/main";
import { initControlBridge } from "./control/bridge.ts";
import { initController } from "./controller/controller.ts";
import { locationFromEnv } from "./external/location.ts";
import {
  createSolarEvents,
  isSunrise,
  isSunset,
} from "./external/solar-events.ts";

const location = locationFromEnv();

const logger = Logger.get("Smatter");

const controls = await initControlBridge();
const controller = await initController();
const hue = await controller.getHueBridge();

/**
 * Real Hue devices
 */

const bedsideLight = hue.getLight("Bedside Light");
const goldStandard = hue.getLight("Gold Standard");
const deskLight = hue.getLight("Desk Light");
const deskSwitch = hue.getDimmerSwitch("Desk Switch");
const landingPendant = hue.getLight("Landing Pendant");
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

const solarEventOffsets = {
  sunrise: { minutes: -10 },
  sunset: { minutes: -60 },
};
const solarEvents = createSolarEvents(location, {
  includeMostRecent: false,
  offsets: solarEventOffsets,
});
const isNight = createSolarEvents(location, {
  includeMostRecent: true,
  offsets: solarEventOffsets,
}).pipe(map(isSunset));

/**
 * Log things
 */

solarEvents.subscribe((e) => {
  logger.info(`Solar event: ${e.name} at ${e.at.toString()}`);
});
isBedtime.subscribe((value) => {
  logger.info(value ? "Entering bedtime mode" : "Exiting bedtime mode");
});
lightTemp.subscribe((v) => logger.info(`Light temp: ${v}`));
deskLight.isOn.subscribe((v) => logger.info(`Desk Light isOn: ${v}`));

/**
 * Do things
 */

// Turn off bedtime mode when the sun rises
solarEvents
  .pipe(
    filter(isSunrise),
    map(() => false),
  )
  .subscribe(isBedtime);

// Adjust light temperature depending on whether it's bedtime
isBedtime.pipe(map((isBedtime) => (isBedtime ? 70 : 150))).subscribe(lightTemp);

deskSwitch.topButton.initialPress.subscribe(deskLight.turnOn);
deskSwitch.bottomButton.initialPress.subscribe(deskLight.turnOff);

lightTemp
  .pipe(map((level) => ({ intensity: level })))
  .subscribe(deskLight.moveToIntensity);
