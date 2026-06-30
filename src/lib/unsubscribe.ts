// Signed unsubscribe tokens (NASCAR-053). A token authenticates the email
// opt-out page without a logged-in session, satisfying CAN-SPAM one-click
// unsubscribe. Pure (only node:crypto + injected secret) so it unit-tests with
// no database; `src/lib/email.ts` supplies the secret from serverEnv.

import { createHmac, timingSafeEqual } from "node:crypto";

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function sign(payload: string, secret: string): string {
  return b64url(createHmac("sha256", secret).update(payload).digest());
}

/**
 * A token encoding a membership id, signed with the server secret. Format:
 * `<membershipId-b64url>.<hmac-b64url>`.
 */
export function signUnsubscribeToken(
  membershipId: string,
  secret: string,
): string {
  const payload = b64url(membershipId);
  return `${payload}.${sign(payload, secret)}`;
}

/**
 * Verify a token and return the membership id it encodes, or null if the token
 * is malformed or the signature doesn't match. Constant-time signature compare.
 */
export function verifyUnsubscribeToken(
  token: string,
  secret: string,
): string | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;
  if (!payload || !signature) return null;

  const expected = sign(payload, secret);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return null;
  }

  try {
    const decoded = Buffer.from(
      payload.replace(/-/g, "+").replace(/_/g, "/"),
      "base64",
    ).toString("utf8");
    return decoded.length > 0 ? decoded : null;
  } catch {
    return null;
  }
}
