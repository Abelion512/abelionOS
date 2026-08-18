export class ReasonerProviderLimitedError extends Error {
  constructor() {
    super("9router provider rejected the request because the configured account has no available quota");
    this.name = "ReasonerProviderLimitedError";
  }
}

export class ReasonerProtocolError extends Error {
  constructor(message) {
    super(message);
    this.name = "ReasonerProtocolError";
  }
}

function jsonObjects(raw) {
  const values = [];
  let cursor = 0;
  while (cursor < raw.length) {
    const start = raw.indexOf("{", cursor);
    if (start < 0) break;
    let depth = 0;
    let inString = false;
    let escaped = false;
    let end = -1;
    for (let index = start; index < raw.length; index += 1) {
      const character = raw[index];
      if (inString) {
        if (escaped) escaped = false;
        else if (character === "\\") escaped = true;
        else if (character === '"') inString = false;
        continue;
      }
      if (character === '"') inString = true;
      else if (character === "{") depth += 1;
      else if (character === "}" && --depth === 0) {
        end = index;
        break;
      }
    }
    if (end < 0) break;
    try {
      values.push(JSON.parse(raw.slice(start, end + 1)));
    } catch {
      // Ignore non-JSON braces and continue looking for an OpenAI-style payload.
    }
    cursor = end + 1;
  }
  return values;
}

function providerLimited(value) {
  return /prevent abuse|not been recharged|free resources|quota|topup|billing|rate limit/i.test(value);
}

export function extractReasonerCompletion(raw) {
  if (typeof raw !== "string" || !raw.trim() || raw.length > 100_000) {
    throw new ReasonerProtocolError("9router returned an empty or oversized response");
  }
  const payloads = jsonObjects(raw);
  if (!payloads.length) throw new ReasonerProtocolError("9router returned no JSON payload");

  const delta = [];
  for (const payload of payloads) {
    const errorMessage = payload?.error?.message;
    if (typeof errorMessage === "string" && providerLimited(errorMessage)) throw new ReasonerProviderLimitedError();
    const choice = payload?.choices?.[0];
    const content = choice?.message?.content;
    if (typeof content === "string") {
      if (providerLimited(content)) throw new ReasonerProviderLimitedError();
      return content;
    }
    if (typeof choice?.delta?.content === "string") delta.push(choice.delta.content);
  }
  const streamedContent = delta.join("");
  if (streamedContent) {
    if (providerLimited(streamedContent)) throw new ReasonerProviderLimitedError();
    return streamedContent;
  }
  throw new ReasonerProtocolError("9router response has no assistant completion");
}
