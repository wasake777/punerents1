// Registry of guide posts. Add new posts here (newest first); slugs are
// permanent once published - Google indexes them.
import type { Post } from "./types";

import * as moving from "./moving-to-pune-rent-guide";
import * as comparison from "./pune-vs-mumbai-rent";
import * as noBroker from "./how-to-rent-flat-pune-without-broker";
import * as agreement from "./rent-agreement-pune-guide";
import * as deposit from "./security-deposit-pune";
import * as bachelors from "./best-areas-bachelors-pune";

export type { Post, PostMeta, PostFaq } from "./types";

export const POSTS: Post[] = [
  { meta: moving.meta, Body: moving.default },
  { meta: comparison.meta, Body: comparison.default },
  { meta: noBroker.meta, Body: noBroker.default },
  { meta: agreement.meta, Body: agreement.default },
  { meta: deposit.meta, Body: deposit.default },
  { meta: bachelors.meta, Body: bachelors.default },
];

export function findPost(slug: string): Post | undefined {
  return POSTS.find((p) => p.meta.slug === slug);
}
