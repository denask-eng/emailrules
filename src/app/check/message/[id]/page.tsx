import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CampaignReport } from "./campaign-report";
import { SessionWait } from "./session-wait";
import { espLabel } from "@/lib/audience";
import {
  inboxAddress,
  isCheckId,
  loadCheckSession,
  loadMessageCheck,
  type CampaignSession,
} from "@/lib/message-check";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  if (!isCheckId(id)) return { title: "Campaign report", robots: { index: false, follow: false } };
  const check = await loadMessageCheck(id);
  const title = check ? `${check.fromDomain ?? "Campaign"} preflight` : "Waiting for campaign";
  return {
    title,
    description: check ? "Prioritized campaign findings with evidence, an owner, a first action and dated primary sources." : "A private one-time campaign receiving session.",
    robots: { index: false, follow: false },
    openGraph: { type: "website", title, url: `${SITE.url}/check/message/${id}`, siteName: SITE.name },
  };
}

function Waiting({ session }: { session: CampaignSession }) {
  const address = inboxAddress(session.id);
  if (!address) notFound();
  return (
    <div className="shell shell-tight py-12 sm:py-16">
      <p className="label text-accent">Private campaign check</p>
      <h1 className="mt-3 text-[clamp(2.4rem,7vw,4.2rem)] leading-[1.04]">
        Send the real test now.
      </h1>
      <p className="mt-5 text-[14px] leading-relaxed text-muted-fg">
        {espLabel(session.context.esp)} · {session.context.geographies.join(", ")} · {session.context.gmailBulk ? "Gmail bulk volume" : "below or unsure on Gmail bulk volume"}
      </p>
      <SessionWait token={session.reportToken} address={address} expiresAt={session.receiveExpiresAt} initialStatus={session.status} />
      <p className="mt-5 text-[13px] leading-relaxed text-dim">
        Privacy: no remote images, no opened links and no rendered campaign HTML. The report stores normalized findings, not the campaign body.
      </p>
      {session.status === "failed" || session.status === "expired" ? (
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/check/message" className="inline-flex min-h-11 items-center rounded-xl bg-accent px-4 text-[13px] font-semibold text-accent-fg">Create a new address</Link>
          <Link href="/check/headers" className="inline-flex min-h-11 items-center rounded-xl border px-4 text-[13px] font-semibold">Paste message source</Link>
        </div>
      ) : null}
    </div>
  );
}

export default async function MessageResult({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isCheckId(id)) notFound();
  const [check, session] = await Promise.all([loadMessageCheck(id), loadCheckSession(id)]);
  if (check?.reportToken === id) return <CampaignReport check={check} />;
  if (!session || session.reportToken !== id) notFound();
  return <Waiting session={session} />;
}
