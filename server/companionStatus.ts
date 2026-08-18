import { markStaleCompanionDevicesOffline } from "./db";
import { publishUserNotification } from "./notifications";

type Dependencies = {
  markStale?: typeof markStaleCompanionDevicesOffline;
  publish?: typeof publishUserNotification;
};

export async function observeUserCompanionStatus(userId: number, dependencies: Dependencies = {}) {
  const markStale = dependencies.markStale ?? markStaleCompanionDevicesOffline;
  const publish = dependencies.publish ?? publishUserNotification;
  const newlyOffline = await markStale(userId);
  await Promise.all(newlyOffline.map(device => publish({
    userId,
    event: "companion.offline",
    resourceType: "companion_device",
    resourceId: device.deviceId,
  })));
  return { offlineDeviceIds: newlyOffline.map(device => device.deviceId) };
}
