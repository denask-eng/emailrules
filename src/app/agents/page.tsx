import type { Metadata } from "next";
import Link from "next/link";
import { getAllRules, getStats, fmtDate } from "@/lib/rules";
import { SITE } from "@/lib/site";
import { SectionHead } from "@/components/bits";
import { CopyContext } from "@/components/copy-context";
import { buildContext } from "@/lib/context-md";

export const metadata: Metadata = {
  title: "For agents",
  description:
    "Query emailrules.today from an agent: an MCP server, per-rule JSON at the same URL a human reads, llms.txt and a change feed. Every answer names its primary source and the date a person last checked it.",
  alternates: { canonical: "/agents" },
};

export const revalidate = 3600;

/**
 * Borrowed from branch B, which was right about the thing that costs the least
 * and matters the most: this site already shipped an MCP server and an
 * llms.txt, and both were reachable from nowhere.
 *
 * An agent finds them by convention. A *person* deciding whether to trust one
 * has to be able to read what they do — and the person deciding is usually the
 * one who would recommend this site to their team. So the machine surface gets
 * a page, and the page has to make one narrow argument:
 *
 *   a model can already write a fluent paragraph about email rules.
 *   what it cannot do is know what is true today.
 *
 * That is what these endpoints sell. Everything on this page is generated from
 * the live corpus so the documentation cannot rot.
 */

interface Endpoint {
  method: string;
  path: string;
  what: string;
  why: string;
  example?: string;
}

export default async function AgentsPage() {
  const [rules, stats] = await Promise.all([getAllRules(), getStats()]);

  /* A live example that cannot go stale: whichever rule was verified most
     recently, resolved at render rather than pasted into the docs. */
  const sample = [...rules].sort((a, b) => b.lastVerified.localeCompare(a.lastVerified))[0];

  const endpoints: Endpoint[] = [
    {
      method: "POST",
      path: "/mcp",
      what: "Model Context Protocol server. JSON-RPC, stateless, one POST, no key.",
      why: "Tools for reading a domain's live authentication, checking an IP against the blocklists that proved they were answering today, reading a whole message, and looking up dated rules. This is the connection you want if your agent framework speaks MCP.",
      example: `{"jsonrpc":"2.0","id":1,"method":"tools/list"}`,
    },
    {
      method: "GET",
      path: "/rules/[slug]?format=json",
      what: "Any rule page as data, at the URL a human reads.",
      why: "Every field, including the ones the page folds behind the Proof tab. An Accept: application/json header on the plain URL does the same thing — so the address your user shares and the address you fetch are the same string.",
      example: `${SITE.url}/rules/${sample?.slug ?? "gmail-bulk-sender-requirements"}?format=json`,
    },
    {
      method: "GET",
      path: "/llms.txt",
      what: "A plain-text map of the whole corpus, with dates.",
      why: "Every rule grouped by topic, each carrying its last-verified date. Written to be read once at the start of a session rather than crawled page by page.",
      example: `${SITE.url}/llms.txt`,
    },
    {
      method: "GET",
      path: "/feed.xml",
      what: "What changed, as RSS.",
      why: "Poll this instead of re-reading the corpus. A rule that has not moved does not need re-fetching, and this is how you find out which ones did.",
      example: `${SITE.url}/feed.xml`,
    },
  ];

  const mcpConfig = `{
  "mcpServers": {
    "emailrules": {
      "type": "http",
      "url": "${SITE.url}/mcp"
    }
  }
}`;

  const sampleContext = sample
    ? buildContext({
        title: sample.title,
        url: `${SITE.url}/rules/${sample.slug}`,
        claim: sample.answer,
        ownership: sample.ownership,
        verified: sample.lastVerified,
        effective: sample.effectiveDate,
        mondayMorning: sample.mondayMorning,
        sources: sample.sources.map((s) => ({
          name: s.name,
          url: s.url,
          published: s.published,
        })),
      })
    : "";

  return (
    <div className="shell py-12 sm:py-16">
      <p className="label">For agents</p>
      <h1 className="mt-4 max-w-[20ch] text-[clamp(2rem,5.6vw,3.2rem)] leading-[1.02] tracking-[-0.04em]">
        Query this from a program.
      </h1>
      <p className="mt-6 max-w-[62ch] text-[1.04rem] leading-relaxed text-muted-fg">
        Everything a person can read here, a program can fetch — from the same URL, with the same
        answer, carrying the date a human last verified it.
      </p>

      {/* The argument, once, plainly. */}
      <section className="mt-10 rounded-2xl border border-accent/25 bg-accent-soft px-5 py-6 sm:px-7">
        <h2 className="text-[1.15rem] tracking-tight">Why this, and not the model on its own</h2>
        <p className="mt-3 max-w-[70ch] text-[15px] leading-relaxed">
          A language model can already write a fluent paragraph about email rules. What it cannot do
          is know what is true today, or that something moved last month. Every rule here names a
          primary source and the date a person last checked the claim against it —{" "}
          <span className="num">{stats.total}</span> rules, most recently{" "}
          <span className="num">{fmtDate(stats.lastReview)}</span>. That date is the product. It is
          also the thing to check us on.
        </p>
        <p className="mt-3 max-w-[70ch] text-[15px] leading-relaxed">
          Cite the rule URL and its <code className="num">lastVerified</code> date, not a snapshot of
          this page. The corpus is versioned by date for exactly that reason.
        </p>
      </section>

      <section className="mt-14">
        <SectionHead label="Endpoints" title="Four ways in." />
        <ul className="list-none border-t p-0">
          {endpoints.map((e) => (
            <li key={e.path} className="border-b py-6">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="num rounded-sm border border-accent/30 bg-accent-soft px-1.5 py-0.5 text-[11px] font-medium text-accent">
                  {e.method}
                </span>
                <code className="num text-[15px] font-medium break-all">{e.path}</code>
              </div>
              <p className="mt-2.5 max-w-[68ch] text-[15px] font-medium">{e.what}</p>
              <p className="mt-1.5 max-w-[68ch] text-[14px] leading-relaxed text-muted-fg">{e.why}</p>
              {e.example ? <pre className="endpoint mt-3">{e.example}</pre> : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-14">
        <SectionHead
          label="Connect it"
          title="Add the MCP server."
          lede="Stateless, no key, no account. Paste this into any client that speaks MCP over HTTP."
        />
        <pre className="endpoint">{mcpConfig}</pre>
        <div className="mt-3">
          <CopyContext markdown={mcpConfig} label="Copy this config" />
        </div>
      </section>

      <section className="mt-14">
        <SectionHead
          label="Copy as context"
          title="What your user hands you."
          lede="Every rule page carries that control. This is what it emits — designed so three of them pasted into one conversation stay distinguishable."
        />
        <pre className="endpoint">{sampleContext}</pre>
      </section>

      <section className="mt-14 rounded-2xl border bg-bg-2 px-5 py-6 sm:px-7">
        <h2 className="text-[1.05rem] tracking-tight">Terms, such as they are</h2>
        <p className="mt-3 max-w-[70ch] text-[14.5px] leading-relaxed text-muted-fg">
          Free, no key, and no rate limit today — if that changes, this page changes with it.
          Attribute the rule URL and the verification date. Please do not present these answers as
          your own reference: the value here is that somebody named is accountable for them, and
          stripping that removes the thing that makes them checkable. Corrections to{" "}
          <a
            href={`mailto:${SITE.contact}`}
            className="font-medium text-accent underline underline-offset-2"
          >
            {SITE.contact}
          </a>
          , and they publish with a date.
        </p>
      </section>

      <p className="mt-10 flex flex-wrap gap-x-5 gap-y-2 text-[13.5px] text-muted-fg">
        <Link href="/methodology" className="underline underline-offset-3 hover:text-fg">
          How we verify
        </Link>
        <Link href="/freshness" className="underline underline-offset-3 hover:text-fg">
          How old this shelf is
        </Link>
        <Link href="/coverage" className="underline underline-offset-3 hover:text-fg">
          What we skip on purpose
        </Link>
        <Link href="/corrections" className="underline underline-offset-3 hover:text-fg">
          Corrections
        </Link>
      </p>
    </div>
  );
}
