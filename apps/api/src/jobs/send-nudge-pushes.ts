/**
 * Sends push notifications for nudges to users with registered push tokens.
 * Run periodically (e.g. cron every few hours): npx tsx src/jobs/send-nudge-pushes.ts
 */
import pg from "pg";
import { computeNudges } from "../services/nudges.js";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

async function sendExpoPush(token: string, title: string, body: string): Promise<boolean> {
  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        to: token,
        title,
        body,
        sound: "default",
      }),
    });
    const json = (await res.json()) as { data?: { status?: string }[] };
    const receipts = Array.isArray(json?.data) ? json.data : [];
    const status = receipts[0]?.status;
    return status === "ok";
  } catch {
    return false;
  }
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/alumify";
  const db = new pg.Pool({ connectionString: databaseUrl });

  const { rows: tokens } = await db.query("SELECT user_id, token FROM push_tokens");
  let sent = 0;
  let failed = 0;

  for (const { user_id, token } of tokens) {
    const nudges = await computeNudges(db, user_id);
    if (nudges.length === 0) continue;
    const top = nudges[0];
    const ok = await sendExpoPush(token, "Alumify", top.message);
    if (ok) sent++;
    else failed++;
    await new Promise((r) => setTimeout(r, 50));
  }

  console.log(`Sent: ${sent}, Failed: ${failed}`);
  await db.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
