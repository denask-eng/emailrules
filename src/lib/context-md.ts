import { fmtDate } from "@/lib/format";
import { OWNERSHIP, type Ownership } from "@/lib/types";

/**
 * The markdown "Copy as context" hands to an assistant.
 *
 * This lives apart from the button on purpose. The button needs the clipboard
 * and is therefore a Client Component; the markdown is assembled from corpus
 * fields and must be built on the *server*, so a page can pass a finished
 * string down as a prop. Keeping them in one file made this a client function
 * the server could not call.
 *
 * One builder, so every "Copy as context" on the site emits the same shape.
 * That consistency is the whole product of the control: three of these pasted
 * into one conversation stay distinguishable.
 */

export interface ContextSource {
  name: string;
  url: string;
  published?: string;
}

export function buildContext(input: {
  title: string;
  url: string;
  claim: string;
  ownership?: Ownership;
  verified?: string;
  effective?: string;
  mondayMorning?: string;
  evidence?: string;
  sources?: ContextSource[];
}): string {
  const l: string[] = [];
  l.push(`## ${input.title}`, "");
  l.push(input.claim, "");
  if (input.ownership) {
    l.push(
      `- **Whose job:** ${OWNERSHIP[input.ownership].label} — ${OWNERSHIP[input.ownership].blurb}`,
    );
  }
  if (input.mondayMorning) l.push(`- **First move:** ${input.mondayMorning}`);
  if (input.effective) l.push(`- **In force from:** ${fmtDate(input.effective)}`);
  if (input.verified) l.push(`- **Last verified by a human:** ${fmtDate(input.verified)}`);
  l.push(`- **Source of this record:** ${input.url}`);
  if (input.evidence) {
    l.push("", "```", input.evidence.trim(), "```");
  }
  if (input.sources?.length) {
    l.push("", "**Primary sources**");
    for (const s of input.sources) {
      l.push(
        `- ${s.name} — ${s.url}${s.published ? ` (published ${fmtDate(s.published)})` : " (no publisher date)"}`,
      );
    }
  }
  /* What this line may claim is bounded by what we can actually show. "A
     person checked this against the primary source on this date" is on the
     page and auditable. "No language model wrote any of this" is not
     something a reader can verify and not something we can prove, so it is
     not claimed. */
  l.push(
    "",
    "_Checked against the primary source by a named person, and dated. Cite the URL and the verification date — this corpus is versioned by date because rules change, and a copy of it goes stale._",
  );
  return l.join("\n");
}
