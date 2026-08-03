import { ImageResponse } from "next/og";
import { census } from "@/lib/blocklist-check";
import { fmtDate } from "@/lib/format";

export const alt = "A live census of which email blocklists are actually answering";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;

/* The palette from globals.css. */
const BG = "#fafaf7";
const INK = "#141416";
const MUTED = "#63635e";
const DIM = "#91918a";
const ACCENT = "#1d3fd0";
const OK = "#0f6b3f";
const WARN = "#855608";
const BAD = "#b8241c";

/**
 * The card is the post.
 *
 * Three numbers and the sentence that makes them matter. No logo soup, no
 * chart, and above all no score — the whole argument here is that a count of
 * green ticks is what everybody else is selling and what nobody should trust.
 */
export default async function Image() {
  let answering = 0;
  let refusing = 0;
  let silent = 0;
  try {
    const rows = await census();
    answering = rows.filter((r) => r.status === "answered").length;
    refusing = rows.filter((r) => r.status === "refused").length;
    silent = rows.filter((r) => r.status === "silent").length;
  } catch {
    /* Fall through to zeros rather than fail the unfurl entirely. */
  }

  const figures: [number, string, string][] = [
    [answering, "answering today", OK],
    [refusing, "refuse automated queriers", WARN],
    [silent, "publish no test entry", BAD],
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
            <span>Blocklist census</span>
            <span>·</span>
            <span>{fmtDate(new Date().toISOString().slice(0, 10))}</span>
          </div>

          <div
            style={{
              display: "flex",
              fontSize: 62,
              lineHeight: 1.05,
              letterSpacing: "-0.035em",
              fontWeight: 600,
              color: INK,
              marginTop: 34,
              maxWidth: 980,
            }}
          >
            Which email blocklists are actually answering.
          </div>
        </div>

        <div style={{ display: "flex", gap: 72 }}>
          {figures.map(([n, label, colour]) => (
            <div key={label} style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 96, fontWeight: 700, color: colour, letterSpacing: "-0.05em" }}>
                {n}
              </span>
              <span style={{ fontSize: 24, color: MUTED, marginTop: 6, maxWidth: 300 }}>{label}</span>
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            fontSize: 21,
            color: DIM,
            borderTop: `1px solid #e5e5df`,
            paddingTop: 22,
          }}
        >
          <span style={{ maxWidth: 760 }}>
            A dead zone answers NXDOMAIN, exactly like a healthy one. Counting that as a pass is
            how a checker tells you that you are clean.
          </span>
          <span>RFC 5782 · run it yourself</span>
        </div>
      </div>
    ),
    size,
  );
}
