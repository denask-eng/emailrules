import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";
import { SITE, NAV, FOOTER_NAV } from "@/lib/site";
import { Byline, AuthorJsonLd } from "@/components/byline";
import { SiteFaq } from "@/components/site-faq";
import { Search } from "@/components/search";
import { GLOSSARY_AZ } from "@/content/how-email-works";
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
  const terms = GLOSSARY_AZ.map((t) => ({
    id: t.id,
    term: t.term,
    short: t.short,
    aliases: t.aliases.join(" "),
  }));
  return (
    <header className="no-print sticky top-0 z-50 border-b border-border/70 bg-bg/80 backdrop-blur-xl supports-[backdrop-filter]:bg-bg/72">
      <div className="shell flex h-[3.25rem] items-center gap-2 sm:gap-5">
        <Link
          href="/"
          className="inline-flex h-11 shrink-0 items-center text-[13.5px] font-semibold tracking-[-0.035em] whitespace-nowrap sm:h-auto sm:text-[14.5px]"
        >
          {/* The wordmark never loses the TLD. ".today" is the thesis, not
              decoration, and the 38px it costs comes out of a nav label
              instead — see NAV.short in lib/site.ts. */}
          emailrules<span className="text-accent">.today</span>
        </Link>
        {/* Everything here survives 375px. A hamburger over three destinations
            hides the site behind a gesture to save one line of type. */}
        {/* One gap governs the row. The two ad-hoc margins that used to sit on
            the search and the CTA are gone — three different spacings between
            four items is what made this read as uneven. */}
        <nav aria-label="Primary" className="ml-auto flex items-center gap-1">
          {/* Five things do not fit at 390px, so one destination gives up its
              slot rather than search. "What changed" is a page, and it is
              already linked from the homepage ledger and the footer; search is
              a function with no other route on a phone. Losing it means
              hunting a named rule by scrolling, which is the thing this site
              exists to prevent. It returns at 440px. */}
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "inline-flex h-11 items-center gap-1.5 rounded-lg px-1.5 text-[13px] whitespace-nowrap text-muted-fg hover:bg-muted/80 hover:text-fg sm:h-auto sm:px-2.5 sm:py-1.5",
                "at" in n && n.at === "min-[440px]" && "hidden min-[440px]:inline-flex",
                "at" in n && n.at === "min-[620px]" && "hidden min-[620px]:inline-flex",
              )}
            >
              {n.label}
              {"flag" in n && n.flag ? (
                <span aria-hidden className="relative inline-flex h-1.5 w-1.5 shrink-0">
                  <span className="pulse h-1.5 w-1.5 rounded-full bg-accent" />
                </span>
              ) : null}
            </Link>
          ))}
          <Search items={index} terms={terms} />
          <Link
            href="/check"
            className={cn(
              buttonVariants({ size: "sm" }),
              "h-10 rounded-full px-3 text-[12.5px] font-medium sm:h-8 sm:px-3.5",
            )}
          >
            {/* The noun is the value, so it survives every width a current
                phone actually has. Only below 360px — an original SE, now a
                rounding error — does it drop, because there the row genuinely
                cannot hold it and a header that scrolls sideways is worse than
                a shorter label. */}
            Check<span className="hidden min-[360px]:inline"> domain</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t bg-bg py-14">
      <div className="shell grid gap-12 md:grid-cols-[1fr_1fr]">
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

        <nav aria-label="Footer" className="grid gap-8 text-[13px] sm:grid-cols-2">
          {FOOTER_NAV.map((group) => (
            <div key={group.title}>
              <p className="label">{group.title}</p>
              {/* Padding, not margin, carries the rhythm here: a 17px-tall link
                  in a list of eight is a coin toss on a phone. The row is the
                  target, so the whole line is tappable. */}
              <ul className="mt-2 list-none p-0 text-muted-fg">
                {group.links.map((l) => (
                  <li key={l.href}>
                    {"external" in l ? (
                      <a href={l.href} className="block py-3 hover:text-fg sm:py-1.5">
                        {l.label}
                      </a>
                    ) : (
                      <Link href={l.href} className="block py-3 hover:text-fg sm:py-1.5">
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      <div className="shell mt-12 flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 border-t pt-6 text-[13px] text-muted-fg">
        <a href={`mailto:${SITE.contact}`} className="inline-block py-2.5 hover:text-fg sm:py-0">
          {SITE.contact}
        </a>
        <span className="label">Not legal advice · not affiliated with any ESP</span>
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
        {/* The only instrumentation on this site, and the only one it will get.
            First-party page counts, no cookie, no cross-site identifier — a site
            that argues tracking pixels may be unlawful cannot ship a third one. */}
        <Analytics />
      </body>
    </html>
  );
}
