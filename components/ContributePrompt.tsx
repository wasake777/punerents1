"use client";

import { Modal } from "./ui";

interface Props {
  /** How many flats matched - shown so the ask doesn't bury their result. */
  matchCount: number;
  onAdd: () => void;
  onClose: () => void;
}

/**
 * Asks a flat-hunter to add their own rent, right after they register as a
 * seeker.
 *
 * This is the one moment where the best possible contributor is already in
 * front of us: anyone hunting for a flat is renting somewhere right now, and
 * they have just taken data out of the map. Every other surface asks a
 * stranger who has no reason to care yet. Shown once per month at most, and
 * never to someone who has already pinned a rent.
 */
export default function ContributePrompt({ matchCount, onAdd, onClose }: Props) {
  return (
    <Modal onClose={onClose}>
      <h2 className="text-xl font-extrabold tracking-tight">
        🙏 One thing before you go
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        {matchCount > 0
          ? `Your ${matchCount} match${matchCount === 1 ? "" : "es"} ${
              matchCount === 1 ? "is" : "are"
            } on the map behind this, and we'll email you as new ones appear.`
          : "You're on the list - we'll email you the moment a matching flat is listed."}
      </p>

      <div className="mt-4 rounded-xl bg-emerald-50 p-4">
        <p className="text-sm font-bold text-emerald-900">
          You&apos;re renting somewhere right now. What do you pay?
        </p>
        <p className="mt-1 text-sm text-emerald-800">
          Add it anonymously - 30 seconds, no name, no phone number. The map you
          just used only exists because other tenants did the same, and the next
          person gets to negotiate with a real number instead of a guess.
        </p>
      </div>

      <button
        onClick={onAdd}
        className="mt-4 w-full rounded-xl bg-emerald-600 py-2.5 text-[15px] font-bold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500"
      >
        📍 Add my rent
      </button>
      <button
        onClick={onClose}
        className="mt-2 w-full rounded-xl py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
      >
        Not now
      </button>
    </Modal>
  );
}
