import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { resolveTxt } from "node:dns/promises";
import { CopyField } from "@/components/copy-field";
import { getEndpoint, isToken, reportAddress, reportsFor, RETENTION_DAYS } from "@/lib/dmarc-store";
import { summarise, type Source, type SourceKind } from "@/lib/dmarc-report";
import { ProofBar, ShareBar } from "@/components/proof-bar";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * The results, arranged so that the answer is the size of the page.
 *
 * The entire argument of this build is on this page: a DMARC dashboard that
 * shows you every failing row shows you mostly forwarders, and a marketer who
 * opens one concludes either that they are under attack or that the tool is
 * broken. Neither is true. So the forwarded group is collapsed under a heading
 * that says to ignore it, and the top of the page is a count of the rows that
 * actually need a person — which on a healthy domain is zero, and says zero.
 */

export const metadata: Metadata = {
  title: "Your DMARC reports",
  robots: { index: false, follow: false },
};

/* The results URL is the credential, so it must never reach an index or a
   referrer log. noindex is above; the layout's canonical is suppressed here. */
export const dynamic = "force-dynamic";

const TONE: Record<SourceKind, "ok" | "warn" | "bad" | "quiet"> = {
  aligned: "ok",
  "dkim-broken": "warn",
  unauthenticated: "bad",
  forwarded: "quiet",
};

const ACCENT: Record<SourceKind, string> = {
  aligned: "before:bg-ok",
  "dkim-broken": "before:bg-soon",
  unauthenticated: "before:bg-live",
  forwarded: "before:bg-dim/45",
};

/**
 * One sender, as a card with its own share of the total drawn on it.
 *
 * A list of addresses with counts beside them makes the reader do the
 * arithmetic to find out which one is big. The bar does it for them, and the
 * coloured spine says which of the four things this is before any word is read.
 */
function SourceCard({
  source,
  total,
  explain,
}: {
  source: Source;
  total: number;
  /** The paragraph is the same for every source of a kind, so it is printed
      once and the rest of the group carries the headline alone. Repeating it
      six times is what turns a result into something you have to read. */
  explain: boolean;
}) {
  return (
    <li
      className={cn(
        "relative rounded-xl border bg-card p-5 pl-6",
        "before:absolute before:top-5 before:bottom-5 before:left-0 before:w-[3px] before:rounded-r-full before:content-['']",
        ACCENT[source.verdict.kind],
      )}
      style={{ boxShadow: "var(--lift)" }}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <p className="num text-[15px] font-medium">{source.sourceIp}</p>
        <p className="num text-[1.15rem] font-semibold tracking-[-0.03em]">
          {source.messages.toLocaleString("en-GB")}
          <span className="ml-1.5 text-[12px] font-normal text-dim">
            message{source.messages === 1 ? "" : "s"}
          </span>
        </p>
      </div>

      <ShareBar className="mt-3" value={source.messages} total={total} tone={TONE[source.verdict.kind]} />

      <p className="mt-3.5 text-[14px] font-medium">{source.verdict.headline}</p>
      {explain ? (
        <p className="mt-1.5 max-w-[70ch] text-[13px] leading-relaxed text-muted-fg">
          {source.verdict.detail}
        </p>
      ) : null}

      {source.dkimDomains.length || source.spfDomain ? (
        <p className="num mt-3 border-t border-border-soft pt-2.5 text-[11.5px] text-dim">
          {source.dkimDomains.length ? `dkim d=${source.dkimDomains.join(", ")}` : "no dkim signature"}
          {" · "}
          {source.spfDomain ? `spf ${source.spfDomain}` : "no spf domain"}
          {source.dispositions.reject || source.dispositions.quarantine
            ? ` · ${source.dispositions.reject} rejected, ${source.dispositions.quarantine} quarantined`
            : ""}
        </p>
      ) : null}
    </li>
  );
}

async function currentPolicy(domain: string): Promise<string | null> {
  try {
    const records = await resolveTxt(`_dmarc.${domain}`);
    const joined = records.map((parts) => parts.join("")).find((t) => /^v=DMARC1/i.test(t));
    return joined ?? null;
  } catch {
    return null;
  }
}

export default async function DmarcResults({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isToken(token)) notFound();

  const endpoint = await getEndpoint(token);
  if (!endpoint) notFound();

  const address = reportAddress(token);
  const [reports, published] = await Promise.all([
    reportsFor(token),
    currentPolicy(endpoint.domain),
  ]);

  const sources = summarise(reports);
  const needsYou = sources.filter((s) => s.verdict.yours && s.verdict.kind !== "aligned");
  const working = sources.filter((s) => s.verdict.kind === "aligned");
  const forwarded = sources.filter((s) => s.verdict.kind === "forwarded");
  const messages = sources.reduce((total, s) => total + s.messages, 0);
  const receivers = new Set(reports.map((r) => r.orgName)).size;

  /* Volume, not row count — the bar is about how much mail, and one address
     sending a million is not one four-hundredth of a page of forwarders. */
  const volume = (kind: SourceKind) =>
    sources.filter((s) => s.verdict.kind === kind).reduce((total, s) => total + s.messages, 0);

  /* The record to publish: their own, with our address appended, so nobody has
     to work out how to merge a rua list by hand. */
  const suggested = address
    ? published
      ? published.includes(address)
        ? published
        : /rua=/i.test(published)
          ? published.replace(/(rua=)([^;]*)/i, (_, k: string, v: string) => `${k}${v.trim()},mailto:${address}`)
          : published.replace(/;?\s*$/, `; rua=mailto:${address}`)
      : `v=DMARC1; p=none; rua=mailto:${address}`
    : null;

  /* First card of each kind carries the explanation; the rest carry the
     headline alone. */
  const firstOfKind = (list: Source[]) => {
    const seen = new Set<SourceKind>();
    return list.map((s) => {
      const first = !seen.has(s.verdict.kind);
      seen.add(s.verdict.kind);
      return { source: s, explain: first };
    });
  };

  return (
    <div className="shell py-12 sm:py-16">
      <p className="num label">
        {endpoint.domain} · {endpoint.reportCount} report{endpoint.reportCount === 1 ? "" : "s"} ·
        keeping {RETENTION_DAYS} days
      </p>

      {reports.length ? (
        <>
          <h1
            className={cn(
              "mt-4 max-w-[20ch] text-[clamp(2.3rem,7.5vw,4.4rem)] leading-[0.96] tracking-[-0.05em]",
              needsYou.length === 0 ? "text-ok" : "text-live",
            )}
          >
            {needsYou.length === 0
              ? "Nothing here needs you."
              : `${needsYou.length} sender${needsYou.length === 1 ? "" : "s"} need${needsYou.length === 1 ? "s" : ""} you.`}
          </h1>

          {/* The proof, immediately, at the size of the claim. */}
          <ProofBar
            className="mt-9"
            segments={[
              {
                key: "aligned",
                label: "authenticated as you",
                tone: "ok",
                value: volume("aligned"),
              },
              {
                key: "dkim-broken",
                label: "you, but unsigned",
                tone: "warn",
                value: volume("dkim-broken"),
              },
              {
                key: "unauthenticated",
                label: "nothing proves it is you",
                tone: "bad",
                value: volume("unauthenticated"),
                note: "The only band that has ever needed anybody to do anything.",
              },
              {
                key: "forwarded",
                label: "forwarded, not forged",
                tone: "quiet",
                value: volume("forwarded"),
                note: "Drawn grey on purpose. Other tools print this in red.",
              },
            ]}
            caption={`${messages.toLocaleString("en-GB")} message${messages === 1 ? "" : "s"} claimed to be ${endpoint.domain} across ${reports.length} report${reports.length === 1 ? "" : "s"} from ${receivers} receiver${receivers === 1 ? "" : "s"}. Your published policy is p=${reports[0]?.policy.p ?? "unknown"}${reports[0]?.policy.p === "none" ? ", which asks receivers to report and instructs them to block nothing." : "."}`}
          />

          {needsYou.length ? (
            <section className="mt-14">
              <h2 className="num text-[12px] font-medium tracking-[0.07em] text-live uppercase">
                Needs you · {needsYou.length}
              </h2>
              <ul className="mt-4 grid list-none gap-3 p-0">
                {firstOfKind(needsYou).map(({ source, explain }) => (
                  <SourceCard key={`${source.sourceIp}-${source.verdict.kind}`} source={source} total={messages} explain={explain} />
                ))}
              </ul>
            </section>
          ) : null}

          {working.length ? (
            <section className="mt-12">
              <h2 className="num text-[12px] font-medium tracking-[0.07em] text-ok uppercase">
                Working · {working.length}
              </h2>
              <ul className="mt-4 grid list-none gap-3 p-0">
                {firstOfKind(working).map(({ source, explain }) => (
                  <SourceCard key={`${source.sourceIp}-${source.verdict.kind}`} source={source} total={messages} explain={explain} />
                ))}
              </ul>
            </section>
          ) : null}

          {/* Folded shut on purpose. Every other tool in this category makes the
              forwarded pile the bulk of what you scroll through; putting it
              behind one click is the argument made physical rather than
              written down again. */}
          {forwarded.length ? (
            <details className="group mt-12 rounded-xl border bg-bg-2 px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center gap-3 text-[14px] [&::-webkit-details-marker]:hidden">
                <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-[3px] bg-dim/60" />
                <span className="font-medium">
                  {forwarded.length} forwarded source{forwarded.length === 1 ? "" : "s"}
                </span>
                <span className="min-w-0 flex-1 truncate text-muted-fg">
                  — nothing here needs you.
                </span>
                <span className="num shrink-0 text-[12px] text-dim group-open:hidden">Show anyway</span>
                <span className="num hidden shrink-0 text-[12px] text-dim group-open:inline">Hide</span>
              </summary>
              <ul className="mt-4 grid list-none gap-3 p-0">
                {firstOfKind(forwarded).map(({ source, explain }) => (
                  <SourceCard key={`${source.sourceIp}-${source.verdict.kind}`} source={source} total={messages} explain={explain} />
                ))}
              </ul>
            </details>
          ) : null}
        </>
      ) : (
        <>
          <h1 className="mt-4 max-w-[24ch] text-[clamp(1.95rem,5.4vw,3rem)] leading-[1.02] tracking-[-0.04em]">
            Publish this, then come back tomorrow.
          </h1>
          <p className="mt-5 max-w-[60ch] text-[1.02rem] leading-relaxed text-muted-fg">
            Receivers batch aggregate reports every 24 hours, so this page will stay empty until the
            first one arrives. That is normal and it is not a sign anything is wrong.
          </p>
        </>
      )}

      <section className={cn("border-t pt-10", reports.length ? "mt-16" : "mt-12")}>
        <h2 className="text-[1.2rem] tracking-tight">
          {reports.length ? "Your reporting address" : "One record, at your DNS host"}
        </h2>

        {suggested ? (
          <CopyField
            className="mt-5"
            label="TXT · _dmarc"
            value={suggested}
            note={
              published
                ? "Your existing record with our address appended. Replace the current _dmarc value with this — the rua tag takes a comma-separated list, so whatever you already use keeps working."
                : "You publish no DMARC record today, so this is a complete one. p=none is monitoring: it changes nothing about delivery and starts the reports."
            }
          />
        ) : (
          <p className="mt-4 max-w-[60ch] text-[14px] leading-relaxed text-live">
            Reporting is not switched on right now, so no address can be issued. Nothing is wrong
            with your setup.
          </p>
        )}

        <p className="mt-6 max-w-[64ch] text-[13.5px] leading-relaxed text-dim">
          <b className="text-muted-fg">This URL is the key.</b> There is no account, so anyone with
          this link can read these results. Bookmark it, and treat it like a password.
          {endpoint.lastSeenAt
            ? ` Last report received ${fmtDate(endpoint.lastSeenAt.slice(0, 10))}.`
            : ""}
        </p>

        {reports.length && reports[0].domain !== endpoint.domain ? (
          <p className="mt-4 max-w-[64ch] rounded-lg border border-soon/40 bg-soon-bg p-4 text-[13.5px] leading-relaxed">
            These reports are about <span className="num">{reports[0].domain}</span>, and you asked
            about <span className="num">{endpoint.domain}</span>. The receiver is the authority on
            what it saw, so the rows are shown as sent rather than filtered to match.
          </p>
        ) : null}
      </section>

      <p className="mt-10 text-[13.5px] text-dim">
        <Link href="/how-email-works/dmarc" className="underline underline-offset-3 hover:text-fg">
          What DMARC actually does
        </Link>
        {" · "}
        <Link href="/check" className="underline underline-offset-3 hover:text-fg">
          Check this domain live
        </Link>
      </p>
    </div>
  );
}
