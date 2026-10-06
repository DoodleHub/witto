// Notifies every push subscriber that today's challenge is out. Called by the daily-challenge-push cron job
// at midnight UTC (see the daily_challenge_push migration) with DAILY_PUSH_SECRET as its bearer token.
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
/** Hold an undelivered notification for a few hours; after that it's no longer news. */
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

Deno.serve(async (req) => {
  const secret = Deno.env.get("DAILY_PUSH_SECRET");
  if (!secret || req.headers.get("Authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  // The cron job fires just after midnight UTC, the same clock as public.challenge_today().
  const today = new Date().toISOString().slice(0, 10);
  const { data: challenge, error } = await supabase
    .from("challenges")
    .select("number, type")
    .eq("day", today)
    .maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!challenge) return Response.json({ sent: 0, reason: `No challenge for ${today}` });

  const meta = TYPE_META[challenge.type];
  const payload = JSON.stringify({
    title: `witto #${challenge.number} is ready`,
    body: meta ? `Today's challenge: ${meta.label}.` : "A fresh puzzle is waiting.",
    url: "/",
    tag: "daily-challenge",
  });

  let sent = 0;
  let failed = 0;
  const gone: string[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data: subs, error } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .order("endpoint")
      .range(from, from + PAGE_SIZE - 1);
    if (error) return Response.json({ error: error.message, sent, failed }, { status: 500 });

    for (let i = 0; i < subs.length; i += CONCURRENCY) {
      const results = await Promise.allSettled(
        subs.slice(i, i + CONCURRENCY).map((s: Subscription) =>
          webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, {
            TTL: TTL_SECONDS,
            urgency: "normal",
            topic: "daily-challenge",
          }),
        ),
      );
      results.forEach((r, j) => {
        if (r.status === "fulfilled") return void sent++;
        const status = (r.reason as { statusCode?: number }).statusCode;
        // 404/410: the browser dropped the subscription, so stop sending to it.
        if (status === 404 || status === 410) gone.push(subs[i + j].endpoint);
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

  return Response.json({ day: today, sent, failed, removed: gone.length });
});
