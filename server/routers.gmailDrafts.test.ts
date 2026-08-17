import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(),
}));

vi.mock("./gmailDrafts", () => ({
  listGmailDrafts: mocks.list,
  getGmailDraft: mocks.get,
  createGmailDraft: mocks.create,
  updateGmailDraft: mocks.update,
  deleteGmailDraft: mocks.remove,
}));

import { appRouter } from "./routers";

function caller() {
  return appRouter.createCaller({ user: { id: 41 } as any, req: {} as any, res: {} as any });
}

const content = { to: ["user@example.com"], cc: [], bcc: [], subject: "Draft", body: "Body", confirmed: true as const };

describe("Gmail Drafts tRPC contract", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("routes list, get, create, update, and delete to the authenticated user only", async () => {
    mocks.list.mockResolvedValue([]);
    mocks.get.mockResolvedValue({ id: "draft-1" });
    mocks.create.mockResolvedValue({ id: "draft-1" });
    mocks.update.mockResolvedValue({ id: "draft-1" });
    mocks.remove.mockResolvedValue({ id: "draft-1", deleted: true });
    const api = caller();

    await api.gmailDrafts.list({ limit: 2 });
    await api.gmailDrafts.get({ draftId: "draft-1" });
    await api.gmailDrafts.create(content);
    await api.gmailDrafts.update({ draftId: "draft-1", ...content });
    await api.gmailDrafts.delete({ draftId: "draft-1", confirmed: true });

    expect(mocks.list).toHaveBeenCalledWith(41, 2);
    expect(mocks.get).toHaveBeenCalledWith(41, "draft-1");
    expect(mocks.create).toHaveBeenCalledWith(41, expect.objectContaining({ to: ["user@example.com"], confirmed: true }));
    expect(mocks.update).toHaveBeenCalledWith(41, "draft-1", expect.objectContaining({ subject: "Draft", confirmed: true }));
    expect(mocks.remove).toHaveBeenCalledWith(41, "draft-1");
  });

  it("rejects mutations unless the caller provides explicit confirmation", async () => {
    await expect(caller().gmailDrafts.create({ ...content, confirmed: false as any })).rejects.toThrow();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("preserves a missing compose-scope error instead of substituting draft data", async () => {
    mocks.list.mockRejectedValueOnce(new Error("Google Workspace requires Gmail Draft permission. Reconnect Google Workspace to continue."));
    await expect(caller().gmailDrafts.list()).rejects.toThrow("Gmail Draft permission");
  });
});
