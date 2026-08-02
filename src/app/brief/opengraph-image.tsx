import { ImageResponse } from "next/og";
import { getAllRules } from "@/lib/rules";
import { briefCounts } from "@/lib/rule-signals";
import { fmtDate } from "@/lib/format";

export const alt = "A one-page brief: what needs a person, what is already handled, and the five rules to open first";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/* The card prints a date and a set of counts, and both move. Static generation
   would freeze whatever was true the last time the site was deployed. */
export const revalidate = 3600;

/* The palette from globals.css. */
const BG = "#fafaf7";
const INK = "#141416";
const MUTED = "#63635e";
const DIM = "#91918a";
const ACCENT = "#1d3fd0";
const HAIRLINE = "#e5e5df";

/**
 * The share card for the brief.
 *
 * Once the Slack message carries exactly one URL, this unfurl is the whole
 * advertisement — so it has to say what the page is in one look: a dated sheet
 * of what needs a person, not a dashboard.
 *
 * What it cannot say is which filter the sharer used. `/brief` keeps its state
 * in the query string, and Next hands a metadata image route the dynamic route
 * params only — the request, and with it the query, is discarded before the
 * handler runs. So the counts here are the whole shelf, and they are labelled
 * as the whole shelf. A card that guessed a role would be wrong for every
 * filtered link anyone actually shares.
 *
 * No score, no grade, no percentage. This is the most tempting place on the
 * site to invent one — a share card wants a single triumphant number — and it
 * is the place where inventing one would do the most damage, because the card
 * travels further than the page it links to.
 */
export default async function Image() {
  const rules = await getAllRules();
  const c = briefCounts(rules);
  const today = fmtDate(new Date().toISOString().slice(0, 10));

  /* One accent, spent on the only figure that asks someone to do something. */
  const tallies: { n: number; label: string; lead: boolean }[] = [
    { n: c.act, label: "need a person", lead: true },
    { n: c.shared, label: "shared with your email tool", lead: false },
    { n: c.handled + c.fyi, label: "handled or FYI", lead: false },
    { n: c.upcoming, label: "upcoming", lead: false },
  ];

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
            <span>One-page brief</span>
            <span>·</span>
            <span>As of {today}</span>
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 44,
              fontSize: 82,
              lineHeight: 1.02,
              letterSpacing: "-0.04em",
              fontWeight: 700,
              color: INK,
            }}
          >
            Open these five first
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 22,
              fontSize: 30,
              lineHeight: 1.3,
              letterSpacing: "-0.02em",
              color: MUTED,
              maxWidth: 940,
            }}
          >
            Filtered to your role, your countries and your sending tool. Whose job each rule is, and
            what to do about it first.
          </div>

          {/* The counts are the page in miniature. They are stated as the whole
              shelf because the card cannot know the sharer's filter, and a
              number without its denominator is how a score gets born. */}
          {/* Wraps rather than clips: the shelf grows, and a three-digit count
              on the last tally is the kind of thing that silently runs off the
              edge of a card nobody looks at again. */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 26,
              marginTop: 40,
              maxWidth: 1056,
            }}
          >
            {tallies.map((t) => (
              <div key={t.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    display: "flex",
                    width: 11,
                    height: 11,
                    borderRadius: 999,
                    background: t.lead ? ACCENT : DIM,
                  }}
                />
                <span style={{ fontSize: 24, fontWeight: 600, color: INK }}>{t.n}</span>
                <span style={{ fontSize: 24, color: MUTED }}>{t.label}</span>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", marginTop: 18, fontSize: 21, color: DIM }}>
            Across all {c.total} rules on the shelf — the page narrows them to your setup.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: `1px solid ${HAIRLINE}`,
            paddingTop: 22,
            fontSize: 22,
            color: DIM,
          }}
        >
          <span>Dated rules with primary sources. No placement scores, ever.</span>
          <span>Free · no account · print or paste</span>
        </div>
      </div>
    ),
    size,
  );
}
