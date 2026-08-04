import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { resolveTxt } from "node:dns/promises";
import { CopyField } from "@/components/copy-field";
import { getEndpoint, isToken, reportAddress, reportsFor, RETENTION_DAYS } from "@/lib/dmarc-store";
import { summarise, type Source, type SourceKind } from "@/lib/dmarc-report";
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

const GROUPS: { kinds: SourceKind[]; title: string; blurb: string; tone: string }[] = [
  {
    kinds: ["unauthenticated", "dkim-broken"],
    title: "Needs you",
    blurb:
      "Nothing here authenticated the way your policy expects. Each row is either a sender you set up and forgot or a setup that was never finished.",
    tone: "text-live",
  },
  {
    kinds: ["aligned"],
    title: "Working",
    blurb: "Both SPF and DKIM aligned. This is your mail, arriving as you intended.",
    tone: "text-ok",
  },
  {
    kinds: ["forwarded"],
    title: "Ignore this",
    blurb:
      "SPF failed and DKIM passed on every one of these. That is a forwarded message, not a forged one — and it is the bulk of what other tools print in red.",
    tone: "text-dim",
  },
];

function Row({ source }: { source: Source }) {
  return (
    <li className="border-b border-border-soft py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <p className="num text-[14.5px] font-medium">{source.sourceIp}</p>
        <p className="num text-[12.5px] text-dim">
          {source.messages.toLocaleString("en-GB")} message{source.messages === 1 ? "" : "s"}
        </p>
      </div>
      <p className="mt-1 text-[13.5px] font-medium">{source.verdict.headline}</p>
      <p className="mt-1.5 max-w-[70ch] text-[13px] leading-relaxed text-muted-fg">
        {source.verdict.detail}
      </p>
      {source.dkimDomains.length || source.spfDomain ? (
        <p className="num mt-2 text-[11.5px] text-dim">
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
  const messages = sources.reduce((total, s) => total + s.messages, 0);

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

  return (
    <div className="shell py-12 sm:py-16">
      <p className="num label">
        {endpoint.domain} · {endpoint.reportCount} report{endpoint.reportCount === 1 ? "" : "s"} ·
        keeping {RETENTION_DAYS} days
      </p>

      {reports.length ? (
        <>
          <h1 className="mt-4 max-w-[22ch] text-[clamp(2rem,6vw,3.4rem)] leading-[1.0] tracking-[-0.045em]">
            {needsYou.length === 0
              ? "Nothing here needs you."
              : `${needsYou.length} thing${needsYou.length === 1 ? "" : "s"} need${needsYou.length === 1 ? "s" : ""} you.`}
          </h1>
          <p className="mt-5 max-w-[62ch] text-[1.02rem] leading-relaxed text-muted-fg">
            {reports.length} report{reports.length === 1 ? "" : "s"} from{" "}
            {new Set(reports.map((r) => r.orgName)).size} receiver
            {new Set(reports.map((r) => r.orgName)).size === 1 ? "" : "s"}, covering{" "}
            {messages.toLocaleString("en-GB")} message{messages === 1 ? "" : "s"}. Your published
            policy is{" "}
            <span className="num text-fg">p={reports[0]?.policy.p ?? "unknown"}</span>
            {reports[0]?.policy.p === "none"
              ? " — monitoring only, which asks receivers to report and instructs them to block nothing."
              : "."}
          </p>

          {GROUPS.map((group) => {
            const rows = sources.filter((s) => group.kinds.includes(s.verdict.kind));
            if (!rows.length) return null;
            return (
              <section key={group.title} className="mt-12">
                <h2 className={cn("num text-[12px] font-medium tracking-[0.07em] uppercase", group.tone)}>
                  {group.title} · {rows.length}
                </h2>
                <p className="mt-2 max-w-[64ch] text-[13.5px] leading-relaxed text-muted-fg">
                  {group.blurb}
                </p>
                <ul className="mt-5 list-none border-t p-0">
                  {rows.map((s) => (
                    <Row key={`${s.sourceIp}-${s.verdict.kind}`} source={s} />
                  ))}
                </ul>
              </section>
            );
          })}
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
