// Server-side auth helpers (NASCAR-010). Thin wrappers over Clerk so route
// handlers, server components, and server actions have one import for "who is
// signed in".
//
// `getCurrentUser` returns the Clerk user; mapping a Clerk user to our own
// `User` row lands with the sync webhook (NASCAR-011), and per-league
// authorization (`requireLeagueRole`) lands with NASCAR-022/060.

import { auth, currentUser } from "@clerk/nextjs/server";

export { auth };

/** The signed-in Clerk user, or `null` when unauthenticated. */
export async function getCurrentUser() {
  return currentUser();
}

/**
 * Clerk user id for the current request, or `null`. Protected routes are
 * already gated by middleware, so inside them this is non-null.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId;
}
