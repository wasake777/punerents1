import type { ComponentType } from "react";

export interface PostFaq {
  q: string;
  a: string;
}

export interface PostMeta {
  /** Permanent once published - Google indexes it. Rename `title`, never `slug`. */
  slug: string;
  title: string;
  description: string;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  /** Bump when a post gets a real content update; drives sitemap lastModified. */
  updated?: string;
  minutes: number;
  tags: string[];
  /** When present, the post page emits FAQPage JSON-LD for rich results. */
  faq?: PostFaq[];
}

export interface Post {
  meta: PostMeta;
  Body: ComponentType;
}
