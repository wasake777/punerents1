// Shared OG image entry for pages that define their own openGraph metadata:
// in Next 15 a route-level openGraph object replaces the inherited one,
// including the file-convention opengraph-image, so these pages must list
// the image explicitly. The bare /opengraph-image route (no ?v= hash) serves
// the same PNG the hashed meta-tag URL points to.
export const OG_IMAGE = {
  url: "https://punerents.com/opengraph-image",
  width: 1200,
  height: 630,
  alt: "PuneRents - real rents in Pune & Pimpri-Chinchwad, no brokers",
};
