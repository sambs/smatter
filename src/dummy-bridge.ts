import { Endpoint, ServerNode, VendorId } from "@matter/main";
import { AggregatorEndpoint } from "@matter/main/endpoints/aggregator";

const vendorName = "sambs";
const vendorId = 0xfff1;

const bridgeId = "dummy-bridge";
const bridgeName = "Dummy Bridge";

export async function createDummyBridge() {
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

  const aggregator = new Endpoint(AggregatorEndpoint, { id: "aggregator" });

  await server.add(aggregator);

  return { server, aggregator };
}
