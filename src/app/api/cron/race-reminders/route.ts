// Daily reminder cron (NASCAR-052). Vercel Cron hits this with
// `Authorization: Bearer ${CRON_SECRET}`; it emails members for races whose
// local date is exactly the league's lead days out. Idempotent per (race,
// recipient), so running it more than once a day sends each reminder once.

import { isAuthorizedCron } from "@/lib/cron-auth";
import { prisma } from "@/lib/db";
import { serverEnv } from "@/lib/env";
import { captureError, log } from "@/lib/logger";
import { sendRaceReminders } from "@/lib/race-notifications";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (
    !isAuthorizedCron(
      request.headers.get("authorization"),
      serverEnv.CRON_SECRET,
    )
  ) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const result = await sendRaceReminders(new Date());
    // Record the run so /api/health can report cron liveness (NASCAR-081).
    await prisma.cronRun.create({
      data: { job: "race-reminders", ...result },
    });
    log.info("cron.race_reminders", result);
    return Response.json({ ok: true, ...result });
  } catch (error) {
    captureError(error, { event: "cron.race_reminders" });
    return Response.json(
      { ok: false, error: "Reminder run failed." },
      { status: 500 },
    );
  }
}
