import { fmtDate } from "@/lib/format";
import { SITE } from "@/lib/site";

/**
 * The certification mark, drawn by hand.
 *
 * This is written as raw SVG rather than rendered through ImageResponse
 * because it has to survive being loaded through an <img> on a stranger's
 * page. In that context the file cannot fetch a webfont, cannot run script and
 * cannot reach back to this origin for anything at all, so every glyph lands
 * in whatever face the reader's machine substitutes for a generic stack. The
 * layout is therefore budgeted against the widest plausible substitution
 * rather than against the font it was designed in, and the one string we do
 * not control — the domain — is pinned to a computed width so that it cannot
 * escape the box no matter what it is set in.
 *
 * There is no score, no grade and no percentage here for the same reason there
 * is none on /check: two tools scoring the same campaign 85 and 40 is why
 * nobody trusts this category. A mark that could only ever say "verified"
 * would be marketing, so the unflattering states are first-class and read in
 * exactly the words the result page uses.
 */

export const BADGE = { width: 320, height: 88 } as const;

export type BadgeTone = "ok" | "warn" | "fail" | "unknown";

export interface BadgeInput {
  domain: string;
  /** ISO yyyy-mm-dd. An undated mark asserts nothing, so it is never optional. */
  date: string;
  tone: BadgeTone;
  verdict: string;
}

/* Literals off globals.css. An SVG handed to a third-party page has no access
   to this site's custom properties, so the palette travels with it. */
const PAPER = "#fafaf7";
const HAIRLINE = "#e5e5df";
const INK = "#141416";
const DIM = "#91918a";
const ACCENT = "#1d3fd0";

const TONE: Record<BadgeTone, { dot: string; text: string }> = {
  ok: { dot: "#0f6b3f", text: "#0f6b3f" },
  warn: { dot: "#855608", text: "#855608" },
  fail: { dot: "#b8241c", text: "#b8241c" },
  /* A resolver that did not answer is our failure, not the domain's. Painting
     that red would print an unflattering claim about a domain we never read. */
  unknown: { dot: DIM, text: "#63635e" },
};

const PAD = 14;
const INNER = BADGE.width - PAD * 2;
const RIGHT = BADGE.width - PAD;

/**
 * The verdict, in the result page's own words.
 *
 * /check/<domain> says "Nothing to fix on authentication" or "N things to fix,
 * M worth a look". The badge says the same thing, because a mark and the page
 * it links to that disagree with each other is worse than no mark at all.
 */
export function verdictFor(fails: number, warns: number): { verdict: string; tone: BadgeTone } {
  if (fails === 0 && warns === 0) {
    return { verdict: "Nothing to fix on authentication", tone: "ok" };
  }
  const head = fails > 0 ? `${fails} thing${fails > 1 ? "s" : ""} to fix` : "Nothing broken";
  const tail = warns > 0 ? `, ${warns} worth a look` : "";
  return { verdict: head + tail, tone: fails > 0 ? "fail" : "warn" };
}

/**
 * XML 1.0 cannot represent most control characters, so one arriving in a
 * string would make the document unparseable rather than merely ugly. They are
 * dropped in the same pass that escapes the five entities.
 */
function xml(s: string): string {
  let out = "";
  for (const ch of s) {
    const code = ch.codePointAt(0) ?? 0;
    if (code < 0x20 || code === 0x7f) continue;
    out +=
      ch === "&"
        ? "&amp;"
        : ch === "<"
          ? "&lt;"
          : ch === ">"
            ? "&gt;"
            : ch === '"'
              ? "&quot;"
              : ch === "'"
                ? "&apos;"
                : ch;
  }
  return out;
}

const round = (n: number) => Math.round(n * 10) / 10;

export function renderBadge({ domain, date, tone, verdict }: BadgeInput): string {
  const t = TONE[tone];

  /* Domains have no length limit worth trusting, and a mark that quietly runs
     off its own edge is the failure mode this whole file is arranged against.
     Stepping the size down keeps every real sending domain whole; truncation
     is the last resort, because half a domain on a certification mark is not
     a smaller claim, it is a different one. */
  const shown = domain.length > 57 ? `${domain.slice(0, 56)}…` : domain;
  const domainSize = [14, 12.5, 11, 9.5, 8.5].find((s) => shown.length * s * 0.6 <= INNER) ?? 8.5;
  /* A monospace advance is 0.6em in every face we are likely to be handed, but
     "likely" is not a guarantee on someone else's laptop, so the domain is
     pinned to the width it was budgeted rather than trusted to fit it. */
  const runLength = round(Math.min(shown.length * domainSize * 0.6, INNER));
  const verdictSize = verdict.length <= 40 ? 10 : 9;

  /* "Verified" would be a lie about a check that never completed. */
  const stamp = `${tone === "unknown" ? "AS OF" : "VERIFIED"} ${fmtDate(date).toUpperCase()}`;
  const href = `${SITE.url}/check/${domain}`;
  /* A colon rather than a dash: the unverified verdict already contains an em
     dash, and two in one sentence reads as a stutter in a screen reader. */
  const label = `${domain}: ${verdict}. ${tone === "unknown" ? "Checked" : "Verified"} ${fmtDate(date)} by ${SITE.name}.`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${BADGE.width}" height="${BADGE.height}" viewBox="0 0 ${BADGE.width} ${BADGE.height}" role="img" aria-labelledby="badge-title badge-desc">
<title id="badge-title">${xml(label)}</title>
<desc id="badge-desc">${xml(`A live SPF, DKIM and DMARC check. Full result, with the dated rule behind every finding, at ${href}. Findings, never a score.`)}</desc>
<style><![CDATA[
text{font-family:ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,"Liberation Mono",monospace}
.mark{font-size:8.5px;font-weight:600;fill:${INK};letter-spacing:-.01em}
.scope{font-size:6.5px;font-weight:500;letter-spacing:.09em;fill:${DIM}}
.domain{font-weight:600;fill:${INK}}
.verdict{font-family:system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;font-weight:500}
.foot{font-size:6.5px;font-weight:500;letter-spacing:.085em;fill:${DIM};font-variant-numeric:tabular-nums}
]]></style>
<a href="${xml(href)}" target="_blank" rel="noopener">
<rect x=".5" y=".5" width="${BADGE.width - 1}" height="${BADGE.height - 1}" rx="8" fill="${PAPER}" stroke="${HAIRLINE}"/>
<text class="mark" x="${PAD}" y="21">emailrules<tspan fill="${ACCENT}">.today</tspan></text>
<text class="scope" x="${RIGHT}" y="21" text-anchor="end">SPF · DKIM · DMARC</text>
<text class="domain" x="${PAD}" y="45" font-size="${domainSize}" textLength="${runLength}" lengthAdjust="spacingAndGlyphs">${xml(shown)}</text>
<circle cx="${PAD + 3.1}" cy="58.6" r="3.1" fill="${t.dot}"/>
<text class="verdict" x="26.5" y="62" font-size="${verdictSize}" fill="${t.text}">${xml(verdict)}</text>
<path d="M${PAD} 70.5H${RIGHT}" stroke="${HAIRLINE}"/>
<text class="foot" x="${PAD}" y="82">${xml(stamp)}</text>
<text class="foot" x="${RIGHT}" y="82" text-anchor="end">FINDINGS, NOT A SCORE</text>
</a>
</svg>
`;
}
