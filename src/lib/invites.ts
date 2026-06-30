// League invite sending (NASCAR-031). Parses the recipient list, emails each a
// branded join link, and logs every send in EmailLog (type LEAGUE_INVITE). A
// recipient already invited to this league is skipped rather than re-spammed.

import { EmailType } from "@/generated/prisma/enums";
import { clientEnv } from "@/lib/env";
import { prisma } from "@/lib/db";
import { logEmail, sendEmail } from "@/lib/email";
import { parseInviteEmails } from "@/lib/invite-emails";
import { LeagueInviteEmail } from "@/emails/league-invite";

export type SendInvitesResult =
  | { ok: false; error: string }
  | {
      ok: true;
      sent: string[];
      alreadyInvited: string[];
      failed: string[];
      invalid: string[];
      overflow: boolean;
    };

/** Build the deep-link join URL that pre-fills the join form (NASCAR-031). */
export function buildInviteUrl(joinCode: string): string {
  return `${clientEnv.NEXT_PUBLIC_APP_URL}/leagues/join?code=${encodeURIComponent(joinCode)}`;
}

export async function sendLeagueInvites(
  leagueId: string,
  inviterName: string,
  rawEmails: string,
): Promise<SendInvitesResult> {
  const { valid, invalid, overflow } = parseInviteEmails(rawEmails);
  if (valid.length === 0) {
    return {
      ok: false,
      error:
        invalid.length > 0
          ? "None of those look like valid email addresses."
          : "Enter at least one email address.",
    };
  }

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { name: true, joinCode: true },
  });
  if (!league) {
    return { ok: false, error: "League not found." };
  }

  const joinUrl = buildInviteUrl(league.joinCode);
  const sent: string[] = [];
  const alreadyInvited: string[] = [];
  const failed: string[] = [];

  for (const email of valid) {
    const dedupeKey = `invite:${leagueId}:${email}`;

    // Skip anyone already invited to this league (idempotent, no re-spam).
    const existing = await prisma.emailLog.findUnique({
      where: { dedupeKey },
      select: { id: true },
    });
    if (existing) {
      alreadyInvited.push(email);
      continue;
    }

    const result = await sendEmail({
      to: email,
      subject: `${inviterName} invited you to ${league.name}`,
      react: LeagueInviteEmail({
        leagueName: league.name,
        inviterName,
        joinUrl,
      }),
    });

    if (!result.ok) {
      failed.push(email);
      continue;
    }

    await logEmail({
      type: EmailType.LEAGUE_INVITE,
      email,
      dedupeKey,
      resendId: result.id,
    });
    sent.push(email);
  }

  return { ok: true, sent, alreadyInvited, failed, invalid, overflow };
}
