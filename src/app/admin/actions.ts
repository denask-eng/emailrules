"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getRule } from "@/lib/rules";
import { sendAlert } from "@/lib/mail";
import { isMarketChange } from "@/lib/rule-signals";
import { SITE } from "@/lib/site";
import { subscriberWantsRule } from "@/lib/subscriber-prefs";
import type { Rule, Ownership, RuleStatus, Topic, Jurisdiction } from "@/lib/types";

/**
 * Every action calls requireAdmin() first.
 *
 * A layout guard does not protect a Server Action: actions are their own
 * entry points and can be invoked directly with a crafted request. Next's
 * auth guidance is explicit about this, so the check is repeated here rather
 * than assumed from the surrounding page.
 */

const today = () => new Date().toISOString().slice(0, 10);

/** Publishing changes several routes at once, so revalidate them together. */
function revalidateRule(slug: string) {
  revalidatePath(`/rules/${slug}`);
  revalidatePath("/rules");
  revalidatePath("/changed");
  revalidatePath("/sources");
  revalidatePath("/");
  revalidatePath("/llms.txt");
  revalidatePath("/admin");
}

async function write(rule: Rule) {
  await sql().query(
    `insert into rules (slug, data, updated_at) values ($1, $2::jsonb, now())
     on conflict (slug) do update set data = excluded.data, updated_at = now()`,
    [rule.slug, JSON.stringify(rule)],
  );
}

const lines = (v: FormDataEntryValue | null) =>
  String(v ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

/**
 * The button that gets pressed most.
 *
 * Confirming a rule is still true is the routine job here, not writing new
 * ones, so it is one click and it writes its own changelog entry. A silent
 * re-verify would be worse than none: the date is the product.
 */
export async function reVerify(slug: string) {
  await requireAdmin();
  const rule = await getRule(slug);
  if (!rule) return;

  const date = today();
  if (rule.lastVerified === date) return;

  await write({
    ...rule,
    lastVerified: date,
    changelog: [{ date, note: "Re-checked against the source. No change." }, ...rule.changelog],
  });
  revalidateRule(slug);
}

/**
 * Announcing a change is a separate, deliberate press.
 *
 * Auto-sending on save would blast the list every time a typo is fixed. An
 * operator decides when a change is worth an email, and the rule_alerts
 * primary key makes a double-press a no-op rather than a second send.
 */
export async function notifySubscribers(slug: string, changeDate: string, note: string) {
  await requireAdmin();
  const rule = await getRule(slug);
  if (!rule) return;

  /* Homepage ledger and product promise: only real market/correction moves.
     Re-verifies and "we documented it" notes never leave the building. */
  if (!isMarketChange(note)) {
    redirect(`/admin/rules/${slug}?alert=not-market`);
  }

  const already = (await sql().query(
    `select 1 from rule_alerts where slug = $1 and change_date = $2 and note = $3`,
    [slug, changeDate, note],
  )) as unknown[];
  if (already.length) redirect(`/admin/rules/${slug}?alert=already`);

  const recipients = (await sql().query(
    `select email, token, audience from subscribers
     where unsubscribed_at is null and token is not null`,
  )) as unknown as { email: string; token: string; audience: unknown }[];

  /* Filter to people whose rules setup includes this rule. Empty audience =
     full list (same as pre-filter behaviour for early subscribers). */
  const matched = recipients.filter((r) => subscriberWantsRule(rule, r.audience));

  if (recipients.length === 0) redirect(`/admin/rules/${slug}?alert=nobody`);
  if (matched.length === 0) redirect(`/admin/rules/${slug}?alert=filtered`);

  let sent = 0;
  let failed = 0;
  for (const r of matched) {
    const res = await sendAlert(r.email, {
      rule,
      changeDate,
      note,
      unsubscribeUrl: `${SITE.url}/api/unsubscribe?t=${r.token}`,
    });
    if (res.ok) sent += 1;
    else {
      failed += 1;
      console.error(`[alert] ${r.email}: ${res.error}`);
    }
  }

  /* Recorded even on partial failure, so a retry does not re-send to the
     people who already received it. */
  await sql().query(
    `insert into rule_alerts (slug, change_date, note, recipients) values ($1,$2,$3,$4)
     on conflict (slug, change_date, note) do nothing`,
    [slug, changeDate, note, sent],
  );

  const skipped = recipients.length - matched.length;
  redirect(
    `/admin/rules/${slug}?alert=sent&n=${sent}${failed ? `&f=${failed}` : ""}${
      skipped ? `&skip=${skipped}` : ""
    }`,
  );
}

/** Kebab-case, ASCII, no trailing junk. The slug is a permanent URL, so it is
 *  derived once at creation and never rewritten by a later title edit. */
function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

export async function createRule(formData: FormData) {
  await requireAdmin();

  const title = String(formData.get("title") ?? "").trim();
  const question = String(formData.get("question") ?? "").trim();
  if (!title || !question) redirect("/admin/rules/new?e=missing");

  const slug = slugify(String(formData.get("slug") ?? "") || title);
  /* "new" would collide with /admin/rules/new, which Next resolves to the
     static segment, making the rule permanently uneditable. */
  if (!slug || slug === "new") redirect("/admin/rules/new?e=missing");

  const clash = await getRule(slug);
  if (clash) redirect(`/admin/rules/new?e=exists&slug=${slug}`);

  const date = today();
  /* Deliberately created as a draft with `proposed` status and placeholder
     prose. A half-written rule appearing on the public site as though it were
     verified fact is the worst possible failure mode here, so the operator has
     to fill it in and set the status themselves. */
  const rule: Rule = {
    slug,
    title,
    question,
    status: "proposed",
    effectiveDate: date,
    jurisdictions: ["Global"],
    topic: (String(formData.get("topic") ?? "provider-rules")) as Topic,
    answer: "",
    plain: "",
    appliesTo: "",
    whatToDo: [],
    ownership: (String(formData.get("ownership") ?? "yours")) as Ownership,
    handled: { already: "" },
    mondayMorning: "",
    enforcement: "",
    sources: [],
    added: date,
    updated: date,
    lastVerified: date,
    changelog: [{ date, note: "Created as a draft." }],
  };

  await write(rule);
  revalidateRule(slug);
  redirect(`/admin/rules/${slug}`);
}

export async function saveRule(slug: string, formData: FormData) {
  await requireAdmin();
  const existing = await getRule(slug);
  if (!existing) return;

  const str = (k: string) => String(formData.get(k) ?? "").trim();
  const note = str("changeNote");

  /* Sources are nested, and a solo operator editing JSON directly is less
     error-prone than a form that can only express the shapes I predicted.
     A parse failure keeps the old value rather than destroying the record. */
  let sources = existing.sources;
  try {
    const parsed = JSON.parse(str("sources"));
    if (Array.isArray(parsed) && parsed.every((s) => s?.name && s?.url)) sources = parsed;
  } catch {
    /* keep existing */
  }

  const updated: Rule = {
    ...existing,
    title: str("title") || existing.title,
    question: str("question") || existing.question,
    status: (str("status") || existing.status) as RuleStatus,
    effectiveDate: str("effectiveDate") || existing.effectiveDate,
    topic: (str("topic") || existing.topic) as Topic,
    provider: str("provider") || undefined,
    jurisdictions: (lines(formData.get("jurisdictions")).length
      ? lines(formData.get("jurisdictions"))
      : existing.jurisdictions) as Jurisdiction[],
    answer: str("answer") || existing.answer,
    plain: str("plain") || existing.plain,
    appliesTo: str("appliesTo") || existing.appliesTo,
    whatToDo: lines(formData.get("whatToDo")).length
      ? lines(formData.get("whatToDo"))
      : existing.whatToDo,
    ownership: (str("ownership") || existing.ownership) as Ownership,
    handled: {
      already: str("handledAlready") || existing.handled.already,
      stillYours: str("handledStillYours") || undefined,
    },
    mondayMorning: str("mondayMorning") || existing.mondayMorning,
    ignoreIf: str("ignoreIf") || undefined,
    exempt: str("exempt") || undefined,
    enforcement: str("enforcement") || existing.enforcement,
    sources,
    related: lines(formData.get("related")),
    featured: formData.get("featured") === "on",
    updated: today(),
    lastVerified: today(),
    /* A correction that leaves no trace is the one thing this site promises
       never to do, so an edit without a note still records that it happened. */
    changelog: [
      { date: today(), note: note || "Edited." },
      ...existing.changelog.filter((c) => !(c.date === today() && c.note === "Edited.")),
    ],
  };

  await write(updated);
  revalidateRule(slug);
  redirect(`/admin/rules/${slug}?saved=1`);
}
