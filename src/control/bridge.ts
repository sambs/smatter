import { Endpoint, ServerNode, VendorId } from "@matter/main";
import { AggregatorEndpoint } from "@matter/main/endpoints/aggregator";
import { Switch } from "./switch.ts";
import { Slider } from "./slider.ts";

const BRIDGE_ID = "control-bridge";
const BRIDGE_NAME = "Control Bridge";
const VENDOR_NAME = "sambs";
const VENDOR_ID = 0xfff1;

export async function createControlBridge() {
  /**
   * Create a Matter ServerNode, which contains the Root Endpoint and all relevant data and configuration
   */
  const server = await ServerNode.create({
    // Required: Give the Node a unique ID which is used to store the state of this node
    id: BRIDGE_ID,

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
      name: BRIDGE_NAME,
      deviceType: AggregatorEndpoint.deviceType,
    },

    // Provide defaults for the BasicInformation cluster on the Root endpoint
    // Optional: If Omitted some development defaults are used
    basicInformation: {
      vendorName: VENDOR_NAME,
      vendorId: VendorId(VENDOR_ID),
      nodeLabel: `${BRIDGE_NAME} Node Label`,
      productName: `${BRIDGE_NAME} Product`,
      productLabel: `${BRIDGE_NAME} Product Label`,
      productId: 0x8000,
      serialNumber: `${BRIDGE_ID}-serial`,
      uniqueId: BRIDGE_ID,
    },
  });

  const aggregator = new Endpoint(AggregatorEndpoint, { id: "aggregator" });

  await server.add(aggregator);

  return {
    server,
    async createSwitch(id: string, name: string): Promise<Switch> {
      const endpoint = Switch.createEndpoint(id, name);
      await aggregator.add(endpoint);
      return new Switch(endpoint);
    },
    async deleteSwitch(id: string, name: string): Promise<void> {
      const slider = await this.createSwitch(id, name);
      await slider.endpoint.delete();
    },
    async createSlider(id: string, name: string): Promise<Slider> {
      const endpoint = Slider.createEndpoint(id, name);
      await aggregator.add(endpoint);
      return new Slider(endpoint);
    },
    async deleteSlider(id: string, name: string): Promise<void> {
      const slider = await this.createSlider(id, name);
      await slider.endpoint.delete();
    },
  };
}
