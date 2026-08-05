import Link from "next/link";
import { logout } from "../actions";

const LINKS: [string, string][] = [
  ["/admin", "Dashboard"],
  ["/admin/pins", "Pins"],
  ["/admin/comments", "Comments"],
  ["/admin/tolets", "To-Lets"],
  ["/admin/listings", "Listings"],
  ["/admin/seekers", "Seekers"],
  ["/admin/alerts", "Alerts"],
  ["/admin/matching", "Matching"],
  ["/admin/abuse", "Abuse"],
  ["/admin/audit", "Audit"],
];

export default function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2">
          <span className="shrink-0 text-sm font-bold text-emerald-700">
            PuneRents admin
          </span>
          <nav className="flex min-w-0 flex-1 gap-1 overflow-x-auto text-sm">
            {LINKS.map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className="shrink-0 rounded-md px-2.5 py-1.5 font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              >
                {label}
              </Link>
            ))}
          </nav>
          <Link
            href="/"
            className="shrink-0 rounded-md px-2.5 py-1.5 text-sm text-slate-500 transition hover:bg-slate-100"
          >
            View site
          </Link>
          <form action={logout}>
            <button className="shrink-0 rounded-md bg-slate-100 px-2.5 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-200">
              Log out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
