// The PuneRents brand mark: the same white map-pin-with-house on an emerald
// gradient tile as the browser-tab favicon. If the mark changes, update
// app/icon.tsx and app/apple-icon.tsx to match - they render it standalone.
// No hooks, so it works in both server and client components.

export function LogoMark({ size = 24 }: { size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center"
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.22),
        background:
          "linear-gradient(135deg, #34d399 0%, #059669 60%, #047857 100%)",
      }}
    >
      <svg
        width={Math.round(size * 0.72)}
        height={Math.round(size * 0.72)}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M12 1.8C7.9 1.8 4.6 5.1 4.6 9.2c0 5.4 7.4 13 7.4 13s7.4-7.6 7.4-13c0-4.1-3.3-7.4-7.4-7.4z"
          fill="#ffffff"
        />
        <path d="M12 5.4 8.3 8.7h1.2v3h5V8.7h1.2L12 5.4z" fill="#047857" />
      </svg>
    </span>
  );
}

/** Mark + two-tone "PuneRents" wordmark, inheriting the parent's font. */
export default function Logo({ size = 24 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark size={size} />
      <span>
        Pune<span className="text-emerald-600">Rents</span>
      </span>
    </span>
  );
}
