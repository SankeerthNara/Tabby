// Daily job: nudge friends whose share is still open (lib/reminders.ts decides when), and forward any
// payment the webhook missed. Runs from the worker's /tasks/remind endpoint (triggered daily by GitHub
// Actions, see .github/workflows/reminders.yml) or by hand: node worker/remind.ts. DRY_RUN=1 sends nothing.
import { invoiceStatus, remind } from "../lib/paypal.ts";
import { reminderDue } from "../lib/reminders.ts";
import { settle } from "../lib/settle.ts";
import { remindersFor, saveReminder, trackedInvoices } from "../lib/store.ts";

export async function runReminders(dry: boolean): Promise<string> {
  const now = Date.now();
  const ids = await trackedInvoices();
  const reminders = await remindersFor(ids);
  let nudged = 0;
  let failed = 0;

  for (const id of ids) {
    try {
      const st = await invoiceStatus(id);
      if (st.status === "PAID") {
        if (!dry) await settle([st]);
        continue;
      }
      const last = reminders.get(id);
      if (!reminderDue(st.status, st.createdAt, last, now)) continue;
      console.log(`${dry ? "would nudge" : "nudging"} ${id} (${st.status}, open ${Math.floor((now - st.createdAt) / 86_400_000)} days, reminder ${(last?.count ?? 0) + 1})`);
      if (dry) continue;
      await remind(id);
      await saveReminder(id, { count: (last?.count ?? 0) + 1, at: now });
      nudged++;
    } catch (e) {
      failed++;
      console.error(`${id}: ${(e as Error).message}`); // e.g. a deleted invoice; keep going with the rest
    }
  }
  return `Checked ${ids.length} invoices, ${dry ? "dry run" : `sent ${nudged} reminders`}, ${failed} errors.`;
}

if (process.argv[1]?.endsWith("remind.ts")) console.log(await runReminders(process.env.DRY_RUN === "1"));
