import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { SITE, NAV } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s — ${SITE.name}`,
  },
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
  twitter: {
    card: "summary_large_image",
    title: SITE.name,
    description: SITE.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  category: "reference",
};

/**
 * Site-wide structured data. WebSite + Organization is what lets an AI engine
 * attribute a claim to a named publisher, which is the whole point of being
 * the thing models cite rather than the thing they paraphrase.
 */
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
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${SITE.url}/rules?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "Organization",
        "@id": `${SITE.url}/#org`,
        name: SITE.name,
        url: SITE.url,
        description: SITE.maintainer,
      },
    ],
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}

function Nav() {
  return (
    <header className="no-print" style={{ borderBottom: "1px solid var(--border)" }}>
      <div className="wrap flex h-16 items-center justify-between gap-5">
        <Link href="/" className="font-mono text-[15px] font-semibold tracking-tight">
          emailrules<span style={{ color: "var(--primary)" }}>.today</span>
        </Link>
        <nav className="flex items-center gap-1">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="hidden rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:opacity-100 sm:block"
              style={{ color: "var(--muted-fg)" }}
            >
              {n.label}
            </Link>
          ))}
          <Link href="/check" className="btn btn-outline sm:ml-2">
            Check my sends
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer
      className="mt-24 py-12 text-[13.5px]"
      style={{ borderTop: "1px solid var(--border)", color: "var(--muted-fg)" }}
    >
      <div className="wrap flex flex-wrap justify-between gap-8">
        <div style={{ maxWidth: "46ch" }}>
          <div className="mb-2 font-mono text-[15px] font-semibold" style={{ color: "var(--fg)" }}>
            emailrules<span style={{ color: "var(--primary)" }}>.today</span>
          </div>
          {SITE.maintainer} Independent by design: we sell no tracking, no seed tests and no ESP.
        </div>
        <div className="tabular text-[12px] leading-loose">
          <Link href="/methodology" className="underline underline-offset-2">
            Methodology
          </Link>
          {" · "}
          <Link href="/sources" className="underline underline-offset-2">
            Every source
          </Link>
          {" · "}
          <a href="/feed.xml" className="underline underline-offset-2">
            RSS
          </a>
          <br />
          <a href={`mailto:${SITE.contact}`} className="underline underline-offset-2">
            {SITE.contact}
          </a>
          <br />
          <span style={{ opacity: 0.7 }}>Not legal advice.</span>
        </div>
      </div>
    </footer>
  );
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <SiteJsonLd />
        <Nav />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
