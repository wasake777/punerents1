import type { Metadata } from "next";
import Script from "next/script";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

// Single modern grotesque for the whole app; weight contrast (500 body /
// 700-800 headings) does the typographic work.
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://punerents.com"),
  title: {
    default: "PuneRents - real rents in Pune & Pimpri-Chinchwad, no brokers",
    template: "%s | PuneRents",
  },
  description:
    "See the average rent tenants actually pay across Pune, Pimpri-Chinchwad and the Hinjewadi-Kharadi IT belt - 1 RK, 1 BHK, 2 BHK and 3 BHK, area by area, on a live map. Anonymous, free, no brokerage.",
  applicationName: "PuneRents",
  keywords: [
    "average rent in Pune",
    "average rent in Pimpri-Chinchwad",
    "1 BHK rent Pune",
    "2 BHK rent Pune",
    "1 RK rent Pune",
    "flat on rent without broker",
    "rent prices Pune",
    "rent in Hinjewadi",
    "rent in Baner",
    "rent in Kharadi",
    "no brokerage flats Pune",
    "Pune rent map",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title: "PuneRents - real rents in Pune & Pimpri-Chinchwad, no brokers",
    description:
      "Crowdsourced map of actual rents paid by tenants across Pune and Pimpri-Chinchwad. Anonymous, free, no brokerage.",
    url: "https://punerents.com",
    siteName: "PuneRents",
    type: "website",
    locale: "en_IN",
  },
  twitter: {
    card: "summary",
    title: "PuneRents - real rents in Pune & Pimpri-Chinchwad, no brokers",
    description:
      "Crowdsourced map of actual rents paid by tenants across Pune and Pimpri-Chinchwad. Anonymous, free, no brokerage.",
  },
};

// Map style, tiles and glyphs all come from openfreemap; pins come from
// Supabase. Warming those connections up front shaves DNS+TLS round trips
// off the map's first paint. (React hoists these links into <head>.)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

const siteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "PuneRents",
  url: "https://punerents.com",
  description:
    "Crowdsourced map of real rents paid by tenants across Pune and Pimpri-Chinchwad - no brokers, no asking-price inflation.",
  publisher: { "@type": "Organization", name: "PuneRents", url: "https://punerents.com" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // html suppressHydrationWarning: the theme script below sets .dark before
    // React hydrates, so the server- and client-rendered class differ.
    <html lang="en" suppressHydrationWarning>
      {/* suppressHydrationWarning: browser extensions (ColorZilla etc.) inject
          attributes into <body> before React hydrates. */}
      <body
        suppressHydrationWarning
        className={`${jakarta.className} h-full bg-slate-100 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100`}
      >
        {/* Apply the saved (or system) theme before first paint - no flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("punerents_theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
        />
        <link rel="preconnect" href="https://tiles.openfreemap.org" crossOrigin="anonymous" />
        {supabaseUrl && (
          <link rel="preconnect" href={supabaseUrl} crossOrigin="anonymous" />
        )}
        {/* Google Analytics (gtag.js) */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-N19GE9TK50"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-N19GE9TK50');`}
        </Script>
        {children}
      </body>
    </html>
  );
}
