import { describe, expect, it } from "vitest";
import { completedUpload, finalizingUpload, getUploadError, preparingUpload, uploadFailure, uploadProgress } from "./fileUploadState";

describe("Files upload state transitions", () => {
  it("moves through preparing, byte progress, finalizing, and success", () => {
    expect(preparingUpload("proof.txt")).toMatchObject({ stage: "preparing", progress: 0 });
    expect(uploadProgress("proof.txt", 47.6)).toMatchObject({ stage: "uploading", progress: 48 });
    expect(finalizingUpload("proof.txt")).toMatchObject({ stage: "finalizing", progress: 100 });
    expect(completedUpload("proof.txt")).toMatchObject({ stage: "success", progress: 100 });
  });

  it("clamps progress and returns actionable upload errors", () => {
    expect(uploadProgress("proof.txt", 140).progress).toBe(100);
    expect(getUploadError(new Error("Network error while uploading to object storage"))).toMatch(/CORS storage/);
    expect(uploadFailure("proof.txt", "Upload rejected")).toMatchObject({ stage: "error", progress: 0, error: "Upload rejected" });
  });
});
