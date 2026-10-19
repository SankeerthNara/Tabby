import assert from "node:assert/strict";
import { test } from "node:test";
import { MAX_REMINDERS, reminderDue } from "./reminders.ts";

const DAY = 86_400_000;
const now = Date.UTC(2026, 10, 1);

test("waits 3 days before the first nudge", () => {
  assert.equal(reminderDue("SENT", now - 2 * DAY, undefined, now), false);
  assert.equal(reminderDue("SENT", now - 3 * DAY, undefined, now), true);
});

test("only nudges open invoices", () => {
  for (const s of ["PAID", "MARKED_AS_PAID", "CANCELLED", "DRAFT"]) assert.equal(reminderDue(s, now - 10 * DAY, undefined, now), false);
  assert.equal(reminderDue("UNPAID", now - 10 * DAY, undefined, now), true);
});

test("spaces nudges 3 days apart and stops after the limit", () => {
  assert.equal(reminderDue("SENT", now - 10 * DAY, { count: 1, at: now - DAY }, now), false);
  assert.equal(reminderDue("SENT", now - 10 * DAY, { count: 1, at: now - 3 * DAY }, now), true);
  assert.equal(reminderDue("SENT", now - 30 * DAY, { count: MAX_REMINDERS, at: now - 9 * DAY }, now), false);
});

test("skips invoices with no known creation time", () => {
  assert.equal(reminderDue("SENT", 0, undefined, now), false);
});
