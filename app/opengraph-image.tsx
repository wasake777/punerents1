import { ImageResponse } from "next/og";

// Social share card (WhatsApp, Twitter/X, LinkedIn). Lives at the root so
// every route that doesn't define its own opengraph-image inherits it.
// Visual language mirrors app/icon.tsx: white pin-with-house on the emerald
// gradient tile, Plus Jakarta Sans-ish system stack for the wordmark.
export const alt = "PuneRents - real rents in Pune & Pimpri-Chinchwad, no brokers";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "#0f172a",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: 22,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background:
                "linear-gradient(135deg, #34d399 0%, #059669 60%, #047857 100%)",
            }}
          >
            <svg width="66" height="66" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 1.8C7.9 1.8 4.6 5.1 4.6 9.2c0 5.4 7.4 13 7.4 13s7.4-7.6 7.4-13c0-4.1-3.3-7.4-7.4-7.4z"
                fill="#ffffff"
              />
              <path d="M12 5.4 8.3 8.7h1.2v3h5V8.7h1.2L12 5.4z" fill="#047857" />
            </svg>
          </div>
          <div style={{ display: "flex", fontSize: 64, fontWeight: 800, color: "#f1f5f9", letterSpacing: -2 }}>
            Pune<span style={{ color: "#34d399" }}>Rents</span>
          </div>
        </div>
        <div
          style={{
            marginTop: 48,
            fontSize: 56,
            fontWeight: 700,
            color: "#f1f5f9",
            lineHeight: 1.2,
            letterSpacing: -1,
          }}
        >
          What tenants actually pay in Pune &amp; Pimpri-Chinchwad
        </div>
        <div style={{ marginTop: 24, fontSize: 32, color: "#94a3b8" }}>
          Crowdsourced rent map · 1 RK to 3 BHK, area by area · anonymous, free, no brokerage
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 48 }}>
          {["Hinjewadi 1 BHK", "Baner 2 BHK", "Kharadi 2 BHK", "Wakad 1 BHK"].map((chip) => (
            <div
              key={chip}
              style={{
                padding: "10px 22px",
                borderRadius: 999,
                border: "2px solid #334155",
                color: "#cbd5e1",
                fontSize: 26,
              }}
            >
              {chip}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
