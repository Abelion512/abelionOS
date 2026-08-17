import { describe, expect, it, vi } from "vitest";
import { runFileUploadWorkflow } from "./fileUploadWorkflow";

const file = new File(["proof"], "proof.txt", { type: "text/plain" });
const prepared = { key: "9-files/proof.txt", objectUrl: "/manus-storage/9-files/proof.txt", uploadUrl: "https://storage.example/upload" };

describe("direct S3 upload transaction", () => {
  it("stops before metadata completion when object transfer fails", async () => {
    const prepare = vi.fn().mockResolvedValue(prepared);
    const transfer = vi.fn().mockRejectedValue(new Error("Object storage rejected upload (500)"));
    const complete = vi.fn();

    await expect(runFileUploadWorkflow({ file, prepare, transfer, complete, onPreparing: vi.fn(), onUploading: vi.fn(), onFinalizing: vi.fn() })).rejects.toThrow("Object storage rejected upload");
    expect(complete).not.toHaveBeenCalled();
  });

  it("surfaces a metadata completion failure after a successful object transfer", async () => {
    const prepare = vi.fn().mockResolvedValue(prepared);
    const transfer = vi.fn().mockResolvedValue(undefined);
    const complete = vi.fn().mockRejectedValue(new Error("Database unavailable"));
    const onFinalizing = vi.fn();

    await expect(runFileUploadWorkflow({ file, prepare, transfer, complete, onPreparing: vi.fn(), onUploading: vi.fn(), onFinalizing })).rejects.toThrow("Database unavailable");
    expect(onFinalizing).toHaveBeenCalledTimes(1);
    expect(complete).toHaveBeenCalledWith(prepared);
  });
});
