"use client";

import { useState } from "react";
import {
  PIN_FLAG_REASONS,
  TOLET_FLAG_REASONS,
  PinFlag,
  PinFlagReason,
} from "@/lib/types";
import Turnstile from "./Turnstile";
import { Modal } from "./ui";

interface Props {
  /** "pin" offers the wrong-rent option; "tolet" doesn't have a rent to be wrong. */
  target: "pin" | "tolet";
  onClose: () => void;
  onSubmit: (flag: PinFlag) => Promise<void>;
}

/**
 * Asks why before it accepts a flag.
 *
 * The reason isn't paperwork - it's the evidence the review queue runs on. A
 * bare click tells a moderator nothing, while "rent is wrong, it's ₹18,000"
 * is checkable: independent tenants land on similar numbers without conferring,
 * so agreement is real signal and contradiction is a tell that the flags are
 * staged. Flags never delete anything on their own (schema v9), so the copy
 * says so plainly - it stops people mashing the button expecting a delete.
 */
export default function FlagModal({ target, onClose, onSubmit }: Props) {
  const reasons = target === "pin" ? PIN_FLAG_REASONS : TOLET_FLAG_REASONS;
  const [reason, setReason] = useState<PinFlagReason | null>(null);
  const [claimedRent, setClaimedRent] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rent = Number(claimedRent);
  const rentValid = claimedRent === "" || (Number.isFinite(rent) && rent >= 1000 && rent <= 2000000);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) {
      setError("Pick what's wrong first.");
      return;
    }
    if (!rentValid) {
      setError("That rent doesn't look right - use rupees per month.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSubmit({
        reason,
        claimed_rent: reason === "wrong_price" && claimedRent !== "" ? rent : null,
        note: note.trim() || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send that flag.");
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <h2 className="text-xl font-extrabold tracking-tight">🚩 Why are you flagging this?</h2>
      <p className="mt-0.5 text-xs text-slate-500">
        Flags don&apos;t delete anything on their own - a human checks every one.
        Telling us what&apos;s wrong gets it fixed far quicker.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div className="space-y-2">
          {reasons.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setReason(r.value)}
              className={`flex w-full items-baseline gap-2 rounded-xl border-2 px-3 py-2.5 text-left ${
                reason === r.value
                  ? "border-rose-500 bg-rose-50"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <span className="text-sm font-bold text-slate-800">{r.label}</span>
              <span className="text-[11px] text-slate-500">{r.hint}</span>
            </button>
          ))}
        </div>

        {reason === "wrong_price" && (
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">
              What&apos;s the actual rent? (optional, but it helps a lot)
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={1000}
              max={2000000}
              value={claimedRent}
              onChange={(e) => setClaimedRent(e.target.value)}
              placeholder="e.g. 18000"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none"
            />
            <span className="mt-1 block text-[11px] text-slate-400">
              → a real number carries much more weight than a bare flag
            </span>
          </label>
        )}

        <label className="block">
          <span className="text-xs font-semibold text-slate-600">
            Anything to add? (optional)
          </span>
          <input
            type="text"
            maxLength={300}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. this building was demolished last year"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none"
          />
        </label>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
        )}

        <Turnstile />

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl bg-slate-100 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !reason}
            className="flex-[2] rounded-xl bg-rose-600 py-2.5 text-sm font-bold text-white hover:bg-rose-500 disabled:opacity-50"
          >
            {saving ? "Sending…" : "🚩 Send flag"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
