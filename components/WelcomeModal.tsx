"use client";

import Logo from "./Logo";
import { BHK_COLORS } from "@/lib/types";

// First-visit explainer. A map full of coloured dots means nothing to a
// newcomer, so this says what the dots are and the two things you can do
// here. App shows it once - dismissing sets a localStorage flag.

interface Props {
  onClose: () => void;
  /** "Show me around" - closes the modal and starts the spotlight tour. */
  onTour: () => void;
}

export default function WelcomeModal({ onClose, onTour }: Props) {
  return (
    <div
      className="absolute inset-0 z-30 flex items-end justify-center bg-slate-900/40 p-4 backdrop-blur-[2px] sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl bg-white p-5 text-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="float-right -mr-2 -mt-2 rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <h2 className="text-2xl font-extrabold tracking-tight">
          <Logo size={28} />
        </h2>
        <p className="mt-1 text-sm font-medium text-slate-600">
          What Pune really pays in rent - mapped anonymously by the people
          paying it. No brokers.
        </p>

        <ul className="mt-4 space-y-3 text-sm text-slate-700">
          <li className="flex items-start gap-3">
            <span className="mt-0.5 flex shrink-0 -space-x-2">
              {(
                [
                  ["1BHK", "₹14K"],
                  ["2BHK", "₹24K"],
                ] as const
              ).map(([b, r]) => (
                <span
                  key={b}
                  className="inline-block rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white ring-2 ring-white"
                  style={{ backgroundColor: BHK_COLORS[b] }}
                >
                  {r}
                </span>
              ))}
            </span>
            <span>
              <span className="font-bold text-slate-900">Every price tag is a real rent</span>{" "}
              someone pays - the colour shows the flat size. Tap one to see the
              deposit, society and what the tenant says about living there.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-0.5 shrink-0 text-base">🔍</span>
            <span>
              <span className="font-bold text-slate-900">Hunting for a flat?</span> Tap
              “Find a flat” and say what you need once - matching flats land
              straight in your inbox.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-0.5 shrink-0 text-base">📍</span>
            <span>
              <span className="font-bold text-slate-900">Already renting?</span> Add your
              rent anonymously - takes 30 seconds, and the next person
              negotiates with real numbers.
            </span>
          </li>
        </ul>

        <button
          onClick={onTour}
          className="mt-5 w-full rounded-xl bg-emerald-600 py-2.5 text-[15px] font-bold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500"
        >
          Show me around →
        </button>
        <button
          onClick={onClose}
          className="mt-2 w-full rounded-xl py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
        >
          Skip, explore myself
        </button>
      </div>
    </div>
  );
}
