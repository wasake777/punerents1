"use client";

import { memo, useMemo, useState } from "react";
import { formatINR, statsByBhk } from "@/lib/stats";
import { Bhk, BHK_COLORS, RentPin } from "@/lib/types";

interface Props {
  pins: RentPin[];
  bhkFilter: Bhk | null;
}

// The stats card itself, reused by the floating desktop panel below and by
// the mobile ⋮ menu in App.
export function StatsCard({ pins, bhkFilter }: Props) {
  const stats = useMemo(() => statsByBhk(pins), [pins]);

  return (
    <div className="rounded-2xl bg-white/90 p-4 shadow-md shadow-slate-900/10 ring-1 ring-slate-900/10 backdrop-blur-md dark:bg-slate-800/90 dark:ring-white/10">
      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">This map area</h3>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {pins.length.toLocaleString("en-IN")} rent{" "}
        {pins.length === 1 ? "pin" : "pins"}
        {bhkFilter ? ` · ${bhkFilter} only` : ""}
      </p>

      {stats.length === 0 ? (
        <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
          No pins in view - zoom out or pan around.
        </p>
      ) : (
        <table className="mt-3 w-full text-xs">
          <thead>
            <tr className="text-left text-slate-400 dark:text-slate-500">
              <th className="pb-1 font-medium">Size</th>
              <th className="pb-1 text-right font-medium">Median rent</th>
              <th className="pb-1 text-right font-medium">#</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s) => (
              <tr key={s.bhk} className="border-t border-slate-100 dark:border-slate-700">
                <td className="py-1.5">
                  <span className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: BHK_COLORS[s.bhk] }}
                    />
                    {s.bhk}
                  </span>
                </td>
                <td className="py-1.5 text-right font-bold tabular-nums text-slate-800 dark:text-slate-100">
                  {formatINR(s.medianRent)}
                </td>
                <td className="py-1.5 text-right tabular-nums text-slate-400 dark:text-slate-500">{s.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {stats.some((s) => s.medianDeposit != null) && (
        <p className="mt-2 border-t border-slate-100 pt-2 text-[11px] text-slate-500 dark:border-slate-700 dark:text-slate-400">
          Median deposit:{" "}
          {stats
            .filter((s) => s.medianDeposit != null)
            .map((s) => `${s.bhk} ${formatINR(s.medianDeposit!)}`)
            .join(" · ")}
        </p>
      )}
    </div>
  );
}

// Floating panel with its own show/hide toggle. Desktop-only: on phones the
// stats live inside the ⋮ menu instead of floating over the map.
// memo: the parent re-renders on every toast/selection/modal change, but the
// pins array identity only changes when the viewport or filter does.
export default memo(function StatsPanel({ pins, bhkFilter }: Props) {
  const [open, setOpen] = useState(true);

  return (
    <div className="hidden w-60 md:block">
      <button
        onClick={() => setOpen((o) => !o)}
        className="mb-1.5 ml-auto block rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-md shadow-slate-900/10 ring-1 ring-slate-900/10 backdrop-blur-md transition hover:bg-white dark:bg-slate-800/90 dark:text-slate-300 dark:ring-white/10 dark:hover:bg-slate-800"
      >
        {open ? "Hide stats" : "📊 Area stats"}
      </button>

      {open && <StatsCard pins={pins} bhkFilter={bhkFilter} />}
    </div>
  );
});
