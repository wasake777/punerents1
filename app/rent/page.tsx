import type { Metadata } from "next";
import Link from "next/link";
import { AREAS, REGIONS } from "@/lib/areas";
import { POSTS } from "@/app/blog/_posts";
import { computeAreaStats, fetchAllPinsServer } from "@/lib/areaStats";
import { OG_IMAGE } from "@/lib/seo";
import { inrShort } from "@/lib/types";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const year = new Date().getFullYear();
  const title = `Average Rent in Pune & Pimpri-Chinchwad by Area (${year})`;
  const description =
    "Area-wise rent guide built from real rents reported by tenants - 1 RK, 1 BHK, 2 BHK and 3 BHK medians for Hinjewadi, Baner, Kharadi, Kothrud, Viman Nagar, Wakad and 40+ more localities. No brokers, no asking-price inflation.";
  return {
    title,
    description,
    alternates: { canonical: "/rent" },
    openGraph: { title, description, url: "https://punerents.com/rent", images: [OG_IMAGE] },
  };
}

export default async function RentHubPage() {
  const year = new Date().getFullYear();
  const pins = await fetchAllPinsServer();
  const rows = AREAS.map((area) => {
    const stats = computeAreaStats(pins, area);
    const oneBhk = stats.byBhk.find((s) => s.bhk === "1BHK");
    return { area, stats, oneBhk };
  });
  const totalReports = rows.reduce((n, r) => n + r.stats.count, 0);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <nav className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        <Link href="/" className="hover:text-emerald-600">PuneRents</Link>
        {" / "}
        <span className="text-slate-700 dark:text-slate-300">Rent guide</span>
      </nav>

      <h1 className="text-3xl font-bold tracking-tight">
        Average rent in Pune &amp; Pimpri-Chinchwad ({year})
      </h1>
      <p className="mt-4 max-w-2xl text-slate-600 dark:text-slate-300">
        Listing portals show what landlords <em>ask</em>. PuneRents shows what tenants{" "}
        <em>actually pay</em> - {totalReports > 0 ? `${totalReports.toLocaleString("en-IN")} ` : ""}
        anonymous rent reports pinned on a map, from 1 RK to 4 BHK, furnished and unfurnished. Pick
        an area for median rents, deposits and FAQs, or explore the{" "}
        <Link href="/" className="font-medium text-emerald-700 hover:underline dark:text-emerald-400">
          live rent map
        </Link>
        .
      </p>

      {REGIONS.map((region) => (
        <section key={region}>
          <h2 className="mt-10 text-xl font-semibold">{region}</h2>
          <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
            {rows
              .filter((r) => r.area.region === region)
              .map(({ area, stats, oneBhk }) => (
                <li key={area.slug}>
                  <Link
                    href={`/rent/${area.slug}`}
                    className="flex items-baseline justify-between gap-2 rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200 hover:ring-emerald-300 dark:bg-slate-900 dark:ring-slate-700 dark:hover:ring-emerald-500"
                  >
                    <span className="font-medium text-slate-800 dark:text-slate-200">{area.name}</span>
                    <span className="shrink-0 text-sm text-slate-500 dark:text-slate-400">
                      {oneBhk
                        ? `1 BHK ₹${inrShort(oneBhk.medianRent)}`
                        : stats.count > 0
                          ? `${stats.count} report${stats.count === 1 ? "" : "s"}`
                          : "no data yet"}
                    </span>
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      ))}

      <section className="mt-12 border-t border-slate-200 pt-8 dark:border-slate-800">
        <h2 className="text-xl font-semibold">Renting guides</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
          The numbers above tell you what to pay - these guides cover everything else about
          renting in Pune.
        </p>
        <ul className="mt-4 space-y-2 text-sm">
          {POSTS.map((p) => (
            <li key={p.meta.slug}>
              <Link
                href={`/blog/${p.meta.slug}`}
                className="font-medium text-emerald-700 hover:underline dark:text-emerald-400"
              >
                {p.meta.title}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-12 border-t border-slate-200 pt-6 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
        All figures are medians of crowdsourced tenant reports - free, anonymous and broker-free.
        Renting soon? Check the going rate here before you negotiate, then{" "}
        <Link href="/" className="text-emerald-700 hover:underline dark:text-emerald-400">
          add your rent to the map
        </Link>{" "}
        to help the next person.
      </p>
    </main>
  );
}
