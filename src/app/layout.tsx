import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { SITE, NAV } from "@/lib/site";
import { Byline, AuthorJsonLd } from "@/components/byline";
import { SiteFaq } from "@/components/site-faq";
import { Search } from "@/components/search";
import { getAllRules } from "@/lib/rules";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const viewport: Viewport = { themeColor: "#fdfdfb", colorScheme: "light" };

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name} — ${SITE.tagline}`, template: `%s — ${SITE.name}` },
  description: SITE.description,
  applicationName: SITE.name,
  alternates: { canonical: "/" },
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

async function Nav() {
  const rules = await getAllRules();
  const index = rules.map((r) => ({
    slug: r.slug,
    title: r.title,
    question: r.question,
    ownership: r.ownership,
    jurisdictions: r.jurisdictions.join(" "),
  }));
  return (
    <header className="no-print sticky top-0 z-50 border-b border-border/70 bg-bg/80 backdrop-blur-xl supports-[backdrop-filter]:bg-bg/72">
      <div className="shell flex h-[3.25rem] items-center gap-5">
        <Link
          href="/"
          className="text-[14.5px] font-semibold tracking-[-0.035em] whitespace-nowrap"
        >
          emailrules<span className="text-accent">.today</span>
        </Link>
        <nav className="ml-auto flex items-center gap-0.5">
          <div className="mr-1">
            <Search items={index} />
          </div>
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="hidden rounded-lg px-2.5 py-1.5 text-[13px] text-muted-fg hover:bg-muted/80 hover:text-fg sm:block"
            >
              {n.label}
            </Link>
          ))}
          <Link
            href="/brief"
            className="hidden rounded-lg px-2.5 py-1.5 text-[13px] text-muted-fg hover:bg-muted/80 hover:text-fg md:block"
          >
            Brief
          </Link>
          <Link
            href="/check"
            className={cn(
              buttonVariants({ size: "sm" }),
              "ml-1.5 h-8 rounded-full px-3.5 text-[12.5px] font-medium",
            )}
          >
            Check domain
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t bg-bg py-14">
      <div className="shell grid gap-12 md:grid-cols-[1.2fr_1fr]">
        <div>
          <div className="mb-3 text-[14.5px] font-semibold tracking-[-0.035em]">
            emailrules<span className="text-accent">.today</span>
          </div>
          <p className="mb-6 max-w-[44ch] text-[13.5px] leading-relaxed text-muted-fg">
            {SITE.maintainer} Independent: no tracking pixels sold, no seed tests, no ESP affiliate.
            Email only. A curated shelf with sources — not a fake encyclopedia.
          </p>
          <Byline />
        </div>

        <div className="flex flex-col gap-2.5 text-[13px] text-muted-fg md:items-end">
          <div className="flex flex-wrap gap-x-4 gap-y-2 md:justify-end">
            <Link href="/#faq" className="hover:text-fg">
              FAQ
            </Link>
            <Link href="/glossary" className="hover:text-fg">
              Glossary
            </Link>
            <Link href="/start" className="hover:text-fg">
              Start here
            </Link>
            <Link href="/coverage" className="hover:text-fg">
              Coverage
            </Link>
            <Link href="/methodology" className="hover:text-fg">
              Methodology
            </Link>
            <Link href="/connect" className="hover:text-fg">
              Connect roadmap
            </Link>
            <Link href="/sources" className="hover:text-fg">
              Sources
            </Link>
            <a href="/llms.txt" className="hover:text-fg">
              llms.txt
            </a>
          </div>
          <a href={`mailto:${SITE.contact}`} className="hover:text-fg">
            {SITE.contact}
          </a>
          <span className="label mt-1">Not legal advice · not affiliated with any ESP</span>
        </div>
      </div>
    </footer>
  );
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={cn(geistSans.variable, geistMono.variable, "antialiased")}>
      <body className="flex min-h-dvh flex-col">
        <SiteJsonLd />
        <AuthorJsonLd siteUrl={SITE.url} />
        <Nav />
        <main className="flex-1">{children}</main>
        <SiteFaq />
        <Footer />
      </body>
    </html>
  );
}
