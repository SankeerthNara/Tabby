import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms",
  description: "The terms for using Tabby to split receipts and send PayPal payment requests to friends.",
  alternates: { canonical: "/terms" },
};

export default function Terms() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-16 leading-relaxed">
      <Link href="/" className="text-sm font-semibold text-blue hover:underline">Back to Tabby</Link>
      <h1 className="display mt-6 text-4xl">Terms</h1>
      <ul className="mt-6 list-disc space-y-2 pl-5 text-muted">
        <li>Tabby is a demo built for a hackathon. It runs on PayPal&apos;s sandbox, so no real money moves.</li>
        <li>The AI can misread receipts. Check the split before sending requests.</li>
        <li>Only send requests to people who agreed to split the bill with you.</li>
        <li>Tabby is provided as is, without any warranty.</li>
      </ul>
    </main>
  );
}
