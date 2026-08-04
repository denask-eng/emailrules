import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PROVIDERS, getProvider, type ProviderMyth } from "@/content/providers";
import { OWNERSHIP } from "@/lib/types";
import type { RuleSource } from "@/lib/types";
import { SITE } from "@/lib/site";
import { fmtDate } from "@/lib/rules";
import { getRule } from "@/lib/rules";

export function generateStaticParams() {
  return PROVIDERS.map((p) => ({ id: p.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const p = getProvider(id);
  if (!p) return { title: "Provider" };

  const title = `${p.name}: what they published, and what they never said`;
  const description = `${p.name}'s stated sender requirements, thresholds and delisting path — quoted with links — plus the claims this industry repeats that ${p.name} has never made anywhere.`;

  return {
    title,
    description,
    alternates: { canonical: `/providers/${p.id}` },
    openGraph: {
      type: "article",
      title,
      description,
      url: `${SITE.url}/providers/${p.id}`,
      siteName: SITE.name,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

/**
 * A citation, rendered the same way everywhere on this page.
 *
 * The date is the substance, so a source that carries none says so rather than
 * leaving a blank a reader would fill in with an assumption of freshness.
 */
function Cite({ source }: { source: RuleSource }) {
  return (
    <p className="mt-2 text-[12.5px] leading-relaxed text-dim">
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-3 hover:text-fg"
      >
        {source.name}
      </a>
      {source.published ? (
        <> · {fmtDate(source.published)}</>
      ) : (
        <> · publisher states no date</>
      )}
    </p>
  );
}

/** The provider's own words, set as evidence rather than as prose. */
function Verbatim({ children }: { children: string }) {
  return (
    <blockquote className="num mt-2.5 border-l-2 border-fg/25 py-0.5 pl-3.5 text-[0.8rem] leading-relaxed text-fg">
      {children}
    </blockquote>
  );
}

async function MythRow({ myth }: { myth: ProviderMyth }) {
  const rule = myth.rule ? await getRule(myth.rule) : null;
  return (
    <li className="border-b py-6">
      {/* The claim, struck through, because seeing it crossed out is the
          argument — the same device the explainer uses on the twelve terms
          that are not your problem. */}
      <p className="text-[1.02rem] leading-snug font-semibold text-dim line-through decoration-live/70 decoration-2">
        {myth.myth}
      </p>
      <p className="mt-2.5 max-w-[64ch] text-[0.95rem] leading-relaxed text-muted-fg">
        {myth.correction}
      </p>
      {myth.verbatim ? <Verbatim>{`“${myth.verbatim}”`}</Verbatim> : null}
      {myth.source ? <Cite source={myth.source} /> : null}
      {rule ? (
        <p className="mt-2 text-[12.5px] text-dim">
          Dated version:{" "}
          <Link
            href={`/rules/${rule.slug}`}
            className="text-fg underline underline-offset-3 hover:text-accent"
          >
            {rule.title}
          </Link>
        </p>
      ) : null}
    </li>
  );
}

export default async function ProviderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = getProvider(id);
  if (!p) notFound();

  const related = (await Promise.all((p.related ?? []).map((s) => getRule(s)))).filter(
    (r) => r !== null,
  );

  return (
    <div className="shell shell-tight py-12 sm:py-16">
      <p className="num label">
        <Link href="/providers" className="hover:text-fg">
          Providers
        </Link>{" "}
        · verified {fmtDate(p.lastVerified)}
      </p>

      <h1 className="mt-4 max-w-[16ch] text-[clamp(2rem,5.6vw,3.2rem)] leading-[1.02] tracking-[-0.04em]">
        {p.name}
      </h1>
      <p className="mt-5 max-w-[62ch] text-[1.04rem] leading-relaxed text-muted-fg">{p.what}</p>

      {p.postmasterUrl ? (
        <p className="num mt-4 text-[13px]">
          <a
            href={p.postmasterUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline underline-offset-3"
          >
            {p.postmasterUrl.replace(/^https?:\/\//, "")}
          </a>
          <span className="ml-2 text-dim">their postmaster page</span>
        </p>
      ) : null}

      {/* Said before anything is claimed, not after. */}
      {p.unreadable ? (
        <div className="mt-8 rounded-xl border border-soon/40 bg-soon-bg px-5 py-4 text-[0.92rem] leading-relaxed text-muted-fg">
          <b className="text-fg">This page publishes less about {p.name}, on purpose.</b>{" "}
          {p.unreadable}
        </div>
      ) : null}

      {/* ── What they said ─────────────────────────────────────────────── */}
      {p.saidPublicly.length ? (
        <section className="mt-14">
          <p className="label">What they published</p>
          <h2 className="mt-2.5 text-[1.35rem] tracking-tight">In their own words.</h2>
          <ul className="mt-6 list-none border-t p-0">
            {p.saidPublicly.map((c) => (
              <li key={c.claim} className="border-b py-5">
                <p className="text-[1.02rem] leading-snug font-medium">{c.claim}</p>
                {c.verbatim ? <Verbatim>{`“${c.verbatim}”`}</Verbatim> : null}
                <Cite source={c.source} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ── Thresholds ─────────────────────────────────────────────────── */}
      {p.thresholds.length ? (
        <section className="mt-14">
          <p className="label">The numbers</p>
          <h2 className="mt-2.5 text-[1.35rem] tracking-tight">
            Only the ones they printed themselves.
          </h2>
          <ul className="mt-6 list-none border-t p-0">
            {p.thresholds.map((t) => (
              <li key={t.name} className="grid gap-x-8 gap-y-1 border-b py-5 sm:grid-cols-[9rem_1fr]">
                <span className="num text-[1.5rem] leading-none font-semibold tracking-tight">
                  {t.value}
                </span>
                <div className="min-w-0">
                  <p className="text-[0.98rem] leading-snug font-medium">{t.name}</p>
                  {t.appliesTo ? (
                    <p className="mt-1 text-[0.88rem] leading-relaxed text-muted-fg">
                      {t.appliesTo}
                    </p>
                  ) : null}
                  <Cite source={t.source} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ── Never said. The reason this page exists. ───────────────────── */}
      {p.neverSaid.length ? (
        <section className="mt-14">
          <p className="label">The negative space</p>
          <h2 className="mt-2.5 max-w-[24ch] text-[1.35rem] tracking-tight">
            {p.neverSaid.length === 1
              ? `One thing everybody repeats that ${p.name} has never said.`
              : `${p.neverSaid.length} things everybody repeats that ${p.name} has never said.`}
          </h2>
          <p className="mt-3 max-w-[60ch] text-[14px] leading-relaxed text-muted-fg">
            An absence is harder to check than a claim, so each one links the page where you can
            confirm the words are not there — and where {p.name} states outright that it will not
            publish something, that refusal is quoted.
          </p>
          <ul className="mt-6 list-none border-t p-0">
            {p.neverSaid.map((m) => (
              <MythRow key={m.myth} myth={m} />
            ))}
          </ul>
        </section>
      ) : null}

      {/* ── Bounce codes ───────────────────────────────────────────────── */}
      {p.bounceCodes.length ? (
        <section className="mt-14">
          <p className="label">What you have in front of you</p>
          <h2 className="mt-2.5 text-[1.35rem] tracking-tight">The literal bounce string.</h2>
          <ul className="mt-6 list-none p-0">
            {p.bounceCodes.map((b) => (
              <li key={b.code} className="mt-4 rounded-xl border bg-bg-2 p-5 first:mt-0">
                <pre className="num overflow-x-auto text-[0.76rem] leading-relaxed text-fg">
                  {b.code}
                </pre>
                <p className="mt-3 text-[0.94rem] leading-relaxed text-muted-fg">{b.means}</p>
                {b.next ? (
                  <p className="mt-2 text-[0.94rem] leading-relaxed">
                    <b className="font-medium">Do this:</b> {b.next}
                  </p>
                ) : null}
                <Cite source={b.source} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ── Delisting, with the ownership verdict ──────────────────────── */}
      <section className="mt-14">
        <p className="label">Getting unblocked</p>
        <h2 className="mt-2.5 text-[1.35rem] tracking-tight">
          The removal path, and whose job it is to file it.
        </h2>
        <p className="mt-3 max-w-[60ch] text-[14px] leading-relaxed text-muted-fg">
          Every delisting guide tells you where the form is. The half nobody prints is whether you
          can complete it: on a shared sending pool the listed address is your platform&rsquo;s and
          the submission is theirs to make, so a marketer sent to the form arrives without the one
          thing it asks for.
        </p>
        <ul className="mt-6 list-none p-0">
          {p.delisting.map((d) => (
            <li key={d.path} className="mt-5 rounded-xl border p-5 first:mt-0">
              <p className="text-[1.02rem] leading-snug font-semibold">{d.path}</p>
              {d.url ? (
                <p className="num mt-2 text-[0.78rem]">
                  <a
                    href={d.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent underline underline-offset-3"
                  >
                    {d.url.replace(/^https?:\/\//, "")}
                  </a>
                </p>
              ) : null}

              <div className="mt-4 border-l pl-3.5">
                <p className="text-[0.78rem] font-medium text-accent">
                  {OWNERSHIP[d.whoFiles].label}
                </p>
                <p className="mt-1 max-w-[60ch] text-[0.88rem] leading-relaxed text-muted-fg">
                  {d.whoFilesWhy}
                </p>
              </div>

              {d.typicalWait ? (
                <p className="mt-3 text-[0.88rem] leading-relaxed text-muted-fg">
                  <b className="font-medium text-fg">How long:</b> {d.typicalWait}
                </p>
              ) : null}

              {d.evidenceNeeded?.length ? (
                <div className="mt-3">
                  <p className="text-[0.88rem] font-medium">What it asks for</p>
                  <ul className="mt-1.5 list-none p-0 text-[0.88rem] leading-relaxed text-muted-fg">
                    {d.evidenceNeeded.map((e) => (
                      <li key={e} className="before:mr-2 before:text-dim before:content-['—']">
                        {e}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {d.caveat ? (
                <p className="mt-3 rounded-lg bg-bg-2 px-3.5 py-2.5 text-[0.88rem] leading-relaxed text-muted-fg">
                  <b className="font-medium text-fg">The trap:</b> {d.caveat}
                </p>
              ) : null}

              <Cite source={d.source} />
            </li>
          ))}
        </ul>
      </section>

      {related.length ? (
        <section className="mt-14 border-t pt-6">
          <p className="label">The dated rules behind this</p>
          <ul className="mt-3 list-none p-0">
            {related.map((r) => (
              <li key={r.slug} className="border-b py-3">
                <Link
                  href={`/rules/${r.slug}`}
                  className="text-[0.98rem] underline-offset-3 hover:underline"
                >
                  {r.title}
                </Link>
                <span className="num ml-2 text-[12px] text-dim">
                  verified {fmtDate(r.lastVerified)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="mt-10 border-t pt-5 text-[13px] leading-relaxed text-dim">
        A quote wrong, a path moved, or something {p.name} has said that is missing here?{" "}
        <a href={`mailto:${SITE.contact}`} className="underline underline-offset-3 hover:text-fg">
          {SITE.contact}
        </a>
        . Corrections are published and dated on{" "}
        <Link href="/corrections" className="underline underline-offset-3 hover:text-fg">
          /corrections
        </Link>
        , never quietly swallowed.
      </p>
    </div>
  );
}
