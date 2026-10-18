import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";

// One variable family: normal width for UI, stretched wide for the big fintech-style headlines.
const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"], axes: ["wdth"] });

export const metadata: Metadata = {
  title: "Tabby — the AI that settles the tab",
  description: "Snap a receipt, say who had what, and everyone gets a PayPal request.",
};

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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
