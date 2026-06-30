// Health check (NASCAR-081). Public, unauthenticated: reports DB connectivity
// and the last reminder-cron run so the cron's liveness is queryable. No secrets
// or PII in the payload.

import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  let db: "up" | "down" = "up";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    db = "down";
  }

  let lastCronRun = null;
  try {
    lastCronRun = await prisma.cronRun.findFirst({
      orderBy: { ranAt: "desc" },
      select: {
        job: true,
        ranAt: true,
        racesConsidered: true,
        remindersSent: true,
      },
    });
  } catch {
    // DB is down or unreachable — reflected in `db` above.
  }

  return Response.json(
    { status: db === "up" ? "ok" : "degraded", db, lastCronRun },
    { status: db === "up" ? 200 : 503 },
  );
}
