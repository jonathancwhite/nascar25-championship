// Unit tests for invite recipient parsing (NASCAR-031). No DB.

import assert from "node:assert/strict";
import { test } from "node:test";

import { parseInviteEmails } from "./invite-emails";

test("splits on commas, spaces, semicolons, and newlines", () => {
  const { valid } = parseInviteEmails(
    "a@x.com, b@x.com; c@x.com\nd@x.com e@x.com",
  );
  assert.deepEqual(valid, [
    "a@x.com",
    "b@x.com",
    "c@x.com",
    "d@x.com",
    "e@x.com",
  ]);
});

test("lowercases and de-duplicates", () => {
  const { valid } = parseInviteEmails("Friend@X.com friend@x.com FRIEND@x.com");
  assert.deepEqual(valid, ["friend@x.com"]);
});

test("separates invalid addresses", () => {
  const { valid, invalid } = parseInviteEmails("ok@x.com, notanemail, @nope");
  assert.deepEqual(valid, ["ok@x.com"]);
  assert.deepEqual(invalid, ["notanemail", "@nope"]);
});

test("empty input yields nothing", () => {
  const result = parseInviteEmails("   \n  ");
  assert.deepEqual(result, { valid: [], invalid: [], overflow: false });
});

test("caps the number of valid recipients and flags overflow", () => {
  const many = Array.from({ length: 25 }, (_, i) => `u${i}@x.com`).join(", ");
  const { valid, overflow } = parseInviteEmails(many);
  assert.equal(valid.length, 20);
  assert.equal(overflow, true);
});
