// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ invalidate: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(), loadError: null as Error | null, detail: { id: "draft-1", messageId: "message-1", threadId: "thread-1", to: ["agen.salva@gmail.com"], cc: [], bcc: [], subject: "Launch", body: "Draft body", bodyAvailable: true } }));

vi.mock("@/lib/trpc", () => ({ trpc: {
  useUtils: () => ({ gmailDrafts: { list: { invalidate: mocks.invalidate } } }),
  gmailDrafts: {
    list: { useQuery: () => ({ data: mocks.loadError ? undefined : [{ id: "draft-1", messageId: "message-1", threadId: "thread-1", to: ["agen.salva@gmail.com"], cc: [], bcc: [], subject: "Launch" }], isLoading: false, isFetching: false, error: mocks.loadError, refetch: vi.fn() }) },
    get: { useQuery: (input: { draftId: string }) => ({ data: input.draftId === "draft-1" ? mocks.detail : undefined }) },
    create: { useMutation: () => ({ isPending: false, mutateAsync: mocks.create }) },
    update: { useMutation: () => ({ isPending: false, mutateAsync: mocks.update }) },
    delete: { useMutation: () => ({ isPending: false, mutateAsync: mocks.remove }) },
  },
} }));

import GmailDrafts from "./GmailDrafts";

describe("Gmail Drafts support UI", () => {
  afterEach(() => { cleanup(); mocks.loadError = null; vi.restoreAllMocks(); vi.clearAllMocks(); });

  it("loads an existing draft into the editor and does not delete when confirmation is cancelled", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<GmailDrafts />);

    fireEvent.click(screen.getByLabelText("Edit Launch"));
    await waitFor(() => expect((screen.getByLabelText("To") as HTMLInputElement).value).toBe("agen.salva@gmail.com"));
    expect((screen.getByLabelText("Subject") as HTMLInputElement).value).toBe("Launch");

    await act(async () => { fireEvent.click(screen.getByLabelText("Delete Launch")); });
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it("requires and forwards confirmation for create, update, and delete", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<GmailDrafts />);
    fireEvent.change(screen.getByLabelText("To"), { target: { value: "new@example.com" } });
    fireEvent.change(screen.getByLabelText("Subject"), { target: { value: "New draft" } });
    fireEvent.click(screen.getByRole("button", { name: "Create draft" }));
    await waitFor(() => expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ to: ["new@example.com"], confirmed: true })));

    fireEvent.click(screen.getByLabelText("Edit Launch"));
    await waitFor(() => expect(screen.getByText("Replace draft")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Replace draft" }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ draftId: "draft-1", confirmed: true })));

    fireEvent.click(screen.getByLabelText("Delete Launch"));
    await waitFor(() => expect(mocks.remove).toHaveBeenCalledWith({ draftId: "draft-1", confirmed: true }));
  });

  it("renders provider load and mutation errors without claiming success", async () => {
    mocks.loadError = new Error("Gmail Draft permission is missing");
    const { unmount } = render(<GmailDrafts />);
    expect(screen.getByText("Gmail Draft permission is missing")).toBeTruthy();
    unmount();

    mocks.loadError = null;
    mocks.create.mockRejectedValueOnce(new Error("Gmail provider unavailable"));
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<GmailDrafts />);
    fireEvent.change(screen.getByLabelText("To"), { target: { value: "new@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Create draft" }));
    await waitFor(() => expect(screen.getByText("Gmail provider unavailable")).toBeTruthy());
  });
});
