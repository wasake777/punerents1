import type { MetadataRoute } from "next";
import { AREAS } from "@/lib/areas";
import { POSTS } from "@/app/blog/_posts";

const BASE = "https://punerents.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: BASE, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/rent`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    ...AREAS.map((a) => ({
      url: `${BASE}/rent/${a.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...POSTS.map((p) => ({
      url: `${BASE}/blog/${p.meta.slug}`,
      lastModified: new Date(p.meta.updated ?? p.meta.date),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
