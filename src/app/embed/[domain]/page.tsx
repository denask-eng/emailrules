import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { normaliseDomain } from "@/lib/dns-check";
import { SITE } from "@/lib/site";
import { BADGE } from "@/app/badge/badge-svg";
import { snippetsFor } from "@/app/embed/snippets";
import { CopyField } from "@/components/copy-field";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

/**
 * One of these exists for every domain anyone types, which is an unbounded
 * space of near-identical pages. /embed is the page worth ranking; this one is
 * a tool, and it says so to crawlers rather than diluting the shelf.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ domain: string }>;
}): Promise<Metadata> {
  const { domain } = await params;
  const d = normaliseDomain(decodeURIComponent(domain));
  if (!d) return { title: "Embed the check" };

  return {
    title: `Embed the check for ${d}`,
    description: `Copy-paste HTML and Markdown for a live, dated authentication badge for ${d}.`,
    robots: { index: false, follow: true },
  };
}

export default async function EmbedFor({ params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params;
  const d = normaliseDomain(decodeURIComponent(domain));
  if (!d) notFound();

  const s = snippetsFor(d);

  return (
    <div className="shell shell-tight py-12 sm:py-16">
      <p className="label">Embeddable mark</p>
      <h1 className="num mt-3 text-[clamp(1.6rem,4.5vw,2.5rem)]">{d}</h1>

      <p className="mt-5 max-w-[60ch] text-[1.04rem] leading-relaxed text-muted-fg">
        This is the live mark for {d}, drawn from the same lookups as the full result. Paste it
        anywhere that renders an image and it re-checks itself.
      </p>

      <div className="mt-8 rounded-xl border bg-card p-5 sm:p-6" style={{ boxShadow: "var(--lift)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- the preview has
            to be the same plain <img> the snippets below hand out. */}
        <img
          src={`/badge/${d}.svg`}
          alt={s.alt}
          width={BADGE.width}
          height={BADGE.height}
          className="block max-w-full"
        />
        <p className="mt-4 max-w-[58ch] text-[12.5px] leading-relaxed text-dim">
          {BADGE.width}×{BADGE.height}, plain SVG, no webfont and nothing fetched. It renders the
          same on a dark page as a light one.
        </p>
      </div>

      <section className="mt-10 space-y-7">
        <CopyField
          label="HTML"
          value={s.html}
          note="The width and height are there so the page does not reflow while the image loads. Keep the link — a mark that asserts without a way to check it is the thing this site exists to argue against."
        />
        <CopyField
          label="Markdown"
          value={s.markdown}
          note="For a README, a Notion page or anything else that speaks Markdown."
        />
        <CopyField
          label="Image URL"
          value={s.image}
          note="If your tool only takes a URL. You lose the link to the result, so put one next to it."
        />
      </section>

      <div className="mt-10 rounded-xl border bg-bg-2 p-5 text-[0.92rem] leading-relaxed text-muted-fg">
        <b className="text-fg">What it says is what the check says.</b> The wording on the mark is
        the wording on the result page, so the two can never disagree in front of a client. If {d}{" "}
        has something to fix, the mark says so — in red, on your page. There is no score on it and
        there never will be.
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href={`/check/${d}`}
          className={cn(buttonVariants(), "h-10 rounded-[10px] px-5 font-medium")}
        >
          See the full result
        </Link>
        <Link
          href="/embed"
          className={cn(buttonVariants({ variant: "outline" }), "h-10 rounded-[10px] px-5")}
        >
          Another domain
        </Link>
      </div>

      <p className="mt-8 max-w-[60ch] text-[12.5px] leading-relaxed text-dim">
        Hotlink it — that is what it is for. {SITE.name} caches the check for six hours and serves
        it stale while it refreshes, so a page with real traffic costs one DNS lookup rather than
        one per reader.
      </p>
    </div>
  );
}
