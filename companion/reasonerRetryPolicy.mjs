import { ReasonerProviderLimitedError } from "./reasonerResponsePolicy.mjs";

const defaultSleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export async function retryForProviderRotation(run, { maxAttempts = 10, delayMilliseconds = 3_000, sleep = defaultSleep } = {}) {
  const attempts = Math.min(10, Math.max(1, Number.isInteger(maxAttempts) ? maxAttempts : 10));
  const delay = Math.max(0, Math.min(15_000, Number.isFinite(delayMilliseconds) ? delayMilliseconds : 3_000));
  let finalError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await run(attempt);
    } catch (error) {
      if (!(error instanceof ReasonerProviderLimitedError)) throw error;
      finalError = error;
      if (attempt < attempts) await sleep(delay);
    }
  }

  throw finalError ?? new ReasonerProviderLimitedError();
}
