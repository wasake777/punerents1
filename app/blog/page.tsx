import type { Metadata } from "next";
import Link from "next/link";
import { OG_IMAGE } from "@/lib/seo";
import { POSTS } from "./_posts";

export const metadata: Metadata = {
  title: "Pune Renting Guides - Deposits, Agreements, Areas & No-Broker Tips",
  description:
    "Practical guides to renting in Pune and Pimpri-Chinchwad: how much deposit is normal, rent agreement rules, the best areas for your budget, and how to skip brokerage - backed by crowdsourced rent data.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Pune Renting Guides | PuneRents",
    description:
      "Practical guides to renting in Pune and Pimpri-Chinchwad - deposits, agreements, areas and no-broker tips, backed by real tenant-reported rents.",
    url: "https://punerents.com/blog",
    images: [OG_IMAGE],
  },
};

const dateFmt = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export default function BlogIndexPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "PuneRents Renting Guides",
    url: "https://punerents.com/blog",
    description:
      "Practical guides to renting in Pune and Pimpri-Chinchwad, backed by crowdsourced tenant-reported rents.",
    publisher: {
      "@type": "Organization",
      name: "PuneRents",
      url: "https://punerents.com",
      logo: "https://punerents.com/apple-icon",
    },
    blogPost: POSTS.map((p) => ({
      "@type": "BlogPosting",
      headline: p.meta.title,
      url: `https://punerents.com/blog/${p.meta.slug}`,
      datePublished: p.meta.date,
    })),
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        <Link href="/" className="hover:text-emerald-600">PuneRents</Link>
        {" / "}
        <span className="text-slate-700 dark:text-slate-300">Guides</span>
      </nav>

      <h1 className="text-3xl font-bold tracking-tight">Pune renting guides</h1>
      <p className="mt-4 max-w-2xl text-slate-600 dark:text-slate-300">
        Everything we wish tenants knew before signing: deposits, agreements, brokerage,
        and where to live - written from the crowdsourced rents on the{" "}
        <Link
          href="/"
          className="font-medium text-emerald-700 hover:underline dark:text-emerald-400"
        >
          live rent map
        </Link>{" "}
        and the <Link
          href="/rent"
          className="font-medium text-emerald-700 hover:underline dark:text-emerald-400"
        >
          area-wise rent data
        </Link>
        .
      </p>

      <ul className="mt-10 space-y-6">
        {POSTS.map((p) => (
          <li key={p.meta.slug}>
            <Link
              href={`/blog/${p.meta.slug}`}
              className="group block rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-emerald-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-700"
            >
              <h2 className="text-lg font-semibold text-slate-900 group-hover:text-emerald-700 dark:text-slate-100 dark:group-hover:text-emerald-400">
                {p.meta.title}
              </h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                {p.meta.description}
              </p>
              <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
                {dateFmt.format(new Date(p.meta.date))} · {p.meta.minutes} min read
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
