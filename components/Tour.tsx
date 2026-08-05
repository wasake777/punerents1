"use client";

import { useCallback, useEffect, useState } from "react";

// Spotlight onboarding tour: dims the app and highlights one real control per
// step with a tooltip card. Anchors are elements carrying data-tour="<key>";
// when a key matches several elements (SearchBar renders twice; step 5 targets
// the desktop controls row or the mobile "⋯ More" button), the first visible
// one wins. With no visible target the step falls back to a centered card.

interface Step {
  key: string;
  title: string;
  body: string;
}

const TOUR_STEPS: Step[] = [
  {
    key: "search",
    title: "Find your area",
    body: "Type a locality - Hinjewadi, Baner, Kothrud… - and jump straight there.",
  },
  {
    key: "add",
    title: "Add what you pay",
    body: "Renting somewhere? Add your rent anonymously - or just tap any empty spot on the map.",
  },
  {
    key: "seek",
    title: "Hunting for a flat?",
    body: "Tell us what you need once; matching owner contacts land in your inbox. No broker, no fee.",
  },
  {
    key: "filters",
    title: "Price tags & filters",
    body: "Tag colour = flat size. Tap a chip to filter the map; tap any price tag for full details.",
  },
  {
    key: "controls",
    title: "Everything else",
    body: "Satellite view, metro lines, dark mode and the area rent guide live here.",
  },
];

const PAD = 6; // spotlight breathing room around the target
const CARD_W = 300;

interface Props {
  open: boolean;
  /** Called when the tour finishes or is skipped - persist "toured" there. */
  onClose: () => void;
}

function findTarget(key: string): DOMRect | null {
  const nodes = document.querySelectorAll<HTMLElement>(`[data-tour="${key}"]`);
  for (const n of nodes) {
    if (n.getClientRects().length > 0) return n.getBoundingClientRect();
  }
  return null;
}

export default function Tour({ open, onClose }: Props) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const measure = useCallback(() => {
    setRect(findTarget(TOUR_STEPS[step].key));
  }, [step]);

  // Fresh start each time the tour opens.
  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [open, measure]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const last = step === TOUR_STEPS.length - 1;
  const { title, body } = TOUR_STEPS[step];

  // Tooltip below the spotlight when there's room, else above; clamped to the
  // viewport. Without a target, both spotlight and card center themselves.
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cardStyle: React.CSSProperties = { width: Math.min(CARD_W, vw - 24) };
  if (rect) {
    const below = rect.bottom + PAD + 12;
    cardStyle.top = below + 190 < vh ? below : undefined;
    cardStyle.bottom = below + 190 < vh ? undefined : vh - rect.top + PAD + 12;
    cardStyle.left = Math.max(
      12,
      Math.min(rect.left + rect.width / 2 - CARD_W / 2, vw - CARD_W - 12)
    );
  } else {
    cardStyle.top = "50%";
    cardStyle.left = "50%";
    cardStyle.transform = "translate(-50%, -50%)";
  }

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="App tour">
      {/* Spotlight: the huge shadow is the dimmer, the box is the cut-out. */}
      <div
        className="absolute rounded-xl"
        style={{
          transition: "all 0.3s ease",
          boxShadow: "0 0 0 9999px rgb(15 23 42 / 0.55)",
          ...(rect
            ? {
                top: rect.top - PAD,
                left: rect.left - PAD,
                width: rect.width + PAD * 2,
                height: rect.height + PAD * 2,
              }
            : { top: "50%", left: "50%", width: 0, height: 0 }),
        }}
      />

      <div
        className="absolute rounded-2xl bg-white p-4 shadow-2xl dark:bg-slate-800 dark:ring-1 dark:ring-slate-600/60"
        style={cardStyle}
      >
        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{title}</p>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{body}</p>

        <div className="mt-3 flex items-center gap-1.5">
          {TOUR_STEPS.map((s, i) => (
            <span
              key={s.key}
              className={`h-1.5 rounded-full transition-all ${
                i === step
                  ? "w-4 bg-emerald-500"
                  : "w-1.5 bg-slate-300 dark:bg-slate-600"
              }`}
            />
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <button
            onClick={onClose}
            className="text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            Skip tour
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Back
              </button>
            )}
            <button
              onClick={() => (last ? onClose() : setStep((s) => s + 1))}
              className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
            >
              {last ? "Done ✓" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
