import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { SITE, NAV } from "@/lib/site";
import { Byline, AuthorJsonLd } from "@/components/byline";
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
    <header className="no-print sticky top-0 z-50 border-b border-border/80 bg-bg/85 backdrop-blur-md">
      <div className="shell flex h-14 items-center gap-6">
        <Link href="/" className="text-[15px] font-semibold tracking-[-0.03em] whitespace-nowrap">
          emailrules<span className="text-accent">.today</span>
        </Link>
        <nav className="ml-auto flex items-center gap-1">
          <div className="mr-1.5">
            <Search items={index} />
          </div>
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="hidden rounded-md px-2.5 py-1.5 text-[13.5px] text-muted-fg transition-colors hover:text-fg sm:block"
            >
              {n.label}
            </Link>
          ))}
          <Link
            href="/check"
            className={cn(buttonVariants({ size: "sm" }), "ml-1.5 h-8 rounded-lg px-3 text-[13px] font-medium")}
          >
            Check my domain
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-4 border-t bg-bg-2 py-12">
      <div className="shell grid gap-10 md:grid-cols-[1.15fr_1fr]">
        <div>
          <div className="mb-3 text-[15px] font-semibold tracking-[-0.03em]">
            emailrules<span className="text-accent">.today</span>
          </div>
          <p className="mb-7 max-w-[46ch] text-[13.5px] leading-relaxed text-muted-fg">
            {SITE.maintainer} Independent by design: we sell no tracking, no seed tests and no ESP.
          </p>
          <Byline />
        </div>

        <div className="flex flex-col gap-2 text-[13px] text-muted-fg md:items-end">
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <Link href="/methodology" className="hover:text-fg">Methodology</Link>
            <Link href="/sources" className="hover:text-fg">Sources</Link>
            <a href="/llms.txt" className="hover:text-fg">llms.txt</a>
          </div>
          <a href={`mailto:${SITE.contact}`} className="hover:text-fg">{SITE.contact}</a>
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
        <Footer />
      </body>
    </html>
  );
}
