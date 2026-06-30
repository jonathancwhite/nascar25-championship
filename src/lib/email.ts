// Resend email wrapper + EmailLog audit helper (NASCAR-053). One place to send
// transactional mail, build unsubscribe links, and record sends idempotently.

import type { ReactElement } from "react";
import { Resend } from "resend";

import { Prisma } from "@/generated/prisma/client";
import type { EmailType } from "@/generated/prisma/enums";
import { clientEnv } from "@/lib/env";
import { serverEnv } from "@/lib/env";
import { prisma } from "@/lib/db";
import { signUnsubscribeToken } from "@/lib/unsubscribe";

let client: Resend | null = null;
function resend(): Resend {
  client ??= new Resend(serverEnv.RESEND_API_KEY);
  return client;
}

export type SendEmailResult =
  { ok: true; id: string | null } | { ok: false; error: string };

/** Send one transactional email. Errors are caught and returned, not thrown. */
export async function sendEmail(args: {
  to: string;
  subject: string;
  react: ReactElement;
}): Promise<SendEmailResult> {
  try {
    const { data, error } = await resend().emails.send({
      from: serverEnv.EMAIL_FROM,
      to: args.to,
      subject: args.subject,
      react: args.react,
    });
    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true, id: data?.id ?? null };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unknown email error",
    };
  }
}

/** Absolute opt-out URL for a league membership (NASCAR-053). */
export function buildUnsubscribeUrl(membershipId: string): string {
  const token = signUnsubscribeToken(
    membershipId,
    serverEnv.EMAIL_UNSUBSCRIBE_SECRET,
  );
  return `${clientEnv.NEXT_PUBLIC_APP_URL}/unsubscribe?token=${encodeURIComponent(token)}`;
}

export type LogEmailResult = "logged" | "duplicate";

/**
 * Record a send in `EmailLog`. The unique `dedupeKey` makes this idempotent: a
 * retry with the same key returns "duplicate" instead of double-logging (and
 * lets senders skip a re-send). Other unique-violation shapes are re-thrown.
 */
export async function logEmail(args: {
  type: EmailType;
  email: string;
  dedupeKey: string;
  raceId?: string | null;
  userId?: string | null;
  resendId?: string | null;
}): Promise<LogEmailResult> {
  try {
    await prisma.emailLog.create({
      data: {
        type: args.type,
        email: args.email,
        dedupeKey: args.dedupeKey,
        raceId: args.raceId ?? null,
        userId: args.userId ?? null,
        resendId: args.resendId ?? null,
      },
    });
    return "logged";
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return "duplicate";
    }
    throw error;
  }
}
