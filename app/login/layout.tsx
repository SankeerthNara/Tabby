import type { Metadata } from "next";

// The page is a client component, so its metadata lives here.
export const metadata: Metadata = {
  title: "Log in",
  description: "Log in with PayPal to split receipts with friends, send their payment requests, and see who still owes you.",
  alternates: { canonical: "/login" },
};

export default function LoginLayout({ children }: LayoutProps<"/login">) {
  return children;
}
