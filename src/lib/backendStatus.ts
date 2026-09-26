// ponytail: alamat backend adalah satu keputusan tunggal — provider Convex (klien
// yang benar-benar dipakai) dan halaman /status membaca helper murni yang sama,
// sehingga yang ditampilkan UI tidak pernah menyimpang dari yang dipakai runtime.
// Jalur upgrade: kalau nanti ada backend kedua (self-host + tunnel), tambah cabang
// di resolveConvexUrl — bukan perbandingan URL yang tersebar di komponen.

export type UrlSource =
  | "env"
  | "origin"
  | "fallback"
  | "derived-cloud"
  | "local-site"
  | "origin-proxy";

export type ResolvedUrl = { url: string; source: UrlSource };

export type BackendView = {
  origin: string | null;
  client: ResolvedUrl;
  site: ResolvedUrl;
  envClientUrl: string | null;
  envSiteUrl: string | null;
  /** Env terisi tetapi bukan URL absolut (dibedakan dari "belum diisi"). */
  envClientInvalid: boolean;
  envSiteInvalid: boolean;
  clientFromEnv: boolean;
  siteFromEnv: boolean;
};

/** "" dan spasi dianggap "tidak diisi" — env kosong dari platform bukan alamat. */
const nonEmpty = (value?: string): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

export const isLocalAddr = (url: string) => /localhost|127\.0\.0\.1/.test(url);

/**
 * Env build hanya layak dipakai kalau benar-benar URL absolut http(s).
 * Fakta lapangan 2026-09-26: build deploy pernah menerima nilai env tersegel
 * platform (`{"v":"v2","c":…}` dalam base64) dan membakе-nya ke bundle;
 * tanpa guard ini `new ConvexReactClient(...)` melempar
 * "Provided address was not an absolute URL" dan aplikasi blank total.
 */
export const isAbsoluteHttpUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

/** Env terisi tetapi tidak layak → diperlakukan belum diisi, dan dicatat terpisah. */
const usableEnv = (value?: string): string | undefined => {
  const candidate = nonEmpty(value);
  return candidate && isAbsoluteHttpUrl(candidate) ? candidate : undefined;
};

export function resolveConvexUrl(input: { envUrl?: string; origin?: string }): ResolvedUrl {
  const envUrl = usableEnv(input.envUrl);
  const origin = nonEmpty(input.origin);
  if (!origin) return { url: envUrl ?? "http://127.0.0.1:3210", source: envUrl ? "env" : "fallback" };
  // URL cloud dari env menang, kecuali ia menunjuk loopback sementara browser
  // berada di origin publik: browser tidak bisa menjangkau 127.0.0.1 sandbox.
  if (envUrl && !(isLocalAddr(envUrl) && !isLocalAddr(origin))) {
    return { url: envUrl, source: "env" };
  }
  return { url: origin, source: "origin" };
}

export function resolveConvexSiteUrl(input: { envUrl?: string; client: ResolvedUrl }): ResolvedUrl {
  const envUrl = usableEnv(input.envUrl);
  if (envUrl) return { url: envUrl, source: "env" };
  const { url, source } = input.client;
  // Deployment cloud selalu punya pasangan site: <name>.convex.cloud → <name>.convex.site
  if (url.endsWith(".convex.cloud")) {
    return { url: url.replace(/\.convex\.cloud$/, ".convex.site"), source: "derived-cloud" };
  }
  if (source === "fallback") return { url: "http://127.0.0.1:3211", source: "local-site" };
  // Origin dev/preview: HTTP action hanya terjangkau lewat jalur yang diproxy
  // (Vite memetakan /api/google ke site port 3211; Convex Auth memakai /api/auth).
  return { url, source: "origin-proxy" };
}

export function describeBackend(input: {
  envClientUrl?: string;
  envSiteUrl?: string;
  origin?: string;
}): BackendView {
  const envClientUrl = usableEnv(input.envClientUrl);
  const envSiteUrl = usableEnv(input.envSiteUrl);
  const origin = nonEmpty(input.origin) ?? null;
  const client = resolveConvexUrl({ envUrl: envClientUrl, origin: origin ?? undefined });
  const site = resolveConvexSiteUrl({ envUrl: envSiteUrl, client });
  return {
    origin,
    client,
    site,
    // Dibake saat build: bila kosong di deployment statis, tidak ada backend yang
    // bisa dihubungi — halaman status menyebut nama env-nya secara eksplisit.
    envClientUrl: envClientUrl ?? null,
    envSiteUrl: envSiteUrl ?? null,
    envClientInvalid: nonEmpty(input.envClientUrl) !== undefined && envClientUrl === undefined,
    envSiteInvalid: nonEmpty(input.envSiteUrl) !== undefined && envSiteUrl === undefined,
    clientFromEnv: client.source === "env",
    siteFromEnv: site.source === "env",
  };
}
