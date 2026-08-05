import type { Metadata } from "next";
import Link from "next/link";
import { latestPerEsp, MEASURED_FIELDS } from "@/lib/esp-truth";
import { ESP_OPTIONS, espLabel, type EspId } from "@/lib/audience";
import { fmtDate } from "@/lib/format";
import { SITE } from "@/lib/site";
import { Signal } from "@/components/signal";

export const metadata: Metadata = {
  title: "The ESP truth table",
  description:
    "What each email platform actually does with your message, measured by sending a real campaign through it and reading the headers that arrived — not what its help centre says. One-click unsubscribe, DKIM alignment, tracking pixels and postal address, per platform, with a date.",
  alternates: { canonical: "/esp-truth" },
};

export const revalidate = 3600;

/**
 * The ESP truth table.
 *
 * The site's `ownership` field says most of what sounds like your job is your
 * platform's job. That claim is currently editorial — argued from vendor
 * documentation, which lags, omits and occasionally is wrong. This page is the
 * plan to settle it by measurement instead, and it will not pretend to have
 * done so before it has.
 */
export default async function EspTruthPage() {
  const measured = await latestPerEsp();
  const platforms = ESP_OPTIONS.filter((o) => o.id && o.id !== "other");

  return (
    <div className="shell py-12 sm:py-16">
      <p className="label">The ESP truth table</p>
      <h1 className="mt-4 max-w-[20ch] text-[clamp(2rem,5.6vw,3.2rem)] leading-[1.02] tracking-[-0.04em]">
        What your platform actually does.
      </h1>
      <p className="mt-6 max-w-[64ch] text-[1.04rem] leading-relaxed text-muted-fg">
        Not what its help centre says. One real campaign sent through each platform, and the headers
        that arrived read back verbatim — whether the unsubscribe pair was really set, whether DKIM
        really aligned, whether a pixel really went in.
      </p>

      {measured.length === 0 ? (
        <section className="mt-10 rounded-2xl border border-soon/30 bg-soon-bg px-5 py-6 sm:px-7">
          <p className="flex items-center gap-2 text-[1.05rem] font-semibold text-soon">
            <Signal state="pend" size={10} />
            Nothing has been measured yet.
          </p>
          <p className="mt-3 max-w-[70ch] text-[14.5px] leading-relaxed">
            This table is empty, and it will stay empty until a real campaign has been sent through
            a real account on each platform. Filling it from seven help centres would take an
            afternoon and would look identical to the real thing — while being precisely the
            artefact it exists to replace.
          </p>
          <p className="mt-3 max-w-[70ch] text-[14.5px] leading-relaxed">
            A measured table with three rows settles an argument. A documented table with seventy
            starts one.
          </p>
        </section>
      ) : null}

      {/* ── What gets measured, published before the measuring ────────── */}
      <section className="mt-12">
        <h2 className="text-[1.15rem] tracking-tight">What is measured, and why</h2>
        <p className="mt-1.5 max-w-[62ch] text-[13.5px] leading-relaxed text-muted-fg">
          Stated in advance so the method cannot be adjusted afterwards to suit a result.
        </p>
        <ul className="mt-5 list-none border-t p-0">
          {MEASURED_FIELDS.map((f) => (
            <li key={String(f.key)} className="border-b py-4">
              <h3 className="num text-[14px] font-medium">{f.label}</h3>
              <p className="mt-1.5 max-w-[68ch] text-[13.5px] leading-relaxed text-muted-fg">
                {f.why}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* ── The table ─────────────────────────────────────────────────── */}
      <section className="mt-12">
        <h2 className="text-[1.15rem] tracking-tight">The platforms</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b-2 border-fg/20">
                <th className="label py-2 pr-4 text-left">Platform</th>
                {MEASURED_FIELDS.map((f) => (
                  <th key={String(f.key)} className="label py-2 pr-3 text-left" title={f.why}>
                    {f.label}
                  </th>
                ))}
                <th className="label py-2 text-right">Measured</th>
              </tr>
            </thead>
            <tbody>
              {platforms.map((p) => {
                const m = measured.find((x) => x.esp === p.id);
                return (
                  <tr key={p.id} className="border-b border-border-soft">
                    <td className="py-2.5 pr-4 font-medium">{espLabel(p.id as EspId) || p.id}</td>
                    {MEASURED_FIELDS.map((f) => {
                      const v = m ? (m[f.key] as boolean | null) : null;
                      return (
                        <td key={String(f.key)} className="py-2.5 pr-3">
                          {v === null || v === undefined ? (
                            <span className="inline-flex items-center gap-1.5 text-dim">
                              <Signal state="na" size={8} label={false} />
                              <span className="num text-[11.5px]">not measured</span>
                            </span>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-1.5 ${v ? "text-ok" : "text-live"}`}
                            >
                              <Signal state={v ? "pass" : "fail"} size={8} label={false} />
                              <span className="num text-[11.5px]">{v ? "yes" : "no"}</span>
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td className="num py-2.5 text-right text-[11.5px] text-dim">
                      {m ? fmtDate(m.measuredOn) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 max-w-[64ch] text-[12.5px] leading-relaxed text-dim">
          &ldquo;Not measured&rdquo; means exactly that. It is not a guess, not a default, and not
          an inference from documentation — the cell stays empty until a message has arrived and
          been read.
        </p>
      </section>

      {measured.length ? (
        <section className="mt-12">
          <h2 className="text-[1.15rem] tracking-tight">How each reading was obtained</h2>
          <ul className="mt-4 list-none border-t p-0">
            {measured.map((m) => (
              <li key={m.id} className="border-b py-3.5">
                <p className="text-[14px] font-medium">
                  {espLabel(m.esp as EspId) || m.esp}
                  <span className="num ml-2 text-[12px] font-normal text-dim">
                    {fmtDate(m.measuredOn)}
                  </span>
                </p>
                <p className="mt-1 max-w-[70ch] text-[13px] leading-relaxed text-muted-fg">
                  {m.method}
                </p>
                {m.note ? (
                  <p className="mt-1 max-w-[70ch] text-[12.5px] leading-relaxed text-dim">{m.note}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-12 rounded-2xl border bg-bg-2 px-5 py-6 sm:px-7">
        <h2 className="text-[1.05rem] tracking-tight">What this will never be</h2>
        <p className="mt-3 max-w-[70ch] text-[14.5px] leading-relaxed text-muted-fg">
          A ranking. Platforms make different trade-offs for different customers, and a table that
          scored them would be an affiliate page with extra steps — which is the one thing this
          site has never been. Each cell is a fact about one message on one date, and nothing here
          adds them up into a winner.
        </p>
        <p className="mt-3 max-w-[70ch] text-[14.5px] leading-relaxed text-muted-fg">
          A measurement is also not permanent. Platforms ship. Every row carries the date it was
          taken, and an old row is reported as old rather than quietly refreshed.
        </p>
      </section>

      <p className="mt-10 flex flex-wrap gap-x-5 gap-y-2 border-t pt-5 text-[13px] text-muted-fg">
        <Link href="/esp" className="underline underline-offset-3 hover:text-fg">
          What each platform has shipped
        </Link>
        <Link href="/email-index" className="underline underline-offset-3 hover:text-fg">
          The authentication index
        </Link>
        <Link href="/methodology" className="underline underline-offset-3 hover:text-fg">
          How we measure
        </Link>
        <a
          href="/corrections#report"
          className="underline underline-offset-3 hover:text-fg"
        >
          Tell us we are wrong
        </a>
      </p>
    </div>
  );
}
