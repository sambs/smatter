import { Environment, Logger } from "@matter/main";
import { CommissioningController } from "@project-chip/matter.js";
import { Endpoint, NodeStates } from "@project-chip/matter.js/device";
import { ManualPairingCodeCodec } from "@matter/main/types";
import {
  BridgedDeviceBasicInformation,
  GeneralCommissioning,
} from "@matter/main/clusters";
import { getLight } from "./light.ts";

const environment = Environment.default;
const logger = Logger.get("Controller");

const id = "smatter-controller";

function createCommissioningController() {
  return new CommissioningController({
    environment: {
      environment,
      id,
    },
    autoConnect: true, // Auto connect to the commissioned nodes
    adminFabricLabel: id,
  });
}
export async function createController() {
  const controller = createCommissioningController();

  await controller.start();

  if (!controller.isCommissioned()) {
    throw new Error("Controller is not commissioned!");
  }

  const nodeIds = controller.getCommissionedNodes();

  if (nodeIds.length !== 1) {
    throw new Error("Expected exactly 1 commissioned node");
  }

  logger.info(`Node ID: ${nodeIds[0]}`);

  const node = await controller.getNode(nodeIds[0]!);
  const [aggregator] = node.parts.values();

  if (!aggregator) {
    throw new Error("Failed to find aggregator endpoint");
  }
  if (aggregator.name !== "MA-aggregator") {
    throw new Error(
      `Expected endpoint to have name "MA-aggregator" found ${aggregator.name}`,
    );
  }

  // Subscribe to all bridge attribute changes
  // node.events.attributeChanged.on(
  //   ({ path: { nodeId, clusterId, endpointId, attributeName }, value }) =>
  //     console.log(
  //       `attributeChangedCallback ${nodeId}: Attribute ${endpointId}/${clusterId}/${attributeName} changed to ${Diagnostic.json(
  //         value,
  //       )}`,
  //     ),
  // );

  // Subscribe to all bridge events (eg button presses)
  // node.events.eventTriggered.on(
  //   ({ path: { nodeId, clusterId, endpointId, eventName }, events }) =>
  //     console.log(
  //       `eventTriggeredCallback ${nodeId}: Event ${endpointId}/${clusterId}/${eventName} triggered with ${Diagnostic.json(
  //         events,
  //       )}`,
  //     ),
  // );

  node.events.stateChanged.on((info) => {
    switch (info) {
      case NodeStates.Connected:
        logger.info(`Connected`, info);
        break;
      case NodeStates.Disconnected:
        logger.info(`Disconnected`, info);
        console.log(`state changed: Node ${node.nodeId} disconnected`);
        break;
      case NodeStates.Reconnecting:
        logger.info(`Reconnecting`, info);
        console.log(`state changed: Node ${node.nodeId} reconnecting`);
        break;
      case NodeStates.WaitingForDeviceDiscovery:
        logger.info(`WaitingForDeviceDiscovery, info`);
        break;
    }
  });

  node.events.structureChanged.on(() => {
    console.log(`Node ${node.nodeId} structure changed`);
  });

  const namedEndpoints: Record<string, Endpoint> = {};

  for (let endpoint of aggregator.parts.values()) {
    const name = await endpoint
      .getClusterClient(BridgedDeviceBasicInformation.Complete)
      ?.getNodeLabelAttribute();

    if (name) {
      namedEndpoints[name] = endpoint;
    }
  }

  logger.info(
    `Found ${namedEndpoints.length} named devices: ${Object.keys(namedEndpoints).join(", ")}`,
  );

  return {
    controller,
    aggregator,
    getLight: (name: string) => {
      return getLight(logger, name, namedEndpoints[name]);
    },
  };
}

export async function commissionHueBridge(pairingCode: string) {
  const controller = createCommissioningController();
  const pairingCodeCodec = ManualPairingCodeCodec.decode(pairingCode);
  const shortDiscriminator = pairingCodeCodec.shortDiscriminator;
  const passcode = pairingCodeCodec.passcode;

  logger.info(`Commissioning...`);

  await controller.start();

  await controller.commissionNode({
    commissioning: {
      regulatoryLocation:
        GeneralCommissioning.RegulatoryLocationType.IndoorOutdoor,
      regulatoryCountryCode: "XX",
    },
    passcode,
    discovery: {
      identifierData: { shortDiscriminator },
      // knownAddress:
      //   ip !== undefined && port !== undefined
      //     ? { ip, port, type: "udp" }
      //     : undefined,
      // discoveryCapabilities: {
      //   ble,
      // },
    },
  });

  logger.info("Successfully commissioned");
}
