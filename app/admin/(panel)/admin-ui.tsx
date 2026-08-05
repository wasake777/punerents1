import Link from "next/link";

// Server-safe presentational bits shared by the admin pages. Buttons that
// need a confirm() live in confirm-button.tsx (client component).

export function PageHead({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-4">
      <h1 className="text-xl font-bold">{title}</h1>
      {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
    </div>
  );
}

export function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
      {children}
    </div>
  );
}

export function Table({ children }: { children: React.ReactNode }) {
  return <table className="w-full text-left text-sm">{children}</table>;
}

export function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th className="whitespace-nowrap border-b border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
      {children}
    </th>
  );
}

export function Td({ children }: { children?: React.ReactNode }) {
  return (
    <td className="border-b border-slate-100 px-3 py-2 align-top">{children}</td>
  );
}

const BADGE: Record<string, string> = {
  slate: "bg-slate-100 text-slate-600",
  emerald: "bg-emerald-100 text-emerald-700",
  rose: "bg-rose-100 text-rose-700",
  amber: "bg-amber-100 text-amber-700",
};

export function Badge({
  tone = "slate",
  children,
}: {
  tone?: keyof typeof BADGE;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${BADGE[tone]}`}
    >
      {children}
    </span>
  );
}

/** Inline action button for a server-action form. */
export const BTN =
  "rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-200";
export const BTN_DANGER =
  "rounded-md bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 transition hover:bg-rose-100";
export const BTN_PRIMARY =
  "rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-700";

/** Filter chips driven by a query param, e.g. ?filter=reported. */
export function FilterBar({
  base,
  current,
  options,
}: {
  base: string;
  current: string;
  options: [string, string][];
}) {
  return (
    <div className="mb-3 flex flex-wrap gap-1.5">
      {options.map(([value, label]) => (
        <Link
          key={value}
          href={value === "all" ? base : `${base}?filter=${value}`}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
            current === value
              ? "bg-emerald-600 text-white"
              : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
          }`}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}

export function MapLink({ lat, lng }: { lat: number; lng: number }) {
  return (
    <a
      href={`https://www.google.com/maps?q=${lat},${lng}`}
      target="_blank"
      rel="noreferrer"
      className="whitespace-nowrap text-sky-700 hover:underline"
    >
      {lat.toFixed(3)}, {lng.toFixed(3)}
    </a>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
      {message}
    </p>
  );
}

export function Empty({ label }: { label: string }) {
  return <p className="px-3 py-6 text-center text-sm text-slate-400">{label}</p>;
}
