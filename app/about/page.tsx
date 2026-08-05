import type { Metadata } from "next";
import Link from "next/link";
import { OG_IMAGE } from "@/lib/seo";

const title = "About PuneRents - real rents, no brokers";
const description =
  "Why PuneRents exists, how the anonymous rent map works, and who builds it. Rent transparency for Pune & Pimpri-Chinchwad tenants - free, no brokers, no listings spam.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/about" },
  openGraph: { title, description, url: "https://punerents.com/about", images: [OG_IMAGE] },
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <nav className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        <Link href="/" className="hover:text-emerald-600">
          PuneRents
        </Link>
        {" / "}
        <span className="text-slate-700 dark:text-slate-300">About</span>
      </nav>

      <h1 className="text-3xl font-bold tracking-tight">About PuneRents</h1>
      <p className="mt-4 text-slate-600 dark:text-slate-300">
        Finding a flat in Pune means guessing. Listing portals show what
        landlords <em>ask</em>, brokers quote whatever the market will bear,
        and the only people who know what a flat is really worth - the tenants
        already living there - have no way to tell you. PuneRents fixes that
        with one simple idea:{" "}
        <strong className="text-slate-800 dark:text-slate-100">
          tenants anonymously pin what they actually pay
        </strong>
        , and everyone gets to see the real market.
      </p>

      <h2 className="mt-10 text-xl font-semibold">How it works</h2>
      <ul className="mt-4 space-y-3 text-slate-600 dark:text-slate-300">
        <li>
          <strong className="text-slate-800 dark:text-slate-100">
            📍 Rent pins.
          </strong>{" "}
          Anyone can drop a pin with their rent, deposit, BHK and building
          details. Pins are 100% anonymous and locations are rounded to
          roughly 100 metres, so a pin can never identify a flat or its
          tenant.
        </li>
        <li>
          <strong className="text-slate-800 dark:text-slate-100">
            🪧 To-Let spotting.
          </strong>{" "}
          Saw a To-Let board on your street? Pin it. Someone finds a flat
          without paying a month&apos;s rent in brokerage.
        </li>
        <li>
          <strong className="text-slate-800 dark:text-slate-100">
            🏠 Owner-tenant matching.
          </strong>{" "}
          Owners can list a flat and seekers can register what they need.
          Matches are made by email - contact details are never shown on the
          map.
        </li>
        <li>
          <strong className="text-slate-800 dark:text-slate-100">
            🧹 Community moderation.
          </strong>{" "}
          Anyone can flag a wrong or spammy pin; three flags hide it
          automatically.
        </li>
      </ul>
      <p className="mt-4 text-slate-600 dark:text-slate-300">
        Explore the{" "}
        <Link
          href="/"
          className="font-medium text-emerald-700 hover:underline dark:text-emerald-400"
        >
          live rent map
        </Link>{" "}
        or the{" "}
        <Link
          href="/rent"
          className="font-medium text-emerald-700 hover:underline dark:text-emerald-400"
        >
          area-wise rent guide
        </Link>
        .
      </p>

      <h2 className="mt-10 text-xl font-semibold">Free, and staying that way</h2>
      <p className="mt-4 text-slate-600 dark:text-slate-300">
        PuneRents charges nothing, shows no listings spam, and sells no
        contact details. The data belongs to the tenants who shared it, and
        its whole value is that nobody can pay to distort it.
      </p>

      <h2 className="mt-10 text-xl font-semibold">Built by Tushar Wasake</h2>
      <p className="mt-4 text-slate-600 dark:text-slate-300">
        PuneRents is built and run by one person who got tired of Pune
        rent roulette. Want to connect, suggest a feature, or see what
        I&apos;m building next?
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href="https://www.linkedin.com/in/tusharwasake/"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
        >
          👤 Connect on LinkedIn
        </a>
        <Link
          href="/"
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
        >
          🗺 Open the rent map
        </Link>
      </div>
      <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
        Feature requests and bug reports: use{" "}
        <strong>💡 Request a feature</strong> inside 📊 Live stats on the map -
        I read every message.
      </p>
    </main>
  );
}
