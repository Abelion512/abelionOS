"use node";
// Pengirim push internal (Web Push / VAPID) — file node hanya berisi action.
// ponytail: web-push satu dependency menutup kebutuhan; tanpa FCM/APNs.
// Endpoint subscription adalah bearer-secret: tidak pernah masuk log/audit.
import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireUserId } from "./mintdeskHelpers";

function vapidConfig() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    throw new Error("VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY belum diisi di Settings → Environment");
  }
  return { publicKey, privateKey };
}

// web-push adalah paket CJS; interop bawaan bun/convex bundler tidak selalu
// menghasilkan objek dengan setVapidDetails di node runtime prod (bukti log
// 2026-09-26: `l.setVapidDetails is not a function`). Ambil modul sebagai
// record dan normalisasi ke bentuk CJS default secara eksplisit.
type WebPushModule = {
  setVapidDetails: (subject: string, publicKey: string, privateKey: string) => void;
  sendNotification: (
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
    payload: string,
    options?: { TTL?: number }
  ) => Promise<void>;
};

async function loadWebPush(): Promise<WebPushModule> {
  const mod: any = await import("web-push");
  const impl = mod?.default && typeof mod.default.setVapidDetails === "function" ? mod.default : mod;
  if (!impl || typeof impl.setVapidDetails !== "function") {
    throw new Error("web-push gagal dimuat dengan API yang diharapkan");
  }
  return impl as WebPushModule;
}

// Uji push end-to-end dari Settings: kirim notifikasi uji ke semua
// perangkat user + entri inbox sebagai fallback tanpa langganan browser.
export const sendTestPush = action({
  args: {},
  // Anotasi return eksplisit memutus siklus inferensi tipe Convex.
  handler: async (ctx): Promise<{ sent: number; removed: number }> => {
    const userId = await requireUserId(ctx);
    const result = await ctx.runAction(internal.push.pushSendInternal, {
      userId,
      title: "Mintdesk push aktif",
      body: "Notifikasi uji berhasil dikirim ke perangkat ini.",
      url: "/settings",
      tag: "test",
      topic: "all",
    });
    await ctx.runMutation(internal.mintdeskInternals.auditFromAction, {
      userId,
      action: "push.test",
      status: result.sent > 0 ? "accepted" : "error",
      detail: "terkirim " + result.sent + " perangkat, " + result.removed + " langganan mati dibersihkan",
    });
    await ctx.runMutation(internal.mintdeskInternals.notifyFromAction, {
      userId,
      category: "googleWorkspace",
      title: "Push uji terkirim",
      body: result.sent + " perangkat menerima notifikasi uji.",
    });
    return result;
  },
});

export const pushSendInternal = internalAction({
  args: {
    userId: v.id("users"),
    title: v.string(),
    body: v.optional(v.string()),
    url: v.optional(v.string()),
    tag: v.optional(v.string()),
    topic: v.optional(v.string()),
  },
  handler: async (ctx, { userId, title, body, url, tag, topic }) => {
    const subs = await ctx.runQuery(internal.pushInternals.listSubscriptions, { userId });
    if (subs.length === 0) return { sent: 0, removed: 0 };
    const cfg = vapidConfig();
    const webpush = await loadWebPush();
    webpush.setVapidDetails("mailto:owner@mintdesk.local", cfg.publicKey, cfg.privateKey);
    const payload = JSON.stringify({
      title,
      body: body ?? "",
      url: url ?? "/dashboard",
      tag: tag ?? "mintdesk",
    });
    let sent = 0;
    let removed = 0;
    for (const s of subs) {
      // Filter topik: "all" menerima semuanya; selain itu topik harus cocok.
      const topicOk = !topic || s.topics.includes("all") || s.topics.includes(topic);
      if (!topicOk) continue;
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
          { TTL: 3600 }
        );
        sent++;
      } catch (e: any) {
        if (e?.statusCode === 404 || e?.statusCode === 410) {
          await ctx.runMutation(internal.pushInternals.deleteSubscriptionRow, { id: s._id });
          removed++;
        }
      }
    }
    return { sent, removed };
  },
});
