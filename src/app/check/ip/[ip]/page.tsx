import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlocklistVerdict } from "@/components/blocklist-verdict";
import { checkAddress, reverseAddress } from "@/lib/blocklist-check";
import { SITE } from "@/lib/site";

/**
 * One address, every list that answered today.
 *
 * This exists because a domain check cannot answer it. An ESP authorises
 * between eighty and four hundred thousand addresses, so "is my sending IP
 * listed" has no answer at the domain level — but it has an exact answer for
 * one address, and people arrive holding one: out of a bounce message, out of
 * a Received header, out of somebody else's tool telling them they are
 * blacklisted without saying whether the entry is even about them.
 *
 * Which is the point. Somewhere else told them they are on a blocklist. This
 * says which of the three kinds of entry it is, and most of the time the
 * honest answer is that it belongs to their platform's network and they
 * should do nothing.
 */

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ip: string }>;
}): Promise<Metadata> {
  const { ip } = await params;
  const title = `${ip} — blocklist check`;
  const description = `Every blocklist that answered today, checked against ${ip}, with each entry sorted into the ones about this address and the ones about the network around it. No score.`;
  return {
    title,
    description,
    /* Noindex, like /embed/[domain]. Four billion near-identical pages is the
       thin-content shelf this site tells everybody else not to build, and the
       page is useful to the person holding the address rather than to search. */
    robots: { index: false, follow: false },
    alternates: { canonical: `/check/ip/${ip}` },
    openGraph: { type: "website", title, description, url: `${SITE.url}/check/ip/${ip}`, siteName: SITE.name },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function IpCheck({ params }: { params: Promise<{ ip: string }> }) {
  const { ip } = await params;
  const address = decodeURIComponent(ip).trim();
  if (!reverseAddress(address)) notFound();

  const { hits, reports } = await checkAddress(address);
  const actionable = hits.filter((h) => h.list.kind === "address");
  const contextual = hits.filter((h) => h.list.kind !== "address");
  const asked = reports.filter((r) => r.status === "answered").length;

  return (
    <div className="shell shell-tight py-12 sm:py-16">
      <p className="num label">One address · checked just now</p>
      <h1 className="mt-4 max-w-[18ch] text-[clamp(2.1rem,6.5vw,3.6rem)] leading-[0.98] tracking-[-0.045em]">
        {actionable.length === 0
          ? contextual.length === 0
            ? "Nothing has an entry for it."
            : "Nothing here is about this address."
          : `${actionable.length} ${actionable.length === 1 ? "entry needs" : "entries need"} attention.`}
      </h1>
      <p className="num mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-dim">
        <span>{address}</span>
        <span aria-hidden>·</span>
        <span>{asked} lists asked</span>
        <span aria-hidden>·</span>
        <span>no score, ever</span>
      </p>

      <BlocklistVerdict
        actionable={actionable}
        contextual={contextual}
        lists={reports}
        checkedWhat={address}
        showHeadline={false}
      />

      <div className="mt-10 rounded-xl border bg-bg-2 p-5 text-[0.92rem] leading-relaxed text-muted-fg">
        <b className="text-fg">Whose address is this, though.</b> If it belongs to your sending
        platform&rsquo;s shared pool — and on a mainstream platform it almost always does — then
        the reputation and the removal channel are theirs, not yours. The way to know which address
        actually carried your campaign is to read it off the message rather than guess:{" "}
        <Link
          href="/check/message"
          className="text-fg underline decoration-1 underline-offset-3 hover:text-accent"
        >
          send us one
        </Link>
        .
      </div>

      <p className="mt-5 text-[13px] text-muted-fg">
        Checking a brand rather than an address?{" "}
        <Link href="/check" className="text-fg underline decoration-1 underline-offset-3">
          Check a sending domain
        </Link>
        .
      </p>
    </div>
  );
}
