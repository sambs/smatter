import { Diagnostic, Logger, NodeId } from "@matter/main";
import { CommissioningController } from "@project-chip/matter.js";
import { Endpoint, NodeStates } from "@project-chip/matter.js/device";
import { ManualPairingCodeCodec } from "@matter/main/types";
import {
  BridgedDeviceBasicInformation,
  GeneralCommissioning,
} from "@matter/main/clusters";
import { getLight } from "./light.ts";
import { getMotionSensor } from "./motion-sensor.ts";
import { getDimmerSwitch } from "./dimmer-switch.ts";

const logger = Logger.get("HueBridge");

export async function getHueBridge(
  controller: CommissioningController,
  nodeId: NodeId,
  logAll = false,
) {
  const node = await controller.getNode(nodeId);
  const [aggregator] = node.parts.values();

  if (!aggregator) {
    throw new Error("Failed to find aggregator endpoint");
  }
  if (aggregator.name !== "MA-aggregator") {
    throw new Error(
      `Expected endpoint to have name "MA-aggregator" found ${aggregator.name}`,
    );
  }

  if (logAll) {
    // Subscribe to all bridge attribute changes
    node.events.attributeChanged.on(
      ({ path: { clusterId, endpointId, attributeName }, value }) =>
        logger.info(
          `Attribute ${endpointId}/${clusterId}/${attributeName} changed to ${Diagnostic.json(
            value,
          )}`,
        ),
    );

    // Subscribe to all bridge events (eg button presses)
    node.events.eventTriggered.on(
      ({ path: { clusterId, endpointId, eventName }, events }) =>
        logger.info(
          `Event ${endpointId}/${clusterId}/${eventName} triggered with ${Diagnostic.json(
            events,
          )}`,
        ),
    );
  }

  node.events.stateChanged.on((info) => {
    switch (info) {
      case NodeStates.Connected:
        logger.info(`Node is connected`);
        break;
      case NodeStates.Disconnected:
        logger.info(`Node is disconnected`);
        break;
      case NodeStates.Reconnecting:
        logger.info(`Node is reconnecting`);
        break;
      case NodeStates.WaitingForDeviceDiscovery:
        logger.info(`Node is waitingForDeviceDiscovery`);
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

  const endpointNames = Object.keys(namedEndpoints);

  logger.info(
    `Found ${endpointNames.length} named endpoints: ${endpointNames.join(", ")}`,
  );

  return {
    getDimmerSwitch: (name: string) => {
      return getDimmerSwitch(logger, name, namedEndpoints[name]);
    },
    getLight: (name: string) => {
      return getLight(logger, name, namedEndpoints[name]);
    },
    getMotionSensor: (name: string) => {
      return getMotionSensor(logger, name, namedEndpoints[name]);
    },
  };
}

export async function commissionHueBridge(
  controller: CommissioningController,
  pairingCode: string,
  longDiscriminator?: string, // I don't think this is needed
) {
  const pairingCodeCodec = ManualPairingCodeCodec.decode(pairingCode);
  const identifierData = longDiscriminator
    ? { longDiscriminator }
    : { shortDiscriminator: pairingCodeCodec.shortDiscriminator };

  logger.info(`Commissioning...`);

  const nodeId = await controller.commissionNode({
    commissioning: {
      regulatoryLocation:
        GeneralCommissioning.RegulatoryLocationType.IndoorOutdoor,
      regulatoryCountryCode: "XX",
    },
    passcode: pairingCodeCodec.passcode,
    discovery: {
      identifierData,
      // knownAddress: { ip: "192.168.0.111", port: 80, type: "udp" },
      // discoveryCapabilities: {
      //   ble,
      // },
    },
  });

  logger.info(`Successfully commissioned. Node ID: ${nodeId}`);

  return nodeId;
}
