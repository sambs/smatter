import { Endpoint } from "@matter/main";
import { DescriptorClient } from "@matter/main/behaviors/descriptor";
import { BasicInformationClient } from "@matter/main/behaviors/basic-information";
import { UserLabelClient } from "@matter/main/behaviors/user-label";
import { BridgedDeviceBasicInformationClient } from "@matter/main/behaviors/bridged-device-basic-information";

export function inspectEndpoint(endpoint: Endpoint) {
  console.log("Inspecting endpoint", endpoint.id);
  try {
    console.log(`Descriptor`, endpoint.stateOf(DescriptorClient));
  } catch (error) {
    console.error(error?.message ?? error);
  }
  try {
    console.log(
      `Basic Information`,
      endpoint.stateOf(BridgedDeviceBasicInformationClient),
    );
  } catch (error) {
    console.error(error?.message ?? error);
  }
  try {
    console.log(
      `Bridged Devjice Basic Information`,
      endpoint.stateOf(BasicInformationClient),
    );
  } catch (error) {
    console.error(error?.message ?? error);
  }
  try {
    console.log(`User Label`, endpoint.stateOf(UserLabelClient));
  } catch (error) {
    console.error(error?.message ?? error);
  }

  endpoint.parts.forEach((endpoint) => {
    inspectEndpoint(endpoint);
    return true;
  });
}
