// @vitest-environment jsdom
// Regression F4: proposal dari produk klien tampil berlabel "via <slug>" di
// preview Daily Focus — pemilik tahu sumber proposal sebelum memutuskan.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import DailyFocus from "./DailyFocus";

const mocks = vi.hoisted(() => ({
  listAccounts: vi.fn(),
  listActions: vi.fn(),
  decide: vi.fn(),
  todayChecklist: vi.fn(),
}));

vi.mock("convex/react", () => ({
  useQuery: (ref: unknown) => {
    if (ref === "listAccounts") return mocks.listAccounts();
    if (ref === "listActions") return mocks.listActions();
    return undefined;
  },
  useMutation: () => mocks.decide,
  useAction: () => mocks.todayChecklist,
}));

// Referensi fungsi Convex asli adalah Proxy tanpa konversi primitif — di mock
// cukup token string yang dicocokkan di atas.
vi.mock("@/convex/_generated/api", () => ({
  api: {
    googleAccounts: { listAccounts: "listAccounts" },
    googleActions: { listActions: "listActions", decide: "decide" },
    googleTasks: { todayChecklist: "todayChecklist" },
  },
}));

const accounts = [
  { _id: "acc1", email: "pemilik@example.com", status: "active", scopes: [], lastSyncedAt: null },
];

describe("DailyFocus: proposal produk berlabel sumber", () => {
  beforeEach(() => {
    mocks.listAccounts.mockReset().mockReturnValue(accounts);
    mocks.listActions.mockReset();
    mocks.decide.mockReset();
    mocks.todayChecklist.mockReset();
  });
  afterEach(() => cleanup());

  it("proposal dengan sourceProductId menampilkan label 'via <slug>'", () => {
    mocks.listActions.mockReturnValue([
      {
        _id: "act1",
        kind: "task.create",
        status: "ready",
        payload: JSON.stringify({ kind: "task.create", title: "Sinkron abelink" }),
        expiresAt: Date.now() + 60_000,
        sourceProductId: "abelink",
      },
    ]);
    render(<DailyFocus />);
    expect(screen.getByText(/via abelink/)).toBeTruthy();
  });

  it("proposal dari UI (tanpa sourceProductId) tidak menampilkan label via", () => {
    mocks.listActions.mockReturnValue([
      {
        _id: "act2",
        kind: "calendar.create",
        status: "ready",
        payload: JSON.stringify({
          kind: "calendar.create",
          calendarId: "primary",
          summary: "dari UI",
          start: "2026-09-28T09:00:00+07:00",
          end: "2026-09-28T10:00:00+07:00",
        }),
        expiresAt: Date.now() + 60_000,
      },
    ]);
    render(<DailyFocus />);
    expect(screen.queryByText(/via /)).toBeNull();
  });
});
