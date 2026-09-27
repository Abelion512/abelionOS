// @vitest-environment jsdom
// Regression keluhan pemilik 2026-09-27: item notifikasi berita di lonceng
// harus bisa menuju halaman News, bukan hanya link-out ke sumber asli.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import AppShell from "./AppShell";

const mocks = vi.hoisted(() => ({ navigate: vi.fn() }));

let notifications: any[] = [];

vi.mock("@/lib/api", () => ({
  useQuery: () => notifications,
  useMutation: () => vi.fn(),
  useAuthActions: () => ({ signOut: vi.fn() }),
}));
vi.mock("wouter", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
  useLocation: () => ["/dashboard", mocks.navigate],
}));

function bellButton() {
  return screen.getByRole("button", { name: "Notifikasi" });
}

describe("AppShell notification center", () => {
  beforeEach(() => {
    mocks.navigate.mockReset();
    notifications = [];
  });
  afterEach(() => cleanup());

  it("notifikasi kategori news menyediakan tautan internal Lihat di News", () => {
    notifications = [
      {
        _id: "n1",
        category: "news",
        title: "Judul berita uji",
        body: "Teknologi · sumber",
        url: "https://contoh.com/artikel",
      },
    ];
    render(
      <AppShell title="Dashboard">
        <p>konten</p>
      </AppShell>
    );
    // Buka panel lonceng lalu cek tautan internal.
    fireEvent.click(bellButton());
    expect(screen.getByRole("link", { name: /Lihat di News/ }).getAttribute("href")).toBe("/news");
    // Link-out sumber asli tetap ada.
    expect(screen.getByRole("link", { name: /Baca di sumber asli/ }).getAttribute("href")).toBe(
      "https://contoh.com/artikel"
    );
  });

  it("notifikasi kategori lain tidak mendapat tautan News", () => {
    notifications = [{ _id: "n2", category: "companion", title: "Companion online" }];
    render(
      <AppShell title="Dashboard">
        <p>konten</p>
      </AppShell>
    );
    fireEvent.click(bellButton());
    expect(screen.queryByRole("link", { name: /Lihat di News/ })).toBeNull();
  });
});
