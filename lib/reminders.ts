import type { Reminder } from "./store.ts";

const DAY = 86_400_000;
export const REMIND_AFTER_DAYS = 3; // first nudge once a request has waited this long, then again this often
export const MAX_REMINDERS = 3;
const OPEN = ["SENT", "UNPAID", "PARTIALLY_PAID"];

// Should the daily job nudge this invoice now? Pure, so it's easy to test.
export function reminderDue(status: string, createdAt: number, last: Reminder | undefined, now: number): boolean {
  if (!OPEN.includes(status) || !createdAt) return false;
  if (now - createdAt < REMIND_AFTER_DAYS * DAY) return false;
  if (!last) return true;
  return last.count < MAX_REMINDERS && now - last.at >= REMIND_AFTER_DAYS * DAY;
}
