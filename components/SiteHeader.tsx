import Link from "next/link";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";

// Shared header for the server-rendered content pages (/rent, /blog): the map
// app ("/") is the product, so every page keeps an obvious way back to it.
export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <Link
          href="/"
          className="text-base font-bold tracking-tight text-slate-900 hover:opacity-80 dark:text-slate-100"
        >
          <Logo size={24} />
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <ThemeToggle className="text-base" />
          <Link
            href="/rent"
            className="font-medium text-slate-600 hover:text-emerald-700 dark:text-slate-300 dark:hover:text-emerald-400"
          >
            All areas
          </Link>
          <Link
            href="/blog"
            className="font-medium text-slate-600 hover:text-emerald-700 dark:text-slate-300 dark:hover:text-emerald-400"
          >
            Guides
          </Link>
          <Link
            href="/"
            className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white shadow hover:bg-emerald-700"
          >
            Open the map
          </Link>
        </nav>
      </div>
    </header>
  );
}
