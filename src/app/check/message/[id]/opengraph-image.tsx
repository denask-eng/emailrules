import { ImageResponse } from "next/og";
import type { Severity } from "@/lib/dns-check";
import { fmtDate } from "@/lib/format";
import { isCheckId, loadMessageCheck } from "@/lib/message-check";

export const alt = "A check of a real campaign — findings with dated rules, never a score";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/* The card and the page it advertises read the same row, so they cannot
   disagree with each other in someone's Slack channel. */
export const dynamic = "force-dynamic";

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

function Bare(line: string) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 18,
          background: BG,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 46, fontWeight: 700 }}>
          <span style={{ color: INK }}>emailrules</span>
          <span style={{ color: ACCENT }}>.today</span>
        </div>
        <div style={{ display: "flex", fontSize: 26, color: MUTED }}>{line}</div>
      </div>
    ),
    size,
  );
}

/**
 * The share card for a message check.
 *
 * What travels is the sending domain, the date and the counts of dated
 * findings. Never a number out of a hundred: the whole argument of this site
 * is that scores are why nobody trusts deliverability tooling, so a card
 * carrying a grade would advertise the opposite of the page it links to.
 */
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isCheckId(id)) return Bare("Findings, not a score");

  let check;
  try {
    check = await loadMessageCheck(id);
  } catch {
    return Bare("Findings, not a score");
  }
  if (!check) return Bare("Waiting for a message");

  const count = (severity: Severity) =>
    check.findings.filter((finding) => finding.severity === severity).length;
  const fails = count("fail");
  const warns = count("warn");

  const tallies = [
    { n: fails, label: "to fix", colour: TONE.fail },
    { n: warns, label: "worth a look", colour: TONE.warn },
    { n: count("pass"), label: "fine", colour: TONE.pass },
    { n: count("info"), label: "context", colour: DIM },
  ].filter((tally) => tally.n > 0);

  const headline = check.fromDomain ?? "A real campaign";
  const checkedOn = check.createdAt.slice(0, 10);

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
            <span>Campaign check</span>
            <span>·</span>
            <span>Read {fmtDate(checkedOn)}</span>
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 44,
              fontSize: headline.length > 28 ? 62 : 82,
              lineHeight: 1.02,
              letterSpacing: "-0.04em",
              fontWeight: 700,
              color: INK,
            }}
          >
            {headline}
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
            {check.verdict}
          </div>

          {/* The counts sit with the verdict, not in the footer. They are the
              evidence for the sentence above them, and a card that separates a
              claim from its figures is how a score gets born. */}
          <div style={{ display: "flex", alignItems: "center", gap: 30, marginTop: 34 }}>
            {tallies.map((tally) => (
              <div key={tally.label} style={{ display: "flex", alignItems: "center", gap: 11 }}>
                <div
                  style={{
                    display: "flex",
                    width: 12,
                    height: 12,
                    borderRadius: 999,
                    background: tally.colour,
                  }}
                />
                <span style={{ fontSize: 26, fontWeight: 600, color: INK }}>{tally.n}</span>
                <span style={{ fontSize: 26, color: MUTED }}>{tally.label}</span>
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
          <span>Read off a real message. Every finding names a dated rule and whose job it is.</span>
          <span>Free · no account</span>
        </div>
      </div>
    ),
    size,
  );
}
