import type { Metadata, Viewport } from "next";
import { Schibsted_Grotesk, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import { SITE, NAV } from "@/lib/site";
import { Byline, AuthorJsonLd } from "@/components/byline";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import "./globals.css";

/* Two families, no third face. Grotesk is prose, mono is anything measured. */
const sans = Schibsted_Grotesk({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});
const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const viewport: Viewport = { themeColor: "#f9f7f3" };

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name} — ${SITE.tagline}`, template: `%s — ${SITE.name}` },
  description: SITE.description,
  applicationName: SITE.name,
  alternates: {
    canonical: "/",
    types: { "application/rss+xml": [{ url: "/feed.xml", title: "Rule changes" }] },
  },
  openGraph: {
    type: "website",
    siteName: SITE.name,
    url: SITE.url,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    locale: "en",
  },
  twitter: { card: "summary_large_image", title: SITE.name, description: SITE.description },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  category: "reference",
};

function SiteJsonLd() {
  const json = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE.url}/#website`,
        url: SITE.url,
        name: SITE.name,
        description: SITE.description,
        inLanguage: "en",
        publisher: { "@id": `${SITE.url}/#org` },
        potentialAction: {
          "@type": "SearchAction",
          target: { "@type": "EntryPoint", urlTemplate: `${SITE.url}/rules?q={search_term_string}` },
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "Organization",
        "@id": `${SITE.url}/#org`,
        name: SITE.name,
        url: SITE.url,
        description: SITE.maintainer,
        founder: { "@id": `${SITE.url}/#author` },
      },
    ],
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }} />;
}

function Wordmark() {
  return (
    <Link
      href="/"
      className="m text-[1.02rem] font-bold tracking-[-0.04em] whitespace-nowrap no-underline"
    >
      emailrules<span className="text-alarm">.today</span>
    </Link>
  );
}

function Nav() {
  return (
    <header className="no-print border-b border-rule">
      <nav className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-5">
        <Wordmark />
        <div className="ml-auto flex items-center gap-5">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="hidden text-[0.88rem] text-ink-soft no-underline hover:text-ink sm:block"
            >
              {n.label}
            </Link>
          ))}
          <Link
            href="/check"
            className={cn(buttonVariants({ size: "sm" }), "h-8 px-3 font-semibold")}
          >
            Check my sends
          </Link>
        </div>
      </nav>
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-20 border-t border-rule py-10">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 md:grid-cols-[1.15fr_1fr]">
        <div>
          <div className="m mb-3 text-[1.02rem] font-bold tracking-[-0.04em]">
            emailrules<span className="text-alarm">.today</span>
          </div>
          <p className="mb-7 max-w-[46ch] text-[0.9rem] leading-relaxed text-ink-soft">
            {SITE.maintainer} Independent by design: we sell no tracking, no seed tests and no ESP.
          </p>
          <Byline />
        </div>

        <div className="m flex flex-col gap-1.5 text-[0.72rem] tracking-[0.02em] text-mute md:items-end">
          <div className="flex flex-wrap gap-x-3 gap-y-1.5">
            <Link href="/methodology" className="hover:text-ink">Methodology</Link>
            <Link href="/sources" className="hover:text-ink">Every source</Link>
            <a href="/feed.xml" className="hover:text-ink">RSS</a>
            <a href="/llms.txt" className="hover:text-ink">llms.txt</a>
          </div>
          <a href={`mailto:${SITE.contact}`} className="hover:text-ink">{SITE.contact}</a>
          <span className="opacity-80">Not legal advice. Not affiliated with any ESP.</span>
        </div>
      </div>
    </footer>
  );
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={cn(sans.variable, mono.variable, "font-sans")}>
      <body className="flex min-h-dvh flex-col">
        <SiteJsonLd />
        <AuthorJsonLd siteUrl={SITE.url} />
        <Nav />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
