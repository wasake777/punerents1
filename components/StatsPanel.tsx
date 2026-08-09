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
    <div className="rounded-2xl bg-white/95 p-4 shadow-lg shadow-slate-900/15 ring-1 ring-slate-900/15 backdrop-blur-md dark:bg-slate-800/95 dark:ring-white/15">
      <h3 className="text-[15px] font-extrabold tracking-tight text-slate-900 dark:text-slate-100">This map area</h3>
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
        {pins.length.toLocaleString("en-IN")} rent{" "}
        {pins.length === 1 ? "pin" : "pins"}
        {bhkFilter ? ` · ${bhkFilter} only` : ""}
      </p>

      {stats.length === 0 ? (
        <p className="mt-3 text-xs font-medium text-slate-400 dark:text-slate-500">
          No pins in view - zoom out or pan around.
        </p>
      ) : (
        <table className="mt-3 w-full text-[13px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
              <th className="pb-1 font-semibold">Size</th>
              <th className="pb-1 text-right font-semibold">Median rent</th>
              <th className="pb-1 text-right font-semibold">#</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s) => (
              <tr key={s.bhk} className="border-t border-slate-100 dark:border-slate-700">
                <td className="py-1.5">
                  <span className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: BHK_COLORS[s.bhk] }}
                    />
                    {s.bhk}
                  </span>
                </td>
                <td className="py-1.5 text-right font-extrabold tabular-nums text-slate-900 dark:text-slate-100">
                  {formatINR(s.medianRent)}
                </td>
                <td className="py-1.5 text-right font-medium tabular-nums text-slate-400 dark:text-slate-500">{s.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {stats.some((s) => s.medianDeposit != null) && (
        <p className="mt-2 border-t border-slate-100 pt-2 text-[11px] font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400">
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
        className="mb-1.5 ml-auto block rounded-full bg-white/95 px-3 py-1.5 text-[13px] font-bold text-slate-900 shadow-lg shadow-slate-900/15 ring-1 ring-slate-900/15 backdrop-blur-md transition hover:bg-white dark:bg-slate-800/95 dark:text-slate-100 dark:ring-white/15 dark:hover:bg-slate-800"
      >
        {open ? "Hide stats" : "📊 Area stats"}
      </button>

      {open && <StatsCard pins={pins} bhkFilter={bhkFilter} />}
    </div>
  );
});
