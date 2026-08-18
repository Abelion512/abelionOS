import { describe, expect, it, vi } from "vitest";
import { ReasonerProviderLimitedError } from "./reasonerResponsePolicy.mjs";
import { retryForProviderRotation } from "./reasonerRetryPolicy.mjs";

describe("Bun companion reasoner retry policy", () => {
  it("retries provider rotation failures and returns the first valid response", async () => {
    const run = vi.fn().mockRejectedValueOnce(new ReasonerProviderLimitedError()).mockRejectedValueOnce(new ReasonerProviderLimitedError()).mockResolvedValueOnce("proposal");
    const sleep = vi.fn().mockResolvedValue(undefined);
    await expect(retryForProviderRotation(run, { maxAttempts: 10, delayMilliseconds: 1, sleep })).resolves.toBe("proposal");
    expect(run).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it("stops after ten provider-rotation attempts rather than polling indefinitely", async () => {
    const run = vi.fn().mockRejectedValue(new ReasonerProviderLimitedError());
    const sleep = vi.fn().mockResolvedValue(undefined);
    await expect(retryForProviderRotation(run, { maxAttempts: 99, delayMilliseconds: 1, sleep })).rejects.toBeInstanceOf(ReasonerProviderLimitedError);
    expect(run).toHaveBeenCalledTimes(10);
    expect(sleep).toHaveBeenCalledTimes(9);
  });

  it("does not retry malformed or unavailable responses", async () => {
    const run = vi.fn().mockRejectedValue(new Error("9router unavailable"));
    const sleep = vi.fn().mockResolvedValue(undefined);
    await expect(retryForProviderRotation(run, { maxAttempts: 10, sleep })).rejects.toThrow("9router unavailable");
    expect(run).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });
});
