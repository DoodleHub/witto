// Sends witto's scheduled Web Push notifications, with DAILY_PUSH_SECRET as its bearer token:
// - the daily rollover (the default): every subscriber hears that today's challenge is out. Called by the
//   daily-challenge-push cron job at midnight UTC (see the daily_challenge_push migration).
// - {"kind": "streak"}: players who haven't played today and would lose their streak are reminded. Called
//   by the streak-reminder-push cron job at 20:00 UTC (see the streak_reminder_push migration).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.117.2";
import webpush from "npm:web-push@3.6.7";

// Mirrors TYPE_META in lib/challenges.ts.
const TYPE_META: Record<string, { label: string }> = {
  word: { label: "Word" },
  math: { label: "Math" },
  riddle: { label: "Riddle" },
  fact: { label: "Fact" },
  crossword: { label: "Mini crossword" },
  bee: { label: "Spelling bee" },
  connections: { label: "Connections" },
};

const PAGE_SIZE = 1000;
const CONCURRENCY = 50;
/** Hold an undelivered rollover notification for a few hours; after that it's no longer news. */
const TTL_SECONDS = 6 * 60 * 60;

webpush.setVapidDetails(
  Deno.env.get("VAPID_SUBJECT")!,
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!,
);

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

type Subscription = { endpoint: string; p256dh: string; auth: string };
type Page<S> = (from: number, to: number) => PromiseLike<{ data: S[] | null; error: { message: string } | null }>;
type Options = { TTL: number; topic: string };

/**
 * Sends a notification to every subscription `page` yields, built per subscription by `payload`, and
 * removes the subscriptions the browser has dropped.
 */
async function sendAll<S extends Subscription>(page: Page<S>, payload: (sub: S) => string, options: Options) {
  let sent = 0;
  let failed = 0;
  const gone: string[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data: subs, error } = await page(from, from + PAGE_SIZE - 1);
    if (error || !subs) return { error: error?.message ?? "No data", sent, failed };

    for (let i = 0; i < subs.length; i += CONCURRENCY) {
      const batch = subs.slice(i, i + CONCURRENCY);
      const results = await Promise.allSettled(
        batch.map((s) =>
          webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload(s), {
            ...options,
            urgency: "normal",
          }),
        ),
      );
      results.forEach((r, j) => {
        if (r.status === "fulfilled") return void sent++;
        const status = (r.reason as { statusCode?: number }).statusCode;
        // 404/410: the browser dropped the subscription, so stop sending to it.
        if (status === 404 || status === 410) gone.push(batch[j].endpoint);
        else {
          failed++;
          console.error("Push failed", status, (r.reason as Error).message);
        }
      });
    }
    if (subs.length < PAGE_SIZE) break;
  }

  if (gone.length) {
    const { error } = await supabase.from("push_subscriptions").delete().in("endpoint", gone);
    if (error) console.error("Failed to remove expired subscriptions", error);
  }
  return { error: null, sent, failed, removed: gone.length };
}

Deno.serve(async (req) => {
  const secret = Deno.env.get("DAILY_PUSH_SECRET");
  if (!secret || req.headers.get("Authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { kind } = await req.json().catch(() => ({}));

  // The cron jobs run on UTC, the same clock as public.challenge_today().
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const { data: challenge, error } = await supabase
    .from("challenges")
    .select("number, type")
    .eq("day", today)
    .maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!challenge) return Response.json({ sent: 0, reason: `No challenge for ${today}` });
  const label = TYPE_META[challenge.type]?.label;

  let result;
  if (kind === "streak") {
    const midnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
    const hours = Math.max(1, Math.round((midnight - now.getTime()) / 3_600_000));
    result = await sendAll<Subscription & { streak: number }>(
      (from, to) => supabase.rpc("streak_reminders", { on_day: today }).order("endpoint").range(from, to),
      (s) =>
        JSON.stringify({
          title: `Your ${s.streak}-day streak ends in ${hours} ${hours === 1 ? "hour" : "hours"}`,
          body: label ? `Play today's ${label.toLowerCase()} to keep it going.` : "Play today's challenge to keep it going.",
          url: "/",
          tag: "streak-reminder",
        }),
      // A reminder that arrives after midnight is worse than none.
      { TTL: Math.max(60, Math.floor((midnight - now.getTime()) / 1000)), topic: "streak-reminder" },
    );
  } else {
    const payload = JSON.stringify({
      title: `witto #${challenge.number} is ready`,
      body: label ? `Today's challenge: ${label}.` : "A fresh puzzle is waiting.",
      url: "/",
      tag: "daily-challenge",
    });
    result = await sendAll(
      (from, to) => supabase.from("push_subscriptions").select("endpoint, p256dh, auth").order("endpoint").range(from, to),
      () => payload,
      { TTL: TTL_SECONDS, topic: "daily-challenge" },
    );
  }

  const { error: sendError, ...counts } = result;
  if (sendError) return Response.json({ error: sendError, ...counts }, { status: 500 });
  return Response.json({ kind: kind === "streak" ? "streak" : "daily", day: today, ...counts });
});
