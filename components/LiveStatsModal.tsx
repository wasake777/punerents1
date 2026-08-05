"use client";

import { useMemo, useState } from "react";
import { sendFeedback } from "@/lib/data";
import { formatINR, leaderboard, statsByBhk } from "@/lib/stats";
import { isValidEmail } from "@/lib/validate";
import { BHK_COLORS, RentPin } from "@/lib/types";
import { Modal } from "./ui";

interface Props {
  pins: RentPin[];
  onClose: () => void;
  /** Tap a leaderboard entry → close the modal and fly to that pin. */
  onViewPin: (pin: RentPin) => void;
}

const RANK_BADGES = ["🥇", "🥈", "🥉", "#4", "#5"];

/** "Sobha Heights" when the author named it, else "Society · Gated" style. */
function placeName(pin: RentPin): string {
  if (pin.society) return pin.society;
  if (pin.gated === true) return `${pin.housing_type} · Gated`;
  if (pin.gated === false) return `${pin.housing_type} · Non-gated`;
  return pin.housing_type;
}

function FeedbackForm() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">(
    "idle"
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim().length < 3) return;
    if (email && !isValidEmail(email)) {
      setState("error");
      return;
    }
    setState("saving");
    try {
      await sendFeedback(message.trim(), email.trim() || null);
      setState("done");
    } catch {
      setState("error");
    }
  };

  if (state === "done") {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-semibold text-emerald-700">
        ✓ Got it - thank you! I read every message.
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-left hover:bg-slate-50"
      >
        <span className="block text-xs font-bold text-slate-700">
          💡 Request a feature
        </span>
        <span className="mt-0.5 block text-[11px] text-slate-500">
          Suggest a feature, report a bug, or share what&apos;s missing - I
          read every message.
        </span>
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-slate-200 p-3"
    >
      <p className="text-xs font-bold text-slate-700">💡 Request a feature</p>
      <textarea
        autoFocus
        required
        minLength={3}
        maxLength={2000}
        rows={3}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="What should PuneRents do better?"
        className="mt-2 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs focus:border-emerald-500 focus:outline-none"
      />
      <div className="mt-1.5 flex gap-1.5">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email if you'd like a reply (optional)"
          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs focus:border-emerald-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={state === "saving" || message.trim().length < 3}
          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {state === "saving" ? "Sending…" : "Send"}
        </button>
      </div>
      {state === "error" && (
        <p className="mt-1 text-[11px] text-red-600">
          Couldn&apos;t send - check the email or try again.
        </p>
      )}
    </form>
  );
}

export default function LiveStatsModal({ pins, onClose, onViewPin }: Props) {
  const top = useMemo(() => leaderboard(pins), [pins]);
  const stats = useMemo(() => statsByBhk(pins), [pins]);

  return (
    <Modal onClose={onClose}>
      <h2 className="text-lg font-bold">📊 Live Stats</h2>
      <p className="mt-0.5 text-xs text-slate-500">
        Real data from Pune &amp; Pimpri-Chinchwad renters ·{" "}
        {pins.length.toLocaleString("en-IN")} pins across the map
      </p>

      {/* 🏆 Leaderboard */}
      <div className="mt-4">
        <h3 className="text-sm font-bold text-slate-800">🏆 Leaderboard</h3>
        <p className="text-[11px] text-slate-500">
          Highest rent per BHK - tap one to see it on the map
        </p>
        <div className="mt-2 space-y-1.5">
          {top.length === 0 && (
            <p className="text-xs text-slate-400">No pins yet.</p>
          )}
          {top.map((entry, i) => (
            <button
              key={entry.pin.id}
              onClick={() => onViewPin(entry.pin)}
              className="flex w-full items-center gap-2.5 rounded-xl border border-slate-100 px-3 py-2 text-left hover:bg-slate-50"
            >
              <span className="w-7 shrink-0 text-center text-sm font-bold text-slate-400">
                {RANK_BADGES[i]}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold text-slate-800">
                  {entry.pin.bhk} · {placeName(entry.pin)}
                </span>
                <span className="block text-[11px] text-slate-500">
                  {entry.pin.furnishing ? `${entry.pin.furnishing} · ` : ""}
                  Total {formatINR(entry.pin.rent)}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-sm font-extrabold text-slate-900">
                  {formatINR(entry.perBhk)}
                </span>
                <span className="block text-[10px] text-slate-400">
                  per BHK
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 📊 Rents by size */}
      <div className="mt-4">
        <h3 className="text-sm font-bold text-slate-800">📊 Rents by size</h3>
        {stats.length === 0 ? (
          <p className="mt-1 text-xs text-slate-400">No pins yet.</p>
        ) : (
          <table className="mt-2 w-full text-xs">
            <thead>
              <tr className="text-left text-slate-400">
                <th className="pb-1 font-medium">Size</th>
                <th className="pb-1 text-right font-medium">Median</th>
                <th className="pb-1 text-right font-medium">Average</th>
                <th className="pb-1 text-right font-medium">Pins</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr key={s.bhk} className="border-t border-slate-100">
                  <td className="py-1.5">
                    <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: BHK_COLORS[s.bhk] }}
                      />
                      {s.bhk}
                    </span>
                  </td>
                  <td className="py-1.5 text-right font-bold text-slate-800">
                    {formatINR(s.medianRent)}
                  </td>
                  <td className="py-1.5 text-right text-slate-600">
                    {formatINR(s.avgRent)}
                  </td>
                  <td className="py-1.5 text-right text-slate-400">
                    {s.count.toLocaleString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Built by */}
      <div className="mt-5 border-t border-slate-100 pt-4">
        <h3 className="text-sm font-bold text-slate-800">
          Built by Tushar Wasake
        </h3>
        <div className="mt-2 space-y-1.5">
          <FeedbackForm />
          <a
            href="https://www.linkedin.com/in/tusharwasake/"
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-xl border border-slate-200 px-3 py-2.5 hover:bg-slate-50"
          >
            <span className="block text-xs font-bold text-slate-700">
              👤 Connect with the creator
            </span>
            <span className="mt-0.5 block text-[11px] text-slate-500">
              Visit my LinkedIn to connect or see what I&apos;m building.
            </span>
          </a>
          <a
            href="/about"
            className="block rounded-xl border border-slate-200 px-3 py-2.5 hover:bg-slate-50"
          >
            <span className="block text-xs font-bold text-slate-700">
              ℹ️ About PuneRents
            </span>
            <span className="mt-0.5 block text-[11px] text-slate-500">
              The mission, how the platform works, and why it&apos;s free.
            </span>
          </a>
        </div>
      </div>
    </Modal>
  );
}
