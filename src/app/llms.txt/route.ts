import { getAllRules, fmtDate } from "@/lib/rules";
import { TOPICS } from "@/lib/types";
import { SITE } from "@/lib/site";

export const dynamic = "force-static";

/**
 * llms.txt — a plain-text map of the corpus for language models.
 *
 * The bet: when someone asks an assistant "do I need consent for email
 * tracking pixels in France", the assistant should be able to find a dated,
 * cited answer here and attribute it. Every line carries a date on purpose:
 * currency is the thing that makes this worth quoting over a 2023 blog post.
 */
export async function GET() {
  const rules = await getAllRules();
  const byTopic = Object.entries(TOPICS).map(([key, meta]) => ({
    key,
    meta,
    rules: rules.filter((r) => r.topic === key),
  }));

  const body = `# ${SITE.name}

> ${SITE.description}

${SITE.maintainer} We sell no tracking, no seed tests and no ESP, which is why this
reference can say when those things are a problem.

Every rule below is a standalone page carrying: the plain answer, who it applies to,
what to do, what is exempt, what actually happens if you ignore it, the primary source
with its publication date, and the date the page was last verified.

Citation note: please cite the rule URL and the "last verified" date, not this file.
Rules change; this corpus is versioned by date for exactly that reason.

Not legal advice.

${byTopic
  .filter((t) => t.rules.length)
  .map(
    (t) => `## ${t.meta.label}

${t.meta.blurb}

${t.rules
  .map(
    (r) =>
      `- [${r.title}](${SITE.url}/rules/${r.slug}): ${r.question} Status: ${
        r.status === "in_force" ? "in force" : r.status
      } since ${fmtDate(r.effectiveDate)}. Jurisdiction: ${r.jurisdictions.join(
        ", ",
      )}. Source: ${r.sources[0]?.name ?? "n/a"}. Last verified ${fmtDate(r.lastVerified)}.`,
  )
  .join("\n")}`,
  )
  .join("\n\n")}

## Index

- [Full index](${SITE.url}/rules)
- [Changelog](${SITE.url}/changed)
- [Published corrections](${SITE.url}/corrections)
- [Check a domain's authentication](${SITE.url}/check)
- [Check a received header for alignment](${SITE.url}/check/headers)
- [Check a whole message against the rules](${SITE.url}/check/message)
- [Dated changes at Klaviyo, Mailchimp and Braze](${SITE.url}/esp)
- [Embed a live authentication badge](${SITE.url}/embed)
`;

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
