import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CampaignReport } from "../../[id]/campaign-report";
import { isShareToken, loadSharedMessageCheck } from "@/lib/message-check";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Redacted campaign report",
  description: "A redacted Emailrules campaign preflight report.",
  robots: { index: false, follow: false },
};

export default async function SharedCampaignReport({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isShareToken(token)) notFound();
  const check = await loadSharedMessageCheck(token);
  if (!check) notFound();
  return <CampaignReport check={check} shared />;
}
