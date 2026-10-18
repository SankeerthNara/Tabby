import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy - Tabby" };

export default function Privacy() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-16 leading-relaxed">
      <Link href="/" className="text-sm font-semibold text-blue hover:underline">Back to Tabby</Link>
      <h1 className="display mt-6 text-4xl">Privacy</h1>
      <p className="mt-6 text-muted">Tabby is a hackathon project that runs on PayPal&apos;s sandbox. No real money moves.</p>
      <h2 className="mt-8 text-xl font-bold">What we collect</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-muted">
        <li>When you log in with PayPal: your PayPal account ID, name and email, so we can show your tabs.</li>
        <li>For each split you send: the restaurant name, your friends&apos; names and PayPal emails, each person&apos;s amount and the PayPal invoice ID.</li>
        <li>Your saved friends and groups: the names and PayPal emails of people you&apos;ve split with or added, so you can pick them again. You can edit or delete them any time in My tabs, under Friends.</li>
        <li>Receipt photos and your &quot;who had what&quot; text are sent to Google Gemini to read the receipt. We don&apos;t store them.</li>
      </ul>
      <h2 className="mt-8 text-xl font-bold">How it&apos;s used</h2>
      <p className="mt-3 text-muted">Only to split bills, send PayPal requests, and show who has paid. We don&apos;t sell or share your data.</p>
      <h2 className="mt-8 text-xl font-bold">Deleting your data</h2>
      <p className="mt-3 text-muted">Ask the project owner through the GitHub repository and we&apos;ll delete your saved splits.</p>
    </main>
  );
}
