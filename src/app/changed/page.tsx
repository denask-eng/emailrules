import type { Metadata } from "next";
import { getChangelog } from "@/lib/rules";
import { ChangeRow, SectionHead } from "@/components/bits";
import { changeKind } from "@/lib/rule-signals";

export const metadata: Metadata = {
  title: "What changed",
  description:
    "What actually moved in email rules — market changes first, then pages we newly documented. Re-checks stay quiet.",
  alternates: { canonical: "/changed" },
};

export default async function Changed() {
  const changelog = await getChangelog();

  const market = changelog.filter((c) => {
    const k = changeKind(c.note);
    return k === "market" || k === "correction";
  });
  const documented = changelog.filter((c) => changeKind(c.note) === "added");
  const other = changelog.filter((c) => {
    const k = changeKind(c.note);
    return k !== "market" && k !== "correction" && k !== "added" && k !== "reverify";
  });
  /* Re-verifies intentionally omitted from the main ledger — they are trust
     hygiene, not something to interrupt a marketer for. */

  return (
    <div className="shell shell-tight py-12 sm:py-16">
      <SectionHead
        label="Ledger"
        title="What changed"
        lede="Two different things used to be mixed: the market moved, and we wrote a page. They are separate now. Re-checks that nothing changed stay off this list on purpose."
      />

      <section className="mt-10">
        <h2 className="text-[1.05rem] font-semibold">The market moved</h2>
        <p className="mt-1.5 max-w-[58ch] text-[13.5px] leading-relaxed text-muted-fg">
          Status changes, new obligations, corrections. This is the feed worth coming back for.
        </p>
        {market.length === 0 ? (
          <p className="mt-6 rounded-xl border bg-bg-2 px-5 py-6 text-[0.95rem] text-muted-fg">
            Nothing in this category right now. Quiet is good — we only list real moves.
          </p>
        ) : (
          <ul className="mt-4 list-none border-t p-0">
            {market.map((c) => (
              <ChangeRow
                key={`m-${c.rule.slug}-${c.date}-${c.note}`}
                rule={c.rule}
                date={c.date}
                note={c.note}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="mt-14">
        <h2 className="text-[1.05rem] font-semibold">We documented it</h2>
        <p className="mt-1.5 max-w-[58ch] text-[13.5px] leading-relaxed text-muted-fg">
          Rules that were already true; we added a dated page. Useful for coverage, not the same as
          a new law.
        </p>
        {documented.length === 0 ? (
          <p className="mt-6 text-[0.95rem] text-muted-fg">No new pages in this window.</p>
        ) : (
          <ul className="mt-4 list-none border-t p-0">
            {documented.map((c) => (
              <ChangeRow
                key={`a-${c.rule.slug}-${c.date}-${c.note}`}
                rule={c.rule}
                date={c.date}
                note={c.note}
              />
            ))}
          </ul>
        )}
      </section>

      {other.length > 0 ? (
        <section className="mt-14">
          <h2 className="text-[1.05rem] font-semibold">Other notes</h2>
          <ul className="mt-4 list-none border-t p-0">
            {other.map((c) => (
              <ChangeRow
                key={`o-${c.rule.slug}-${c.date}-${c.note}`}
                rule={c.rule}
                date={c.date}
                note={c.note}
              />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
