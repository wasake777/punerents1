"use client";

import { useEffect } from "react";
import type { PickPurpose } from "./App";

// One row per contribution flow, with a one-liner so first-timers can tell
// them apart. Same visual language as the header's "＋ Add to map" menu.
const OPTIONS: {
  purpose: PickPurpose;
  emoji: string;
  title: string;
  sub: string;
}[] = [
  {
    purpose: "rent",
    emoji: "💰",
    title: "What rent are you paying?",
    sub: "Share it 100% anonymously - takes 30 seconds",
  },
  {
    purpose: "list",
    emoji: "🏠",
    title: "List my flat here",
    sub: "Seekers get your contact by email - never shown on the map",
  },
  {
    purpose: "seek",
    emoji: "🔍",
    title: "I'm looking for a flat here",
    sub: "Get emailed when a matching flat lists nearby",
  },
  {
    purpose: "tolet",
    emoji: "🪧",
    title: "Spotted a To-Let board",
    sub: "Save someone a broker fee",
  },
];

interface Props {
  onPick: (purpose: PickPurpose) => void;
  onClose: () => void;
}

/**
 * Menu shown after tapping an empty spot on the map. Rendered as a centered
 * popup (like PinCard/ToLetCard) instead of a map-anchored InfoWindow, so
 * zooming or panning underneath can't drag it around or off-screen. The
 * tapped spot itself is marked on the map by MapView (.br-addhere).
 */
export default function AddHereMenu({ onPick, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Add something here"
      className="absolute inset-0 z-30 flex items-center justify-center bg-slate-900/30 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl bg-white p-1.5 shadow-2xl ring-1 ring-slate-900/10 dark:bg-slate-800 dark:ring-white/10"
      >
        <div className="flex items-start justify-between gap-2 border-b border-slate-100 px-2.5 py-2.5 dark:border-slate-700">
          <div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Add something here
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
              📍 The pulsing green dot marks the spot you tapped
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 rounded-lg px-2 py-0.5 text-lg leading-none text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            ×
          </button>
        </div>
        {OPTIONS.map((o) => (
          <button
            key={o.purpose}
            onClick={() => onPick(o.purpose)}
            className="flex w-full items-start gap-3 rounded-xl px-2.5 py-3 text-left transition hover:bg-slate-50 active:bg-slate-100 dark:hover:bg-slate-700/50 dark:active:bg-slate-700"
          >
            <span className="mt-0.5 text-lg">{o.emoji}</span>
            <span>
              <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
                {o.title}
              </span>
              <span className="block text-xs text-slate-500 dark:text-slate-400">
                {o.sub}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
