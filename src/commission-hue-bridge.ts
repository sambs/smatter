import { initController } from "./controller/controller.ts";

// Pairing code is presented in the Hue app
const pairingCode = process.argv[2];

if (!pairingCode) {
  console.error("Missing argument <pairing_code>");
  process.exit(1);
}

const controller = await initController();

await controller.commissionHueBridge(pairingCode);
