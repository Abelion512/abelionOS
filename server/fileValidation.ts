export const MAX_FILE_BYTES = 8_000_000;

export function validateUploadBytes(base64: string, sizeBytes: number): Buffer {
  if (!Number.isInteger(sizeBytes) || sizeBytes <= 0 || sizeBytes > MAX_FILE_BYTES) {
    throw new Error("File size is outside the permitted range");
  }
  const bytes = Buffer.from(base64, "base64");
  if (bytes.byteLength !== sizeBytes) {
    throw new Error("Uploaded size does not match declared size");
  }
  return bytes;
}
