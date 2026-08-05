import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { POSTS, findPost } from "../_posts";

export const dynamicParams = false;

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.meta.slug }));
}

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = findPost(slug);
  if (!post) return {};
  const { title, description } = post.meta;
  return {
    title,
    description,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      title,
      description,
      url: `https://punerents.com/blog/${slug}`,
      type: "article",
      publishedTime: post.meta.date,
    },
  };
}

const dateFmt = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = findPost(slug);
  if (!post) notFound();
  const { meta, Body } = post;
  const url = `https://punerents.com/blog/${meta.slug}`;

  const jsonLd: object[] = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: meta.title,
      description: meta.description,
      url,
      datePublished: meta.date,
      dateModified: meta.updated ?? meta.date,
      author: { "@type": "Organization", name: "PuneRents", url: "https://punerents.com" },
      publisher: { "@type": "Organization", name: "PuneRents", url: "https://punerents.com" },
      mainEntityOfPage: url,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "PuneRents", item: "https://punerents.com" },
        { "@type": "ListItem", position: 2, name: "Guides", item: "https://punerents.com/blog" },
        { "@type": "ListItem", position: 3, name: meta.title, item: url },
      ],
    },
  ];
  if (meta.faq?.length) {
    jsonLd.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: meta.faq.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    });
  }

  const others = POSTS.filter((p) => p.meta.slug !== meta.slug).slice(0, 3);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        <Link href="/" className="hover:text-emerald-600">PuneRents</Link>
        {" / "}
        <Link href="/blog" className="hover:text-emerald-600">Guides</Link>
      </nav>

      <article>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {meta.title}
        </h1>
        <p className="mt-3 text-sm text-slate-400 dark:text-slate-500">
          {dateFmt.format(new Date(meta.date))} · {meta.minutes} min read
        </p>
        <div className="post-body mt-2">
          <Body />
        </div>
      </article>

      {meta.faq?.length ? (
        <section className="mt-12">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Frequently asked questions
          </h2>
          <dl className="mt-4 space-y-5">
            {meta.faq.map((f) => (
              <div key={f.q}>
                <dt className="font-semibold text-slate-800 dark:text-slate-200">{f.q}</dt>
                <dd className="mt-1 text-slate-600 dark:text-slate-300">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      <section className="mt-12 rounded-2xl bg-emerald-50 p-6 dark:bg-emerald-950/40">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          What do tenants actually pay in your area?
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          PuneRents is a free, anonymous map of real rents reported by tenants across Pune
          and Pimpri-Chinchwad - no brokers, no asking-price inflation.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/"
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700"
          >
            Open the live map
          </Link>
          <Link
            href="/rent"
            className="rounded-xl border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 dark:text-emerald-400 dark:hover:bg-emerald-900/40"
          >
            Browse rents by area
          </Link>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">More guides</h2>
        <ul className="mt-4 space-y-3">
          {others.map((p) => (
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
    </main>
  );
}
