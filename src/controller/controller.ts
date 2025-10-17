import {
  Diagnostic,
  Environment,
  Logger,
  NodeId,
  StorageService,
} from "@matter/main";
import { CommissioningController } from "@project-chip/matter.js";
import { commissionHueBridge, getHueBridge } from "./hue/bridge.ts";

const environment = Environment.default;
const storageService = environment.get(StorageService);
const _logger = Logger.get("SmatterController");

const ID = "smatter-controller";

const StorageKeys = {
  HueBridgeNodeId: "hueBridgeNodeId",
};

export async function initController() {
  const controllerStorage = (await storageService.open(ID)).createContext(
    "data",
  );

  const controller = new CommissioningController({
    adminFabricLabel: ID,
    environment: {
      environment,
      id: ID,
    },
    // These are the defaults:
    autoConnect: true,
    autoSubscribe: true, // false doesn't seem to make any difference
    subscribeMinIntervalFloorSeconds: 1,
  });

  await controller.start();

  return {
    controller,
    async commissionHueBridge(pairingCode: string, longDiscriminator?: string) {
      const nodeId = await commissionHueBridge(
        controller,
        pairingCode,
        longDiscriminator,
      );

      await controllerStorage.set(StorageKeys.HueBridgeNodeId, nodeId);
    },
    async getHueBridge(logAll?: boolean) {
      if (await controllerStorage.has(StorageKeys.HueBridgeNodeId)) {
        const nodeId = await controllerStorage.get<NodeId>(
          StorageKeys.HueBridgeNodeId,
        );
        return await getHueBridge(controller, nodeId, logAll);
      } else {
        throw new Error("Hue Bridge has not been commissioned");
      }
    },
  };
}
