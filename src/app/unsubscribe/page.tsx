import type { Metadata } from "next";

import { serverEnv } from "@/lib/env";
import { prisma } from "@/lib/db";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe";

export const metadata: Metadata = {
  title: "Unsubscribe",
};

export const dynamic = "force-dynamic";

// Public, token-authenticated opt-out (NASCAR-053). No login required — the
// signed token in the URL stands in for the session, satisfying one-click
// unsubscribe. Sets the membership's notifyByEmail to false.
export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  const membershipId = token
    ? verifyUnsubscribeToken(token, serverEnv.EMAIL_UNSUBSCRIBE_SECRET)
    : null;

  let status: "ok" | "invalid" = "invalid";
  let leagueName: string | null = null;

  if (membershipId) {
    const membership = await prisma.leagueMembership.findUnique({
      where: { id: membershipId },
      select: { league: { select: { name: true } } },
    });
    if (membership) {
      await prisma.leagueMembership.update({
        where: { id: membershipId },
        data: { notifyByEmail: false },
      });
      status = "ok";
      leagueName = membership.league.name;
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-12">
      <h1 className="font-heading text-2xl font-bold tracking-tight">
        {status === "ok" ? "You're unsubscribed" : "Link not valid"}
      </h1>
      <p className="text-muted-foreground mt-2">
        {status === "ok" ? (
          <>
            You&apos;ll no longer receive emails
            {leagueName ? (
              <>
                {" "}
                for <strong className="text-foreground">{leagueName}</strong>
              </>
            ) : null}
            . You can re-enable them anytime from the league&apos;s settings.
          </>
        ) : (
          "This unsubscribe link is missing or invalid. It may have been altered — try the link from your most recent email."
        )}
      </p>
    </div>
  );
}
