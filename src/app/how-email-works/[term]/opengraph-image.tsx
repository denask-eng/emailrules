import { ImageResponse } from "next/og";
import { GLOSSARY_BY_ID, STAGE_BY_ID, STAGES, OWNER_LABEL } from "@/content/how-email-works";

export const alt = "One email word, in plain English";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/* The palette from globals.css. */
const BG = "#fafaf7";
const INK = "#141416";
const MUTED = "#63635e";
const DIM = "#91918a";
const ACCENT = "#1d3fd0";
const SOFT = "#eef1fc";
const LINE = "#e5e5df";

const OWNER_INK: Record<string, string> = {
  yours: ACCENT,
  shared: "#855608",
  esp: "#0f6b3f",
  context: MUTED,
};

export function generateStaticParams() {
  return Array.from(GLOSSARY_BY_ID.keys()).map((term) => ({ term }));
}

/**
 * The share card for a definition.
 *
 * These pages are pasted into Slack when somebody asks "what does alignment
 * even mean", so what has to travel is the word, the sentence you can repeat
 * out loud, and whose job it is. The say-it-out-loud line is on the card
 * rather than the technical definition on purpose: the person who pastes it
 * is settling an argument, not writing documentation.
 */
export default async function Image({ params }: { params: Promise<{ term: string }> }) {
  const { term } = await params;
  const t = GLOSSARY_BY_ID.get(term);

  if (!t) {
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

  const stage = STAGE_BY_ID.get(t.stage)!;

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
            <span>How email works</span>
            <span>·</span>
            <span>
              Stop {stage.n} of {STAGES.length}, {stage.name.toLowerCase()}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 40,
              fontSize: t.term.length > 22 ? 66 : 86,
              lineHeight: 1.02,
              letterSpacing: "-0.04em",
              fontWeight: 700,
              color: INK,
            }}
          >
            {t.term}
          </div>

          {/* The sentence you can say in a meeting. It is why anyone shares
              this page, so it is the largest thing on the card after the word. */}
          <div
            style={{
              display: "flex",
              marginTop: 26,
              padding: "22px 26px",
              borderRadius: 14,
              background: SOFT,
              border: `1px solid ${ACCENT}33`,
              fontSize: t.sayIt.length > 120 ? 26 : 30,
              lineHeight: 1.35,
              letterSpacing: "-0.015em",
              color: INK,
              maxWidth: 1000,
            }}
          >
            &ldquo;{t.sayIt}&rdquo;
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: `1px solid ${LINE}`,
            paddingTop: 22,
            fontSize: 22,
            color: DIM,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <div
              style={{
                display: "flex",
                width: 12,
                height: 12,
                borderRadius: 999,
                background: OWNER_INK[t.owner] ?? MUTED,
              }}
            />
            <span style={{ color: OWNER_INK[t.owner] ?? MUTED, fontWeight: 600 }}>
              {OWNER_LABEL[t.owner].short}
            </span>
            <span style={{ color: MUTED }}>— {OWNER_LABEL[t.owner].long}</span>
          </div>
          <span>Plain English · free · no account</span>
        </div>
      </div>
    ),
    size,
  );
}
