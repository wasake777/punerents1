import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Area, AREAS, findArea, nearbyAreas } from "@/lib/areas";
import { bhkLabel, computeAreaStats, fetchAllPinsServer } from "@/lib/areaStats";
import { formatINR } from "@/lib/stats";
import { inrShort } from "@/lib/types";
import { OG_IMAGE } from "@/lib/seo";
import { POSTS } from "@/app/blog/_posts";

// A short, stable set of guides cross-linked from every area page; the full
// list lives at /blog and on the /rent hub.
const GUIDE_POSTS = POSTS.slice(0, 4);

// Rents move slowly; an hour of staleness is fine and keeps Supabase load flat.
export const revalidate = 3600;
export const dynamicParams = false;

export function generateStaticParams() {
  return AREAS.map((a) => ({ area: a.slug }));
}

interface Props {
  params: Promise<{ area: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { area: slug } = await params;
  const area = findArea(slug);
  if (!area) return {};
  const year = new Date().getFullYear();
  const pins = await fetchAllPinsServer();
  const stats = computeAreaStats(pins, area);
  const oneBhk = stats.byBhk.find((s) => s.bhk === "1BHK");
  const title = `Average Rent in ${area.name} (${year}) - Real 1 RK, 1 BHK & 2 BHK Rents`;
  const description = oneBhk
    ? `Real rents reported by tenants in ${area.name}: 1 BHK around ₹${inrShort(oneBhk.medianRent)}/month. See rent and deposit for every BHK, furnished vs unfurnished - crowdsourced, no brokers.`
    : `What rent should you pay in ${area.name}? Crowdsourced rents and deposits reported by real tenants - 1 RK to 3 BHK, furnished and unfurnished, no brokerage.`;
  return {
    title,
    description,
    alternates: { canonical: `/rent/${area.slug}` },
    openGraph: { title, description, url: `https://punerents.com/rent/${area.slug}`, images: [OG_IMAGE] },
  };
}

function faqFor(
  area: Area,
  stats: ReturnType<typeof computeAreaStats>
): { q: string; a: string }[] {
  const faq: { q: string; a: string }[] = [];
  const oneBhk = stats.byBhk.find((s) => s.bhk === "1BHK");
  const twoBhk = stats.byBhk.find((s) => s.bhk === "2BHK");
  if (stats.medianRent) {
    faq.push({
      q: `What is the average rent in ${area.name}?`,
      a: `Based on ${stats.count} rent${stats.count === 1 ? "" : "s"} reported by tenants on PuneRents, the median rent in ${area.name} is ${formatINR(stats.medianRent)} per month across all flat sizes.`,
    });
  }
  if (oneBhk) {
    faq.push({
      q: `How much is a 1 BHK on rent in ${area.name}?`,
      a: `Tenants in ${area.name} report a median 1 BHK rent of ${formatINR(oneBhk.medianRent)} per month${oneBhk.medianDeposit ? `, with a typical deposit of ${formatINR(oneBhk.medianDeposit)}` : ""} (${oneBhk.count} report${oneBhk.count === 1 ? "" : "s"}).`,
    });
  }
  if (twoBhk) {
    faq.push({
      q: `How much is a 2 BHK on rent in ${area.name}?`,
      a: `The median 2 BHK rent reported in ${area.name} is ${formatINR(twoBhk.medianRent)} per month${twoBhk.medianDeposit ? `, with deposits around ${formatINR(twoBhk.medianDeposit)}` : ""} (${twoBhk.count} report${twoBhk.count === 1 ? "" : "s"}).`,
    });
  }
  faq.push({
    q: `Can I find a flat in ${area.name} without a broker?`,
    a: `Yes. PuneRents is a free, crowdsourced map of real rents paid by tenants in ${area.name} and across Pune and Pimpri-Chinchwad. Knowing the actual going rate helps you negotiate directly with owners and avoid paying brokerage.`,
  });
  if (stats.bachelorCount + stats.familyCount > 0) {
    const bp = Math.round((stats.bachelorCount / (stats.bachelorCount + stats.familyCount)) * 100);
    faq.push({
      q: `Is ${area.name} good for bachelors?`,
      a: `Of the reported rentals in ${area.name} that mention tenant type, ${bp}% are rented by bachelors and ${100 - bp}% by families.`,
    });
  }
  return faq;
}

export default async function AreaPage({ params }: Props) {
  const { area: slug } = await params;
  const area = findArea(slug);
  if (!area) notFound();
  const year = new Date().getFullYear();
  const pins = await fetchAllPinsServer();
  const stats = computeAreaStats(pins, area);
  const faq = faqFor(area, stats);
  const nearby = nearbyAreas(area);

  const jsonLd: Record<string, unknown>[] = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "PuneRents", item: "https://punerents.com" },
        { "@type": "ListItem", position: 2, name: "Rent guide", item: "https://punerents.com/rent" },
        { "@type": "ListItem", position: 3, name: area.name, item: `https://punerents.com/rent/${area.slug}` },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ];

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        <Link href="/" className="hover:text-emerald-600">PuneRents</Link>
        {" / "}
        <Link href="/rent" className="hover:text-emerald-600">Rent guide</Link>
        {" / "}
        <span className="text-slate-700 dark:text-slate-300">{area.name}</span>
      </nav>

      <h1 className="text-3xl font-bold tracking-tight">
        Average rent in {area.name} ({year})
      </h1>
      <p className="mt-1 text-sm font-medium text-emerald-700 dark:text-emerald-400">
        {area.region} · real rents reported by tenants · no brokers
      </p>
      <p className="mt-4 text-slate-600 dark:text-slate-300">{area.blurb}</p>

      {stats.count > 0 ? (
        <>
          <p className="mt-4 text-slate-600 dark:text-slate-300">
            <strong className="dark:text-slate-100">{stats.count}</strong> tenant{stats.count === 1 ? " has" : "s have"} anonymously
            reported what they actually pay in {area.name}
            {stats.medianRent ? (
              <>
                {" "}- the median rent is <strong>{formatINR(stats.medianRent)}/month</strong>
              </>
            ) : null}
            . Unlike listing sites that show asking prices, these are real, agreed rents.
          </p>

          <h2 className="mt-10 text-xl font-semibold">
            Rent in {area.name} by flat size
          </h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-300 text-left text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  <th className="py-2 pr-4 font-medium">Flat size</th>
                  <th className="py-2 pr-4 font-medium">Median rent</th>
                  <th className="py-2 pr-4 font-medium">Median deposit</th>
                  <th className="py-2 pr-4 font-medium">Furnished</th>
                  <th className="py-2 pr-4 font-medium">Unfurnished</th>
                  <th className="py-2 font-medium">Reports</th>
                </tr>
              </thead>
              <tbody>
                {stats.byBhk.map((s) => (
                  <tr key={s.bhk} className="border-b border-slate-200 dark:border-slate-800">
                    <td className="py-2.5 pr-4 font-semibold">{bhkLabel(s.bhk)}</td>
                    <td className="py-2.5 pr-4">{formatINR(s.medianRent)}</td>
                    <td className="py-2.5 pr-4">
                      {s.medianDeposit ? formatINR(s.medianDeposit) : "-"}
                    </td>
                    <td className="py-2.5 pr-4">
                      {s.furnishedMedianRent ? formatINR(s.furnishedMedianRent) : "-"}
                    </td>
                    <td className="py-2.5 pr-4">
                      {s.unfurnishedMedianRent ? formatINR(s.unfurnishedMedianRent) : "-"}
                    </td>
                    <td className="py-2.5 text-slate-500">{s.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
            Medians of rents reported by tenants within ~{area.radiusKm} km of {area.name}. "-"
            means too few reports for that slice yet.
          </p>

          {stats.bachelorCount + stats.familyCount > 0 && (
            <p className="mt-6 text-slate-600 dark:text-slate-300">
              Of reports that mention tenant type, <strong>{stats.bachelorCount}</strong> came from
              bachelors and <strong>{stats.familyCount}</strong> from families - useful signal for
              how bachelor-friendly {area.name} landlords are.
            </p>
          )}
        </>
      ) : (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-lg font-semibold">No rent reports in {area.name} yet</h2>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            Be the first - if you rent (or rented) a flat in {area.name}, add what you pay to the
            map. It's anonymous, takes 30 seconds, and helps the next tenant negotiate a fair rent
            without a broker.
          </p>
        </div>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href={`/?at=${area.lat},${area.lng}`}
          className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-emerald-700"
        >
          View {area.name} on the rent map →
        </Link>
        {/* Deep-links into the add-rent flow centred on this area, so the
            intent survives the click - a bare "/" made people rediscover it. */}
        <Link
          href={`/?add=rent&at=${area.lat},${area.lng}`}
          className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-800"
        >
          + Add your rent in {area.name}
        </Link>
      </div>

      <h2 className="mt-12 text-xl font-semibold">Frequently asked questions</h2>
      <div className="mt-4 space-y-5">
        {faq.map((f) => (
          <div key={f.q}>
            <h3 className="font-semibold text-slate-800 dark:text-slate-200">{f.q}</h3>
            <p className="mt-1 text-slate-600 dark:text-slate-300">{f.a}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-12 text-xl font-semibold">Guides for renting in Pune</h2>
      <ul className="mt-4 space-y-2 text-sm">
        {GUIDE_POSTS.map((p) => (
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

      <h2 className="mt-12 text-xl font-semibold">Rents in nearby areas</h2>
      <ul className="mt-4 flex flex-wrap gap-2">
        {nearby.map((n) => (
          <li key={n.slug}>
            <Link
              href={`/rent/${n.slug}`}
              className="inline-block rounded-full bg-white px-4 py-1.5 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 hover:text-emerald-700 hover:ring-emerald-300 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700 dark:hover:text-emerald-400 dark:hover:ring-emerald-500"
            >
              Rent in {n.name}
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-12 border-t border-slate-200 pt-6 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
        PuneRents is a free, crowdsourced map of real rents across Pune and Pimpri-Chinchwad.
        Data comes from anonymous tenant reports, not listings - see{" "}
        <Link href="/rent" className="text-emerald-700 hover:underline dark:text-emerald-400">
          all areas
        </Link>{" "}
        or explore the{" "}
        <Link href="/" className="text-emerald-700 hover:underline dark:text-emerald-400">
          live map
        </Link>
        .
      </p>
    </main>
  );
}
