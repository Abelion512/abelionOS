import { describe, expect, it } from "vitest";
import {
  describeBackend,
  isAbsoluteHttpUrl,
  resolveConvexSiteUrl,
  resolveConvexUrl,
} from "./backendStatus";

/** Nilai tersegel platform yang pernah ter-bake ke bundle prod (2026-09-26) — bukan URL. */
const SEALED_ENV_VALUE = "eyJ2IjoidjIiLCJjIjoiY2lwaGVydGV4dCJ9";

describe("resolveConvexUrl", () => {
  it("memakai URL cloud dari env dan mengabaikan origin", () => {
    const resolved = resolveConvexUrl({
      envUrl: "https://mintdesk-prod-123.convex.cloud",
      origin: "https://abelionos.freebuff.app",
    });
    expect(resolved).toEqual({ url: "https://mintdesk-prod-123.convex.cloud", source: "env" });
  });

  it("jatuh ke origin browser saat env menunjuk loopback tapi browser publik", () => {
    const resolved = resolveConvexUrl({
      envUrl: "http://127.0.0.1:3210",
      origin: "https://8080-preview.e2b.app",
    });
    expect(resolved).toEqual({ url: "https://8080-preview.e2b.app", source: "origin" });
  });

  it("memakai env loopback saat browser juga lokal", () => {
    const resolved = resolveConvexUrl({ envUrl: "http://127.0.0.1:3210", origin: "http://localhost:8080" });
    expect(resolved).toEqual({ url: "http://127.0.0.1:3210", source: "env" });
  });

  it("mengabaikan env yang bukan URL absolut lalu memakai origin publik", () => {
    const resolved = resolveConvexUrl({
      envUrl: SEALED_ENV_VALUE,
      origin: "https://abelionos.freebuff.app",
    });
    expect(resolved).toEqual({ url: "https://abelionos.freebuff.app", source: "origin" });
  });

  it("punya fallback terakhir dan menganggap env kosong sebagai belum diisi", () => {
    expect(resolveConvexUrl({})).toEqual({ url: "http://127.0.0.1:3210", source: "fallback" });
    expect(resolveConvexUrl({ envUrl: "   ", origin: "https://abelionos.freebuff.app" })).toEqual({
      url: "https://abelionos.freebuff.app",
      source: "origin",
    });
  });
});

describe("isAbsoluteHttpUrl", () => {
  it("menerima hanya URL absolut http(s)", () => {
    expect(isAbsoluteHttpUrl("https://x.convex.cloud")).toBe(true);
    expect(isAbsoluteHttpUrl("http://127.0.0.1:3210")).toBe(true);
    expect(isAbsoluteHttpUrl(SEALED_ENV_VALUE)).toBe(false);
    expect(isAbsoluteHttpUrl("/relative")).toBe(false);
    expect(isAbsoluteHttpUrl("ftp://x")).toBe(false);
  });
});

describe("resolveConvexSiteUrl", () => {
  it("memprioritaskan env eksplisit", () => {
    const site = resolveConvexSiteUrl({
      envUrl: "https://mintdesk-prod-123.convex.site",
      client: { url: "https://mintdesk-prod-123.convex.cloud", source: "env" },
    });
    expect(site).toEqual({ url: "https://mintdesk-prod-123.convex.site", source: "env" });
  });

  it("menurunkan .convex.site dari client cloud", () => {
    const site = resolveConvexSiteUrl({
      client: { url: "https://mintdesk-prod-123.convex.cloud", source: "env" },
    });
    expect(site).toEqual({ url: "https://mintdesk-prod-123.convex.site", source: "derived-cloud" });
  });

  it("mengabaikan env site yang bukan URL absolut dan menurunkannya dari cloud", () => {
    const site = resolveConvexSiteUrl({
      envUrl: SEALED_ENV_VALUE,
      client: { url: "https://mintdesk-prod-123.convex.cloud", source: "env" },
    });
    expect(site).toEqual({ url: "https://mintdesk-prod-123.convex.site", source: "derived-cloud" });
  });

  it("memakai site port lokal untuk fallback dan origin untuk preview", () => {
    expect(
      resolveConvexSiteUrl({ client: { url: "http://127.0.0.1:3210", source: "fallback" } }),
    ).toEqual({ url: "http://127.0.0.1:3211", source: "local-site" });
    expect(
      resolveConvexSiteUrl({ client: { url: "https://8080-preview.e2b.app", source: "origin" } }),
    ).toEqual({ url: "https://8080-preview.e2b.app", source: "origin-proxy" });
  });
});

describe("describeBackend", () => {
  it("menandai env yang dibake saat build dan yang hanya diturunkan", () => {
    const view = describeBackend({ envClientUrl: "https://mintdesk-prod-123.convex.cloud" });
    expect(view.clientFromEnv).toBe(true);
    expect(view.siteFromEnv).toBe(false);
    expect(view.client.url).toBe("https://mintdesk-prod-123.convex.cloud");
    expect(view.site.url).toBe("https://mintdesk-prod-123.convex.site");
    expect(view.envSiteUrl).toBeNull();
  });

  it("melaporkan deployment tanpa env sebagai tidak punya backend sendiri", () => {
    const view = describeBackend({ origin: "https://abelionos.freebuff.app" });
    expect(view.clientFromEnv).toBe(false);
    expect(view.client).toEqual({ url: "https://abelionos.freebuff.app", source: "origin" });
    expect(view.origin).toBe("https://abelionos.freebuff.app");
  });

  it("melaporkan env yang di-bake tidak valid sebagai diabaikan, bukan tidak diisi", () => {
    const view = describeBackend({
      envClientUrl: SEALED_ENV_VALUE,
      origin: "https://abelionos.freebuff.app",
    });
    expect(view.envClientInvalid).toBe(true);
    expect(view.envSiteInvalid).toBe(false);
    expect(view.envClientUrl).toBeNull();
    expect(view.clientFromEnv).toBe(false);
    expect(view.client).toEqual({ url: "https://abelionos.freebuff.app", source: "origin" });
  });
});
