import { Endpoint, ServerNode, VendorId } from "@matter/main";
import { BridgedDeviceBasicInformationServer } from "@matter/main/behaviors/bridged-device-basic-information";
import { AggregatorEndpoint } from "@matter/main/endpoints/aggregator";
import { MeasurementType } from "@matter/main/types";
import * as behaviours from "@matter/main/behaviors";
import * as devices from "@matter/main/devices";

const vendorName = "sambs";
const vendorId = 0xfff1;

const bridgeId = "dummy-bridge";
const bridgeName = "Dummy Bridge";

/**
 * Create a Matter ServerNode, which contains the Root Endpoint and all relevant data and configuration
 */
const server = await ServerNode.create({
  // Required: Give the Node a unique ID which is used to store the state of this node
  id: bridgeId,

  // Provide Network relevant configuration like the port
  // Optional when operating only one device on a host, Default port is 5540
  network: {
    port: 5540,
  },

  // Provide Commissioning relevant settings
  // Optional for development/testing purposes
  commissioning: {
    passcode: 20202025,
    discriminator: 3840,
  },

  // Provide Node announcement settings
  // Optional: If Ommitted some development defaults are used
  productDescription: {
    name: bridgeName,
    deviceType: AggregatorEndpoint.deviceType,
  },

  // Provide defaults for the BasicInformation cluster on the Root endpoint
  // Optional: If Omitted some development defaults are used
  basicInformation: {
    vendorName,
    vendorId: VendorId(vendorId),
    nodeLabel: `${bridgeName} Node Label`,
    productName: `${bridgeName} Product`,
    productLabel: `${bridgeName} Product Label`,
    productId: 0x8000,
    serialNumber: `${bridgeId}-serial`,
    uniqueId: bridgeId,
  },
});

/**
 * Matter Nodes are a composition of endpoints. Create and add a single multiple endpoint to the node to make it a
 * composed device. This example uses the OnOffLightDevice or OnOffPlugInUnitDevice depending on the value of the type
 * parameter. It also assigns each Endpoint a unique ID to store the endpoint number for it in the storage to restore
 * the device on restart.
 *
 * In this case we directly use the default command implementation from matter.js. Check out the DeviceNodeFull example
 * to see how to customize the command handlers.
 */

const aggregator = new Endpoint(AggregatorEndpoint, { id: "aggregator" });

await server.add(aggregator);

async function addDeviceEndpoint(
  aggregator: Endpoint<AggregatorEndpoint>,
  id: string,
  name: string,
) {
  const endpoint = new Endpoint(
    devices.GenericSwitchDevice.with(
      BridgedDeviceBasicInformationServer,
      behaviours.SwitchServer,
    ),
    {
      id,
      bridgedDeviceBasicInformation: {
        nodeLabel: name, // Main end user name for the device
        productName: `${name} Product`,
        productLabel: `${name} Product Label`,
        serialNumber: `${id}-serial`,
        reachable: true,
      },
    },
  );
  await aggregator.add(endpoint);

  /**
   * Register state change handlers and events of the endpoint for identify and onoff states to react to the commands.
   *
   * If the code in these change handlers fail then the change is also rolled back and not executed and an error is
   * reported back to the controller.
   */
  endpoint.events.identify.startIdentifying.on(() => {
    console.log(
      `Run identify logic for ${name}, ideally blink a light every 0.5s ...`,
    );
  });

  endpoint.events.identify.stopIdentifying.on(() => {
    console.log(`Stop identify logic for ${name} ...`);
  });

  endpoint.events.switch.stateChanged.on((value) => {
    console.log(`${name} is now ${value}`);
  });

  // endpoint.events.onOff.onOff$Changed.on((value) => {
  //   console.log(`${name} is now ${value ? "ON" : "OFF"}`);
  // });

  return endpoint;
}

const bedtimeSwitch = await addDeviceEndpoint(
  aggregator,
  "bedtime-switch",
  "Bedtime Switch",
);

/**
 * In order to start the node and announce it into the network we use the run method which resolves when the node goes
 * offline again because we do not need anything more here. See the Full example for other starting options.
 * The QR Code is printed automatically.
 */
await server.start();

// Temporarily remove device endpoint from bridge
// await bedtimeSwitch.close();

// Delete device endpoint from bridge
// await bedtimeSwitch.delete();
