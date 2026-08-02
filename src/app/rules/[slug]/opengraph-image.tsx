import { ImageResponse } from "next/og";
import { getRule, fmtDate } from "@/lib/rules";
import { OWNERSHIP, STATUS_LABEL } from "@/lib/types";

export const alt = "A dated, cited email rule";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * The share card.
 *
 * A link to a rule used to preview as nothing at all. The card leads with the
 * date and whose job it is, because those are the two facts that make someone
 * click: currency, and whether it is their problem.
 */
export default async function Image({ params }: { params: { slug: string } }) {
  const rule = await getRule(params.slug);

  const accent = "#2347d9";
  const ink = "#0e0f13";
  const muted = "#71717f";

  if (!rule) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#fdfdfb",
            fontSize: 48,
            color: ink,
          }}
        >
          emailrules.today
        </div>
      ),
      size,
    );
  }

  const own = OWNERSHIP[rule.ownership].label;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#fdfdfb",
          padding: "64px 72px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 22, color: muted }}>
            <span style={{ color: ink, fontWeight: 700 }}>
              emailrules<span style={{ color: accent }}>.today</span>
            </span>
            <span>·</span>
            <span>{STATUS_LABEL[rule.status]}</span>
            <span>·</span>
            <span>{rule.jurisdictions.join(" · ")}</span>
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 40,
              fontSize: rule.title.length > 70 ? 54 : 66,
              lineHeight: 1.08,
              letterSpacing: "-0.035em",
              fontWeight: 700,
              color: ink,
              maxWidth: 1000,
            }}
          >
            {rule.title}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", fontSize: 26, color: accent, fontWeight: 600 }}>{own}</div>
            <div style={{ display: "flex", fontSize: 22, color: muted }}>
              Last verified {fmtDate(rule.lastVerified)}
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 22, color: muted }}>
            {rule.sources.length} primary source{rule.sources.length === 1 ? "" : "s"}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
