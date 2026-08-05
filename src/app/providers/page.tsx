import type { Metadata } from "next";
import Link from "next/link";
import { PROVIDERS, WATCHED_PROVIDERS, providerSources } from "@/content/providers";
import { SITE } from "@/lib/site";
import { fmtDate } from "@/lib/rules";
import { SiteFaqJsonLd } from "@/components/site-faq";

const TITLE = "What Gmail, Yahoo, Microsoft and Apple actually said";
const DESCRIPTION =
  "Every published sender requirement, threshold and delisting path per mailbox provider — with the exact words and a link — plus, separately, the things the industry repeats that no provider has ever said.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/providers" },
  openGraph: {
    type: "website",
    title: TITLE,
    description: DESCRIPTION,
    url: `${SITE.url}/providers`,
    siteName: SITE.name,
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default function ProvidersIndex() {
  const myths = PROVIDERS.reduce((n, p) => n + p.neverSaid.length, 0);
  const quotes = PROVIDERS.reduce(
    (n, p) => n + p.saidPublicly.filter((c) => c.verbatim).length,
    0,
  );
  const sources = providerSources().length;
  const undated = providerSources().filter((s) => !s.published).length;

  return (
    <div className="shell shell-tight py-12 sm:py-16">
      <SiteFaqJsonLd />

      <p className="label">Mailbox providers · verified 4 Aug 2026</p>
      <h1 className="mt-4 max-w-[20ch] text-[clamp(2rem,5.6vw,3.2rem)] leading-[1.02] tracking-[-0.04em]">
        What they actually said. And what they never did.
      </h1>

      <p className="mt-6 max-w-[62ch] text-[1.04rem] leading-relaxed text-muted-fg">
        Nobody outside Google knows how Gmail filters mail, and every page claiming to explain the
        algorithm is either restating the published guidelines or inventing. So this does the
        opposite. For each provider: the requirements and numbers it printed, in its own words —
        and, given the same weight, the things this industry repeats that the provider has never
        said anywhere.
      </p>

      {/* The figures that make the claim checkable rather than assertive. */}
      <div className="mt-9 grid gap-px border-y bg-border sm:grid-cols-4">
        {[
          { v: String(PROVIDERS.length), k: "providers" },
          { v: String(quotes), k: "verbatim quotes" },
          { v: String(myths), k: "claims nobody made" },
          { v: `${undated}/${sources}`, k: "sources printing no date" },
        ].map((f) => (
          <div key={f.k} className="bg-bg px-5 py-6">
            <span className="num block text-[1.9rem] leading-none font-semibold tracking-tight">
              {f.v}
            </span>
            <span className="mt-2.5 block text-[13px] text-muted-fg">{f.k}</span>
          </div>
        ))}
      </div>

      <p className="mt-4 max-w-[62ch] text-[13px] leading-relaxed text-dim">
        That last figure is the uncomfortable one and it stays on the page. Google&rsquo;s help
        centre and Yahoo&rsquo;s sender hub print no publication date on the pages that carry their
        requirements, so none is claimed here. A reference that invents a plausible date to look
        rigorous has stopped being one.
      </p>

      <ul className="mt-12 list-none border-t p-0">
        {PROVIDERS.map((p) => (
          <li key={p.id} className="border-b">
            <Link href={`/providers/${p.id}`} className="block py-6 hover:bg-muted/40">
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                <h2 className="text-[1.15rem] font-semibold tracking-tight">{p.name}</h2>
                <span className="num text-[12px] text-dim">
                  {p.saidPublicly.length} stated · {p.neverSaid.length} never said ·{" "}
                  {p.delisting.length} removal {p.delisting.length === 1 ? "path" : "paths"}
                </span>
              </div>
              <p className="mt-2 max-w-[64ch] text-[14.5px] leading-relaxed text-muted-fg">
                {p.what}
              </p>
              {p.neverSaid[0] ? (
                <p className="mt-2.5 max-w-[64ch] text-[13.5px] leading-relaxed text-dim">
                  <span className="text-fg">Never said:</span> {p.neverSaid[0].myth}
                </p>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>

      {/* The refusal, which is what makes the rest mean anything. */}
      <section className="mt-14">
        <h2 className="text-[1.15rem] font-semibold tracking-tight">
          Opened, with nothing to publish
        </h2>
        <p className="mt-2 max-w-[62ch] text-[14px] leading-relaxed text-muted-fg">
          These were looked at during this review and produced nothing that met the bar. The reason
          matters more than the absence, so each one says why. A delisting path published from
          memory is how a reference gets somebody&rsquo;s mail permanently blocked.
        </p>
        <ul className="mt-5 list-none border-t p-0">
          {WATCHED_PROVIDERS.map((w) => (
            <li key={w.name} className="grid gap-x-8 gap-y-1 border-b py-4 sm:grid-cols-[14rem_1fr]">
              <span className="text-[14.5px] font-medium">{w.name}</span>
              <span className="text-[14px] leading-relaxed text-muted-fg">{w.reason}</span>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-10 border-t pt-5 text-[13px] leading-relaxed text-dim">
        A provider missing, a quote wrong, or a delisting path that has moved?{" "}
        <a
          href="/corrections#report"
          className="underline underline-offset-3 hover:text-fg"
        >
          {SITE.contact}
        </a>
        . How a claim gets onto this site at all is on{" "}
        <Link href="/methodology" className="underline underline-offset-3 hover:text-fg">
          methodology
        </Link>
        ; the same discipline applied to blocklists is the{" "}
        <Link href="/blocklists" className="underline underline-offset-3 hover:text-fg">
          census
        </Link>
        . Last verified {fmtDate("2026-08-04")}.
      </p>
    </div>
  );
}
