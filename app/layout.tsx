import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

// One variable family: normal width for UI, stretched wide for the big fintech-style headlines.
const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"], axes: ["wdth"] });

const description = "Snap a receipt, say who had what, and everyone gets a PayPal request.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Tabby — the AI that settles the tab", template: "%s - Tabby" },
  description,
};

const organization = { "@context": "https://schema.org", "@type": "Organization", name: "Tabby", url: SITE_URL, description };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: the script below sets data-theme before React hydrates.
    <html lang="en" className={`${archivo.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* Apply the saved (or system) theme before first paint, so dark mode never flashes white. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{document.documentElement.dataset.theme=localStorage.theme||(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light")}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }} />
        {children}
      </body>
    </html>
  );
}
