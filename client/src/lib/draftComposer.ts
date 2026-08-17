export function parseRecipientList(value: string) {
  return value.split(",").map((entry) => entry.trim()).filter(Boolean);
}

export function joinRecipientList(value: string[]) {
  return value.join(", ");
}
