import type { Rule } from "@/lib/types";
import { SITE } from "@/lib/site";

/**
 * A rule as an agent should receive it.
 *
 * Every field, including the ones the human page folds behind a tab. An agent
 * has no reading budget to protect and nothing here is expensive to send, so
 * withholding a field would be an arbitrary difference between the two
 * audiences — and the point of branch B, which this is borrowed from, is that
 * there should be no such difference.
 *
 * One definition, used by `/rules/[slug]?format=json` and by the MCP route.
 */
export function ruleToJson(rule: Rule) {
  return {
    slug: rule.slug,
    url: `${SITE.url}/rules/${rule.slug}`,
    title: rule.title,
    question: rule.question,
    answer: rule.answer,
    plain: rule.plain,
    status: rule.status,
    effectiveDate: rule.effectiveDate,
    jurisdictions: rule.jurisdictions,
    topic: rule.topic,
    provider: rule.provider,
    esp: rule.esp,
    appliesTo: rule.appliesTo,
    whatToDo: rule.whatToDo,
    ownership: rule.ownership,
    handled: rule.handled,
    mondayMorning: rule.mondayMorning,
    ignoreIf: rule.ignoreIf,
    exempt: rule.exempt,
    enforcement: rule.enforcement,
    sources: rule.sources,
    related: rule.related,
    added: rule.added,
    updated: rule.updated,
    lastVerified: rule.lastVerified,
    changelog: rule.changelog,
    notice:
      "Checked against the primary source by a named person, and dated. Cite the URL and the lastVerified date — this corpus is versioned by date because rules change, and a cached copy goes stale.",
  };
}
