import {
  distinctUntilChanged,
  filter,
  map,
  of,
  pipe,
  skip,
  switchMap,
  timer,
  withLatestFrom,
} from "rxjs";
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
const livingScene = await controls.createRadioButtons("living-scene", {
  full: "Full",
  me: "Me",
});

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
 * Operators
 */

const ifBedtime = pipe(
  withLatestFrom(isBedtime),
  filter(([, isBedtime]) => isBedtime),
  map(([x]) => x),
);
const ifNight = pipe(
  withLatestFrom(isNight),
  filter(([, isNight]) => isNight),
  map(([x]) => x),
);
const delayOff = (delay: number) =>
  pipe(
    switchMap((v) => (v ? of(true) : timer(delay * 1000).pipe(mapTo(false)))),
    distinctUntilChanged(),
  );
const mapTo = <T>(x: T) => map(() => x);
const ifTrue = filter((x) => !!x);
const ifFalse = filter((x) => !x);
const omitInitial = pipe(distinctUntilChanged(), skip(1));

/**
 * Log things
 */

solarEvents.subscribe((e) => {
  logger.info(`Solar event: ${e.name} at ${e.at.toString()}`);
});

isNight.subscribe((isNight) => {
  logger.info(isNight ? "It's night time" : "It's day time");
});

isBedtime.subscribe((value) => {
  logger.info(value ? "It's bedtime" : "It's not bedtime");
});

isBedtime.pipe(omitInitial).subscribe((value) => {
  logger.info(value ? "Bedtime has begun" : "Bedtime is over");
});

lightTemp.subscribe((value) => {
  logger.info(`Light temp: ${value}`);
});

livingScene.subscribe((value) => {
  logger.info(`Living scene: ${value}`);
});

landingMotionSensor.isOccupied.subscribe((isOccupied) => {
  logger.info(`Landing occupied: ${isOccupied}`);
});

landingPendant.isOn.subscribe((v) => {
  logger.info(`Landing Pendant isOn: ${v}`);
});

/**
 * Do things
 */

// Turn off bedtime mode when the sun rises
solarEvents.pipe(filter(isSunrise), mapTo(false)).subscribe(isBedtime);

// Adjust light temperature depending on whether it's bedtime
isBedtime.pipe(map((isBedtime) => (isBedtime ? 50 : 150))).subscribe(lightTemp);

deskSwitch.topButton.initialPress.subscribe(deskLight.on);
deskSwitch.bottomButton.initialPress.subscribe(deskLight.off);

lightTemp
  .pipe(map((level) => ({ intensity: level })))
  .subscribe(landingPendant.moveToIntensity);

landingMotionSensor.isOccupied
  .pipe(ifNight, delayOff(180))
  .subscribe(landingPendant.set);
