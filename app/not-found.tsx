import type { Metadata } from "next";

// NotFound animates on mount, so it's a client component; metadata has to come from this server file.
export const metadata: Metadata = { title: "Page not found", description: "This page isn't on the bill. Head back to Tabby to split a receipt." };

export { default } from "./NotFound";
