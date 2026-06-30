// Unit tests for signed unsubscribe tokens (NASCAR-053). No DB.

import assert from "node:assert/strict";
import { test } from "node:test";

import { signUnsubscribeToken, verifyUnsubscribeToken } from "./unsubscribe";

const SECRET = "test-secret-abc";

test("round-trips a membership id", () => {
  const token = signUnsubscribeToken("membership_123", SECRET);
  assert.equal(verifyUnsubscribeToken(token, SECRET), "membership_123");
});

test("rejects a token signed with a different secret", () => {
  const token = signUnsubscribeToken("membership_123", SECRET);
  assert.equal(verifyUnsubscribeToken(token, "other-secret"), null);
});

test("rejects a tampered payload", () => {
  const token = signUnsubscribeToken("membership_123", SECRET);
  const [, sig] = token.split(".");
  const forged = `${Buffer.from("membership_999").toString("base64url")}.${sig}`;
  assert.equal(verifyUnsubscribeToken(forged, SECRET), null);
});

test("rejects malformed tokens", () => {
  assert.equal(verifyUnsubscribeToken("", SECRET), null);
  assert.equal(verifyUnsubscribeToken("nodot", SECRET), null);
  assert.equal(verifyUnsubscribeToken("a.b.c", SECRET), null);
});
