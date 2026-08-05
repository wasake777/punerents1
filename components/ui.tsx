"use client";

import { useEffect } from "react";

// Shared primitives for the four submission modals (and any future ones).
// One place for the backdrop/dismiss behavior and the chip-select styling
// instead of a copy per modal.

export type Accent = "emerald" | "sky" | "orange";

const CHIP_ACTIVE: Record<Accent, string> = {
  emerald: "bg-emerald-600 text-white",
  sky: "bg-sky-700 text-white",
  orange: "bg-orange-700 text-white",
};

export function Chip({
  active,
  accent = "emerald",
  onClick,
  children,
}: {
  active: boolean;
  accent?: Accent;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
        active
          ? CHIP_ACTIVE[accent]
          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <span className="text-xs font-semibold text-slate-600">{label}</span>
      <div className="mt-1.5 flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

/** Backdrop + sheet: closes on backdrop click and Escape. */
export function Modal({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="absolute inset-0 z-30 flex items-end justify-center bg-slate-900/40 p-4 backdrop-blur-[2px] sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        // text-slate-900 anchors the inherited color: the cards stay white in
        // dark mode, but inputs inherit <body>'s dark:text-slate-100 without it,
        // making typed text white-on-white.
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 text-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* sticky + float: stays at the top-right corner while the form scrolls */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="sticky top-0 z-10 float-right -mr-2 -mt-2 rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        {children}
      </div>
    </div>
  );
}
