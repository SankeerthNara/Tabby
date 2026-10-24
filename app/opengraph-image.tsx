import { ImageResponse } from "next/og";

export const alt = "Tabby: snap a receipt, say who had what, and everyone gets a PayPal request.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Same asterisk as the app logo (app/ui.tsx), drawn as four lines.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 80, background: "#3b49f0", color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24, fontSize: 56, fontWeight: 700 }}>
          <svg width="88" height="88" viewBox="0 0 100 100">
            {[90, 0, 45, 135].map((r) => (
              <line key={r} x1="50" y1="8" x2="50" y2="92" stroke="#5cf2c0" strokeWidth="16" strokeLinecap="round" transform={`rotate(${r} 50 50)`} />
            ))}
          </svg>
          Tabby
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 96, fontWeight: 800, lineHeight: 1, letterSpacing: -2, textTransform: "uppercase" }}>The AI that settles the tab</div>
          <div style={{ fontSize: 36, opacity: 0.85 }}>Snap a receipt, say who had what, and everyone gets a PayPal request.</div>
        </div>
      </div>
    ),
    size,
  );
}
