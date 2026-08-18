export function isValidLoopbackPairing(value) {
  return Boolean(
    value
      && typeof value.deviceId === "string"
      && typeof value.deviceSecret === "string"
      && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.deviceId)
      && /^[A-Za-z0-9_-]{32,256}$/.test(value.deviceSecret),
  );
}

export function applyLoopbackPairing(current, { deviceId, deviceSecret }) {
  const lines = current.replace(/\r\n/g, "\n").split("\n");
  let foundId = false;
  let foundSecret = false;
  const next = lines.map((line) => {
    if (line.startsWith("MINTDESK_DEVICE_ID=")) {
      foundId = true;
      return `MINTDESK_DEVICE_ID=${deviceId}`;
    }
    if (line.startsWith("MINTDESK_DEVICE_SECRET=")) {
      foundSecret = true;
      return `MINTDESK_DEVICE_SECRET=${deviceSecret}`;
    }
    return line;
  });
  if (!foundId) next.push(`MINTDESK_DEVICE_ID=${deviceId}`);
  if (!foundSecret) next.push(`MINTDESK_DEVICE_SECRET=${deviceSecret}`);
  return `${next.filter((line, index) => line || index < next.length - 1).join("\n")}\n`;
}
