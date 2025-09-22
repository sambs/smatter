import { Endpoint } from "@project-chip/matter.js/device";
import { Descriptor } from "@matter/main/clusters/descriptor";
import { BasicInformation } from "@matter/main/clusters/basic-information";
import { BridgedDeviceBasicInformation, OnOff } from "@matter/main/clusters";

export async function inspectEndpoint(endpoint: Endpoint, level = 0) {
  console.log(
    `Inspecting endpoint "${endpoint.name}" { number: ${endpoint.number}, level: ${level} }`,
  );

  // console.log(
  //   "Descriptor",
  //   endpoint
  //     .getClusterClient(Descriptor.Complete)
  //     ?.getTagListAttributeFromCache(),
  // );

  // console.log(
  //   "BasicInformation.nodeLabel",
  //   endpoint
  //     .getClusterClient(BasicInformation.Complete)
  //     ?.getNodeLabelAttributeFromCache(),
  // );

  console.log(
    "BridgedDeviceBasicInformation.nodeLabel",
    endpoint
      .getClusterClient(BridgedDeviceBasicInformation.Complete)
      ?.getNodeLabelAttributeFromCache(),
  );

  console.log(
    "OnOff",
    await endpoint.getClusterClient(OnOff.Complete)?.getOnOffAttribute(),
  );

  // const label = endpoint.getClusterClient(UserLabel.Complete);
  // if (label !== undefined) {
  //   console.log(label.getAttributeListAttributeFromCache()); // Convenient that way from local cache
  // } else {
  //   console.log("No UserLabel Cluster found");
  // }

  for (let child of endpoint.parts.values()) {
    await inspectEndpoint(child, level + 1);
  }
}
