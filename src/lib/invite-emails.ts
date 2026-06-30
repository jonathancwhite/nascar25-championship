// Invite recipient parsing (NASCAR-031). Pure — splits and validates a raw
// address blob from the invite form so the parsing logic unit-tests with no DB.

// Cap per submit. Real rate limiting (per-admin, per-window) is NASCAR-082; this
// is a sanity bound so a single submit can't fan out unbounded.
export const MAX_INVITES_PER_SUBMIT = 20;

// Pragmatic email shape check (not full RFC 5322): something@something.tld.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ParsedInviteEmails = {
  valid: string[];
  invalid: string[];
  overflow: boolean;
};

/**
 * Parse a raw blob (commas, spaces, semicolons, or newlines between addresses)
 * into de-duplicated lowercase valid addresses and a list of invalid ones.
 * `overflow` is true when more than the cap were supplied.
 */
export function parseInviteEmails(raw: string): ParsedInviteEmails {
  const tokens = raw
    .split(/[\s,;]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  const seen = new Set<string>();
  const valid: string[] = [];
  const invalid: string[] = [];

  for (const token of tokens) {
    const email = token.toLowerCase();
    if (!EMAIL_RE.test(email)) {
      invalid.push(token);
      continue;
    }
    if (seen.has(email)) continue;
    seen.add(email);
    valid.push(email);
  }

  return {
    valid: valid.slice(0, MAX_INVITES_PER_SUBMIT),
    invalid,
    overflow: valid.length > MAX_INVITES_PER_SUBMIT,
  };
}
