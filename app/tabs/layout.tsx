import type { Metadata } from "next";

// The page is a client component, so its metadata lives here.
export const metadata: Metadata = {
  title: "My tabs",
  description: "Every bill you've split with Tabby: who has paid you back and who still owes you.",
  alternates: { canonical: "/tabs" },
};

export default function TabsLayout({ children }: LayoutProps<"/tabs">) {
  return children;
}
