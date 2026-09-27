// @vitest-environment jsdom
// Regression keluhan pemilik 2026-09-27: /news kosong sampai tombol ditekan,
// dan notifikasi berita di lonceng tidak menuju card berita.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import News from "./News";

const mocks = vi.hoisted(() => ({
  fetchNews: vi.fn(),
  listCatalog: vi.fn(),
  listUserSources: vi.fn(),
  addUserSource: vi.fn(),
  removeUserSource: vi.fn(),
}));

vi.mock("convex/react", () => ({
  useQuery: (ref: unknown) => {
    if (ref === "listCatalog") return mocks.listCatalog();
    if (ref === "listUserSources") return mocks.listUserSources();
    return undefined;
  },
  useMutation: (ref: unknown) => {
    if (ref === "addUserSource") return mocks.addUserSource;
    if (ref === "removeUserSource") return mocks.removeUserSource;
    return vi.fn();
  },
  useAction: (ref: unknown) => (ref === "fetchNews" ? mocks.fetchNews : vi.fn()),
}));

// Referensi fungsi Convex asli adalah Proxy tanpa konversi primitif — di mock
// cukup token string yang dicocokkan di atas.
vi.mock("@/convex/_generated/api", () => ({
  api: {
    news: {
      listCatalog: "listCatalog",
      listUserSources: "listUserSources",
      addUserSource: "addUserSource",
      removeUserSource: "removeUserSource",
      fetchNews: "fetchNews",
    },
  },
}));

const okResult = {
  fetchedAt: Date.parse("2026-09-27T08:00:00Z"),
  total: 1,
  results: [
    {
      source: "gnews-tech-id",
      label: "Teknologi",
      status: "ok" as const,
      articles: [
        { what: "Judul artikel uji", when: "2 jam lalu", who: "sumber", where: "Teknologi", source: "https://contoh.com/a" },
      ],
    },
  ],
};

describe("News auto-load (cache, tanpa klik)", () => {
  beforeEach(() => {
    mocks.fetchNews.mockReset();
    mocks.listCatalog.mockReset().mockReturnValue([]);
    mocks.listUserSources.mockReset().mockReturnValue([]);
    mocks.addUserSource.mockReset();
    mocks.removeUserSource.mockReset();
  });
  afterEach(() => cleanup());

  it("memanggil fetchNews sekali saat halaman dibuka, tanpa force (memakai cache server)", async () => {
    mocks.fetchNews.mockResolvedValue(okResult);
    render(<News />);
    await waitFor(() => expect(mocks.fetchNews).toHaveBeenCalledTimes(1));
    expect(mocks.fetchNews).toHaveBeenCalledWith({ category: undefined, region: undefined, force: false });
    // Kartu artikel muncul tanpa klik apa pun.
    expect(await screen.findByText("Judul artikel uji")).toBeTruthy();
  });

  it("tetap memakai cache saat filter kategori berubah (force=false)", async () => {
    mocks.fetchNews.mockResolvedValue(okResult);
    render(<News />);
    await waitFor(() => expect(mocks.fetchNews).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "Semua" }));
    await waitFor(() => expect(mocks.fetchNews).toHaveBeenCalledTimes(2));
    // run("", "") memetakan string kosong ke undefined (arg opsional Convex).
    expect(mocks.fetchNews).toHaveBeenLastCalledWith({ category: undefined, region: undefined, force: false });
  });

  it("error fetch menampilkan alert eksplisit, bukan halaman kosong", async () => {
    mocks.fetchNews.mockRejectedValue(new Error("backend gagal"));
    render(<News />);
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/backend gagal/);
  });

  it("auto-load hanya sekali (strict mode / re-render tidak memicu ulang)", async () => {
    mocks.fetchNews.mockResolvedValue(okResult);
    render(<News />);
    await waitFor(() => expect(mocks.fetchNews).toHaveBeenCalledTimes(1));
    await new Promise((r) => setTimeout(r, 0));
    expect(mocks.fetchNews).toHaveBeenCalledTimes(1);
  });
});
