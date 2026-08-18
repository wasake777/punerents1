import { ImageResponse } from "next/og";

// Browser-tab favicon: white map pin with a house cut-out on an emerald
// gradient tile - matches the Pune(Rents) emerald branding.
// 96x96: Google only shows a favicon in search results when it's a multiple
// of 48px (the old 64x64 was silently skipped).
export const size = { width: 96, height: 96 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 21,
          background: "linear-gradient(135deg, #34d399 0%, #059669 60%, #047857 100%)",
        }}
      >
        <svg width="69" height="69" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 1.8C7.9 1.8 4.6 5.1 4.6 9.2c0 5.4 7.4 13 7.4 13s7.4-7.6 7.4-13c0-4.1-3.3-7.4-7.4-7.4z"
            fill="#ffffff"
          />
          <path
            d="M12 5.4 8.3 8.7h1.2v3h5V8.7h1.2L12 5.4z"
            fill="#047857"
          />
        </svg>
      </div>
    ),
    { ...size }
  );
}
