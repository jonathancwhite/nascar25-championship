"use server";

import { LeagueRole } from "@/generated/prisma/enums";
import { getOrCreateCurrentUser, requireLeagueRole } from "@/lib/auth";
import { sendLeagueInvites, type SendInvitesResult } from "@/lib/invites";

export type InviteState = {
  error?: string;
  summary?: Extract<SendInvitesResult, { ok: true }>;
};

/**
 * Send league invite emails (NASCAR-031). Admin-only — re-checks authorization
 * server-side — then delegates to sendLeagueInvites and returns a summary the
 * form renders (sent / already invited / failed / invalid).
 */
export async function sendLeagueInvitesAction(
  _prevState: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const leagueId = String(formData.get("leagueId") ?? "");

  const authz = await requireLeagueRole(leagueId, LeagueRole.ADMIN);
  if (!authz.ok) {
    return {
      error:
        authz.reason === "unauthenticated"
          ? "You must be signed in."
          : "Only admins can send invites for this league.",
    };
  }

  const inviter = await getOrCreateCurrentUser();
  const inviterName = inviter?.displayName?.trim() || "A league admin";

  const result = await sendLeagueInvites(
    leagueId,
    inviterName,
    String(formData.get("emails") ?? ""),
  );

  if (!result.ok) {
    return { error: result.error };
  }
  return { summary: result };
}
