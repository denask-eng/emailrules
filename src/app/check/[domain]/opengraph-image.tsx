import { ImageResponse } from "next/og";
import { checkBlocklists } from "@/lib/blocklist-check";
import { checkDomain, normaliseDomain } from "@/lib/dns-check";
import type { Finding, Severity } from "@/lib/dns-check";
import { fmtDate } from "@/lib/format";

export const alt = "A live authentication and blocklist check — findings, not a score";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/* Same window as the page, so a card and the result it advertises cannot
   disagree with each other in someone's Slack channel. */
export const revalidate = 300;

/* The palette from globals.css. Status colours only ever appear next to a
   count they describe. */
const BG = "#fafaf7";
const INK = "#141416";
const MUTED = "#63635e";
const DIM = "#91918a";
const ACCENT = "#1d3fd0";
const TONE: Record<Exclude<Severity, "info">, string> = {
  fail: "#b8241c",
  warn: "#855608",
  pass: "#0f6b3f",
};

function Bare() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: BG,
          fontSize: 48,
          color: INK,
          fontFamily: "sans-serif",
        }}
      >
        emailrules.today
      </div>
    ),
    size,
  );
}

/**
 * The share card for a check result.
 *
 * This is the one page on the site built to be pasted into a Slack channel,
 * and it used to unfurl as a bare link. What travels here is the domain, the
 * date and the counts — never a number out of a hundred. The whole argument
 * of this site is that scores are why nobody trusts deliverability tooling,
 * so a share card carrying a grade would advertise the opposite of the thing
 * it links to. Counts of dated findings are the honest version, and "findings,
 * not a score" is printed on the card so the refusal reads as a position
 * rather than an omission.
 */
export default async function Image({ params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params;
  const d = normaliseDomain(decodeURIComponent(domain));
  if (!d) return Bare();

  let result;
  let findings: Finding[];
  try {
    /* Both halves, because the page shows both. A card that counted only the
       authentication findings would contradict the result it links to, in
       somebody else's Slack channel, where neither of us can correct it. */
    const [dns, blocklist] = await Promise.all([checkDomain(d), checkBlocklists(d)]);
    result = dns;
    findings = [...dns.findings, ...blocklist.findings];
  } catch {
    return Bare();
  }

  const count = (s: Severity) => findings.filter((f) => f.severity === s).length;
  const fails = count("fail");
  const warns = count("warn");
  const passes = count("pass");
  const infos = count("info");

  const verdict =
    fails === 0 && warns === 0
      ? "Nothing to fix on authentication or reputation."
      : `${fails > 0 ? `${fails} thing${fails > 1 ? "s" : ""} to fix` : "Nothing broken"}${
          warns > 0 ? `, ${warns} worth a look` : ""
        }.`;

  const tallies: { n: number; label: string; colour: string }[] = [
    { n: fails, label: "to fix", colour: TONE.fail },
    { n: warns, label: "worth a look", colour: TONE.warn },
    { n: passes, label: "fine", colour: TONE.pass },
    { n: infos, label: "context", colour: DIM },
  ].filter((t) => t.n > 0);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: BG,
          padding: "64px 72px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 22, color: DIM }}>
            <div style={{ display: "flex", fontWeight: 700 }}>
              <span style={{ color: INK }}>emailrules</span>
              <span style={{ color: ACCENT }}>.today</span>
            </div>
            <span>·</span>
            <span>Authentication and blocklists</span>
            <span>·</span>
            <span>Checked {fmtDate(result.checkedAt)}</span>
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 44,
              fontSize: d.length > 28 ? 62 : 82,
              lineHeight: 1.02,
              letterSpacing: "-0.04em",
              fontWeight: 700,
              color: INK,
            }}
          >
            {d}
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 22,
              fontSize: 34,
              lineHeight: 1.25,
              letterSpacing: "-0.02em",
              color: fails > 0 ? TONE.fail : warns > 0 ? TONE.warn : TONE.pass,
              maxWidth: 940,
            }}
          >
            {verdict}
          </div>

          {/* The counts sit with the verdict, not in the footer. They are the
              evidence for the sentence above them, and a card that separates a
              claim from its figures is how a score gets born. */}
          <div style={{ display: "flex", alignItems: "center", gap: 30, marginTop: 34 }}>
            {tallies.map((t) => (
              <div key={t.label} style={{ display: "flex", alignItems: "center", gap: 11 }}>
                <div
                  style={{
                    display: "flex",
                    width: 12,
                    height: 12,
                    borderRadius: 999,
                    background: t.colour,
                  }}
                />
                <span style={{ fontSize: 26, fontWeight: 600, color: INK }}>{t.n}</span>
                <span style={{ fontSize: 26, color: MUTED }}>{t.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid #e5e5df",
            paddingTop: 22,
            fontSize: 22,
            color: DIM,
          }}
        >
          <span>Findings, not a score. Every one names the dated rule it came from.</span>
          <span>Live DNS · free · no account</span>
        </div>
      </div>
    ),
    size,
  );
}
