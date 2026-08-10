"use client";

import { useEffect } from "react";
import type { PickPurpose } from "./App";

// One row per contribution flow, with a one-liner so first-timers can tell
// them apart. Each row carries its flow's accent - the same colour the flow's
// own modal and its pins use - so the choice is recognisable by colour alone:
// emerald = rent, sky = listing, orange = seeker, amber = To-Let board.
const OPTIONS: {
  purpose: PickPurpose;
  emoji: string;
  title: string;
  sub: string;
  /** Emoji tile + hover wash. Full class strings: Tailwind can't see splices. */
  tile: string;
  row: string;
}[] = [
  {
    purpose: "rent",
    emoji: "💰",
    title: "What rent are you paying?",
    sub: "Share it 100% anonymously - takes 30 seconds",
    tile: "bg-emerald-100 ring-emerald-600/20 dark:bg-emerald-500/20 dark:ring-emerald-400/30",
    row: "hover:bg-emerald-50 active:bg-emerald-100 dark:hover:bg-emerald-500/10",
  },
  {
    purpose: "list",
    emoji: "🏠",
    title: "List my flat here",
    sub: "Seekers get your contact by email - never shown on the map",
    tile: "bg-sky-100 ring-sky-700/20 dark:bg-sky-500/20 dark:ring-sky-400/30",
    row: "hover:bg-sky-50 active:bg-sky-100 dark:hover:bg-sky-500/10",
  },
  {
    purpose: "seek",
    emoji: "🔍",
    title: "I'm looking for a flat here",
    sub: "Get emailed when a matching flat lists nearby",
    tile: "bg-orange-100 ring-orange-700/20 dark:bg-orange-500/20 dark:ring-orange-400/30",
    row: "hover:bg-orange-50 active:bg-orange-100 dark:hover:bg-orange-500/10",
  },
  {
    purpose: "tolet",
    emoji: "🪧",
    title: "Spotted a To-Let board",
    sub: "Save someone a broker fee",
    tile: "bg-amber-100 ring-amber-600/20 dark:bg-amber-500/20 dark:ring-amber-400/30",
    row: "hover:bg-amber-50 active:bg-amber-100 dark:hover:bg-amber-500/10",
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
 *
 * The backdrop is deliberately un-blurred and light: the pulsing dot behind it
 * is the whole point of the header line, so it has to stay legible.
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
      className="absolute inset-0 z-30 flex items-end justify-center bg-slate-900/35 p-3 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85dvh] w-full max-w-sm overflow-y-auto overscroll-contain rounded-3xl bg-white p-2 shadow-2xl ring-1 ring-slate-900/15 dark:bg-slate-800 dark:ring-white/15"
      >
        {/* Drag-handle cue: this sits at the screen edge on phones. */}
        <div className="mx-auto mb-1 h-1 w-9 rounded-full bg-slate-300 sm:hidden dark:bg-slate-600" />

        <div className="flex items-start justify-between gap-2 px-2.5 pb-3 pt-1.5">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-400">
              You tapped here
            </p>
            <p className="mt-0.5 text-[19px] font-extrabold leading-tight tracking-tight text-slate-900 dark:text-white">
              Add something here
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-[12.5px] font-medium text-slate-600 dark:text-slate-300">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-800" />
              </span>
              The green dot marks your spot
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="-mr-0.5 -mt-0.5 shrink-0 rounded-full bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 dark:hover:text-white"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="space-y-1">
          {OPTIONS.map((o) => (
            <button
              key={o.purpose}
              onClick={() => onPick(o.purpose)}
              className={`group flex w-full items-center gap-3 rounded-2xl px-2.5 py-2.5 text-left transition ${o.row}`}
            >
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl ring-1 ${o.tile}`}
              >
                {o.emoji}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-extrabold leading-snug tracking-tight text-slate-900 dark:text-white">
                  {o.title}
                </span>
                <span className="mt-0.5 block text-[12px] font-medium leading-snug text-slate-600 dark:text-slate-400">
                  {o.sub}
                </span>
              </span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 dark:text-slate-500"
              >
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
