import { createClient } from "./supabase/client";

/**
 * Opt-in for the daily rollover notification (sent by the daily-challenge-push Edge Function). Needs the
 * service worker, which only registers in production, and on iOS an installed home-screen app.
 */
export type PushState = "unsupported" | "denied" | "off" | "on";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

async function registration(): Promise<ServiceWorkerRegistration | undefined> {
  if (!VAPID_PUBLIC_KEY || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window))
    return undefined;
  return navigator.serviceWorker.getRegistration("/");
}

export async function getPushState(): Promise<PushState> {
  const reg = await registration();
  if (!reg) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  return (await reg.pushManager.getSubscription()) ? "on" : "off";
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const base64 = (value + "=".repeat((4 - (value.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

/** Asks for permission, subscribes this browser and saves the subscription for the signed-in player. */
export async function enablePush(): Promise<PushState> {
  const reg = await registration();
  if (!reg) return "unsupported";
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "denied" : "off";

  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(VAPID_PUBLIC_KEY!) }));
  const { endpoint, keys } = sub.toJSON();
  const { error } = await createClient().rpc("save_push_subscription", {
    sub_endpoint: endpoint!,
    sub_p256dh: keys!.p256dh,
    sub_auth: keys!.auth,
  });
  if (error) {
    await sub.unsubscribe();
    throw error;
  }
  return "on";
}

export async function disablePush(): Promise<PushState> {
  const sub = await (await registration())?.pushManager.getSubscription();
  if (!sub) return "off";
  await sub.unsubscribe();
  const { error } = await createClient().from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
  // The browser no longer has the subscription, so a leftover row is pruned on the next send (410).
  if (error) console.error("Failed to remove push subscription", error);
  return "off";
}
