// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import BackendStatusPage from "./BackendStatusPage";

const conn = vi.hoisted(() => ({
  isWebSocketConnected: false,
  hasEverConnected: false,
  connectionRetries: 0,
  connectionCount: 0,
  inflightMutations: 0,
  inflightActions: 0,
  hasInflightRequests: false,
  timeOfOldestInflightRequest: null as Date | null,
}));

vi.mock("convex/react", () => ({
  useConvexConnectionState: () => ({ ...conn }),
  useConvexAuth: () => ({ isAuthenticated: false, isLoading: false }),
}));

/** Env distub eksplisit di setiap test: sandbox memuat .env ke Vitest, jadi test
 *  tidak boleh bergantung pada nilai ambient agar hasilnya deterministik. */
function stubEnv(client: string, site = "") {
  vi.stubEnv("VITE_CONVEX_URL", client);
  vi.stubEnv("VITE_CONVEX_SITE_URL", site);
}

const rowOf = (label: string) => screen.getByText(label).parentElement!;

function resetConn() {
  conn.isWebSocketConnected = false;
  conn.hasEverConnected = false;
  conn.connectionRetries = 0;
  conn.connectionCount = 0;
}

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  resetConn();
});

describe("BackendStatusPage", () => {
  it("menampilkan client URL dari env build dan menurunkan site URL cloud", () => {
    stubEnv("https://mintdesk-prod-123.convex.cloud");
    render(<BackendStatusPage />);
    const client = rowOf("Client URL (query + socket)");
    expect(client.textContent).toContain("https://mintdesk-prod-123.convex.cloud");
    expect(client.textContent).toContain("dari VITE_CONVEX_URL");
    const site = rowOf("Site URL (HTTP action + OAuth callback)");
    expect(site.textContent).toContain("https://mintdesk-prod-123.convex.site");
    expect(site.textContent).toContain("turunan .convex.cloud");
    expect(screen.queryByText(/deployment statis artinya tidak ada backend/)).toBeNull();
  });

  it("menghormati VITE_CONVEX_SITE_URL bila diisi eksplisit", () => {
    stubEnv("https://mintdesk-prod-123.convex.cloud", "https://mintdesk-prod-123.convex.site");
    render(<BackendStatusPage />);
    expect(rowOf("Site URL (HTTP action + OAuth callback)").textContent).toContain(
      "dari VITE_CONVEX_SITE_URL"
    );
  });

  it("jatuh ke origin browser dan menyebut env yang belum diisi saat build statis", () => {
    stubEnv("", "");
    render(<BackendStatusPage />);
    expect(rowOf("Client URL (query + socket)").textContent).toContain(window.location.origin);
    expect(rowOf("Client URL (query + socket)").textContent).toContain("origin browser (proxy dev)");
    // HTTP action di origin dev hanya terjangkau lewat jalur /api yang diproxy.
    expect(rowOf("Site URL (HTTP action + OAuth callback)").textContent).toContain(
      "origin browser (jalur /api)"
    );
    expect(screen.getAllByText("tidak diisi").length).toBe(2);
    expect(screen.getByText(/deployment statis artinya tidak ada backend/)).toBeTruthy();
  });

  it("menandai env yang di-bake tidak valid sebagai diabaikan, bukan ambil alamatnya", () => {
    // Nilai tersegel platform yang pernah ter-bake ke bundle produksi.
    const sealed = "eyJ2IjoidjIiLCJjIjoiY2lwaGVydGV4dCJ9";
    stubEnv(sealed, sealed);
    render(<BackendStatusPage />);
    const client = rowOf("Client URL (query + socket)");
    expect(client.textContent).toContain(window.location.origin);
    expect(client.textContent).not.toContain("eyJ2IjoidjIi");
    expect(screen.getAllByText("bukan URL absolut — diabaikan").length).toBe(2);
    expect(screen.queryByText("tidak diisi")).toBeNull();
    expect(screen.getByText(/nilai tersegel platform/)).toBeTruthy();
  });

  it("mengikuti state WebSocket dan menghitung percobaan gagal", () => {
    stubEnv("https://mintdesk-prod-123.convex.cloud");
    conn.isWebSocketConnected = true;
    conn.hasEverConnected = true;
    conn.connectionCount = 2;
    render(<BackendStatusPage />);
    expect(screen.getByText("WebSocket tersambung")).toBeTruthy();
    expect(rowOf("Jumlah koneksi").textContent).toContain("2");
    cleanup();

    conn.isWebSocketConnected = false;
    conn.hasEverConnected = false;
    conn.connectionRetries = 3;
    render(<BackendStatusPage />);
    expect(screen.getByText(/Menunggu koneksi pertama/)).toBeTruthy();
    expect(rowOf("Percobaan gagal").textContent).toContain("3");
    expect(rowOf("Pernah tersambung").textContent).toContain("belum");
  });
});
