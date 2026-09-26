// Hook push setup Mintdesk — izin diminta HANYA dari klik eksplisit pengguna
// (kontrak AGENTS.md), urutan: permission → registrasi SW → subscribe → save.
import { useCallback, useEffect, useState } from "react";
import { api } from "@/convex/_generated/api";
import { useQuery, useMutation } from "convex/react";

// ponytail: TS lib DOM menuntut ArrayBuffer konkret untuk applicationServerKey;
// salin ke buffer baru agar tipenya ArrayBuffer, bukan ArrayBufferLike.

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const output = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

export type PushState = "unsupported" | "idle" | "subscribed" | "busy" | "error";

export function usePushSetup() {
  const vapid = useQuery(api.pushSubscriptions.vapidPublicKey, {});
  const save = useMutation(api.pushSubscriptions.saveSubscription);
  const remove = useMutation(api.pushSubscriptions.deleteSubscription);
  const [state, setState] = useState<PushState>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setState("unsupported");
    } else if (Notification.permission === "granted" && navigator.serviceWorker.controller) {
      setState("subscribed");
    }
  }, []);

  const enable = useCallback(async () => {
    setError(null);
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setState("unsupported");
      return;
    }
    if (!vapid?.publicKey) {
      setError("VAPID keys belum diisi di Settings → Environment.");
      setState("error");
      return;
    }
    setState("busy");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("idle");
        setError("Izin notifikasi tidak diberikan. Inbox in-app tetap berfungsi.");
        return;
      }
      // Register service worker SETELAH izin (aturan behavior atas).
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid.publicKey),
      });
      const json = sub.toJSON();
      await save({
        endpoint: json.endpoint ?? "",
        p256dh: json.keys?.p256dh ?? "",
        auth: json.keys?.auth ?? "",
        topics: ["all"],
      });
      setState("subscribed");
    } catch (e: any) {
      setError(e?.message ?? "Gagal mengaktifkan push.");
      setState("error");
    }
  }, [vapid, save]);

  const disable = useCallback(async () => {
    setState("busy");
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await remove({ endpoint: sub.endpoint }).catch(() => {});
        await sub.unsubscribe();
      }
      setState("idle");
    } catch {
      setState("idle");
    }
  }, [remove]);

  return { state, error, enable, disable };
}
