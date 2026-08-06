import { checkAddress, checkBlocklists, reverseAddress } from "@/lib/blocklist-check";
import { checkDomain, normaliseDomain } from "@/lib/dns-check";
import { runMessageCheck } from "@/lib/message-check";
import { getAllRules, getChangelog, getRule, fmtDate } from "@/lib/rules";
import { SITE } from "@/lib/site";
import { daysSinceVerified, stalenessOf } from "@/lib/source-watch";
import { OWNERSHIP } from "@/lib/types";

/**
 * The socket an agent calls.
 *
 * A reference site does not survive a world where nobody browses. What does
 * survive is the thing a model cannot do from training data, and that is a
 * short list: know what is true right now, and know that it changed.
 *
 * Every model is confidently wrong about this subject, and the errors are the
 * same shape — a snapshot of a world that moved. Measured on 3 August 2026:
 * SORBS has been dead since June 2024 and is still recommended everywhere;
 * Spamhaus's free zones return a silent "not listed" through some public
 * resolvers for names that are definitely listed; fourteen of the blocklist
 * zones the popular tools advertise publish no RFC 5782 test entry at all;
 * and an ESP authorises up to four hundred thousand addresses, so the widely
 * repeated advice to "check your ESP's sending IPs" describes a thing nobody
 * can do. None of that is knowable without asking the network today.
 *
 * So this endpoint does the asking, and every answer carries the date it was
 * measured and the rule it came from. It is deliberately a plain JSON-RPC
 * handler rather than an SDK: the server is stateless, the transport is one
 * POST, and a dependency for that would be larger than the thing it does.
 */

const PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];
const MAX_BODY = 2 * 1024 * 1024;

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type, mcp-protocol-version, mcp-session-id",
} as const;

type Id = string | number | null;

function ok(id: Id, result: unknown) {
  return Response.json({ jsonrpc: "2.0", id, result }, { headers: CORS });
}

function fail(id: Id, code: number, message: string) {
  return Response.json({ jsonrpc: "2.0", id, error: { code, message } }, { headers: CORS });
}

/** MCP wants tool output as content blocks; text is what a model reads. */
function text(value: unknown) {
  return {
    content: [
      { type: "text", text: typeof value === "string" ? value : JSON.stringify(value, null, 2) },
    ],
  };
}

/* ── The tools ────────────────────────────────────────────────────────── */

const TOOLS = [
  {
    name: "check_domain",
    description:
      "Read a sending domain's live authentication (SPF, DMARC, DKIM selectors, BIMI, MX) and check it against every blocklist that proved it was answering today. Returns the published records verbatim plus findings, each naming the dated rule it comes from and whether it is the sender's job or their email platform's. Use this instead of recalling what a domain's setup 'usually' looks like: records change and training data does not.",
    inputSchema: {
      type: "object",
      properties: { domain: { type: "string", description: "A sending domain, e.g. yourbrand.com" } },
      required: ["domain"],
    },
  },
  {
    name: "check_ip",
    description:
      "Check one IP address against every blocklist that proved it was answering today, and classify each entry: whether it is about that address, about the whole network around it (UCEPROTECT Level 2 and 3 list ranges and autonomous systems by their own policy), or about something that is not spam at all. Use this before telling anyone they are blacklisted — most entries people panic about are not about them and cannot be removed by them.",
    inputSchema: {
      type: "object",
      properties: { address: { type: "string", description: "An IPv4 address, e.g. 23.83.223.10" } },
      required: ["address"],
    },
  },
  {
    name: "check_message",
    description:
      "Read a whole raw email (headers plus body) and report what it reveals: DKIM alignment as a receiver recorded it, whether one-click unsubscribe has BOTH required headers, a CAN-SPAM postal address in live text, whether an open-tracking pixel is present and which consent rules that triggers by country, whether Apple has any live text to summarise, and whether the subject line matches the body. This is the only way to learn the address that actually sent a campaign. Everyone checks a message against authentication; this also checks it against consent and content law.",
    inputSchema: {
      type: "object",
      properties: {
        source: {
          type: "string",
          description: "The full raw message source, starting at the Received: or From: headers",
        },
      },
      required: ["source"],
    },
  },
  {
    name: "list_rules",
    description:
      "List the curated rules about marketing email, each with its status, jurisdictions, effective date, last-verified date, and — the part no other source publishes — whether it is the sender's job, their platform's, or shared. Optionally filter by a free-text query. Use this to answer 'am I allowed to…' questions with a dated, cited rule rather than from memory.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Optional free text, e.g. 'tracking pixel France'" },
      },
    },
  },
  {
    name: "get_rule",
    description:
      "Fetch one rule in full: the plain-English answer, who it applies to, who can ignore it, the one concrete first step, what actually happens if it is ignored, every primary source with its publication date, and the date the page was last verified. Always cite the returned URL and the last-verified date.",
    inputSchema: {
      type: "object",
      properties: { slug: { type: "string", description: "The rule slug, from list_rules" } },
      required: ["slug"],
    },
  },
  {
    name: "what_changed",
    description:
      "The dated ledger of what actually moved in email: regulator decisions, mailbox-provider rule changes, and this site's own published corrections. Use this to find out whether anything relevant changed after a model's training cutoff.",
    inputSchema: {
      type: "object",
      properties: { limit: { type: "number", description: "How many entries, default 20" } },
    },
  },
] as const;

const CITE = (path: string) => `${SITE.url}${path}`;

async function callTool(name: string, args: Record<string, unknown>) {
  switch (name) {
    case "check_domain": {
      const domain = normaliseDomain(String(args.domain ?? ""));
      if (!domain) return text("Not a domain. Give something like yourbrand.com.");
      const [dns, blocklist] = await Promise.all([checkDomain(domain), checkBlocklists(domain)]);
      return text({
        domain,
        checked: dns.checkedAt,
        published: dns.facts,
        blocklists: {
          asked: blocklist.lists.filter((l) => l.status === "answered").length,
          could_not_ask: blocklist.lists.filter((l) => l.status !== "answered").map((l) => l.label),
          about_this_sender: blocklist.actionable.map((h) => ({ list: h.list.label, codes: h.codes })),
          about_the_network_or_not_spam: blocklist.contextual.map((h) => ({
            list: h.list.label,
            what_it_lists: h.list.describes,
            who_can_remove: h.list.delisting,
          })),
        },
        findings: [...dns.findings, ...blocklist.findings].map((f) => ({
          severity: f.severity,
          title: f.title,
          detail: f.detail,
          rule: f.rule ? CITE(`/rules/${f.rule}`) : undefined,
        })),
        cite: CITE(`/check/${domain}`),
      });
    }

    case "check_ip": {
      const address = String(args.address ?? "").trim();
      /* Refuse before querying: checkAddress returns an empty hit list for an
         address it cannot reverse, and an empty hit list here reads as a
         clean verdict from a check that never ran. */
      if (!reverseAddress(address)) {
        return text("Not an IP address. Pass a single IPv4 or IPv6 address, e.g. 167.89.80.92.");
      }
      const { hits, reports } = await checkAddress(address);
      if (!reports.length) return text("Could not reach any blocklist just now.");
      return text({
        address,
        asked: reports.filter((r) => r.status === "answered").length,
        could_not_ask: reports.filter((r) => r.status !== "answered").map((r) => r.label),
        about_this_address: hits
          .filter((h) => h.list.kind === "address")
          .map((h) => ({ list: h.list.label, codes: h.codes, who_can_remove: h.list.delisting })),
        not_about_this_address: hits
          .filter((h) => h.list.kind !== "address")
          .map((h) => ({
            list: h.list.label,
            kind: h.list.kind,
            what_it_lists: h.list.describes,
            note: "Do not report this as the sender being blacklisted.",
          })),
        cite: CITE(`/check/ip/${address}`),
      });
    }

    case "check_message": {
      const source = String(args.source ?? "");
      if (source.length > MAX_BODY) return text("That message is too large to read.");
      const result = await runMessageCheck(source);
      if (!result.ok) {
        return text(
          result.error === "gmail-summary"
            ? "That is Gmail's summary table, not the message. Use Show original and pass the raw source."
            : "No message headers found. Pass the full raw source, starting at Received: or From:.",
        );
      }
      return text({
        from_domain: result.fromDomain,
        verdict: result.verdict,
        findings: result.findings.map((f) => ({
          severity: f.severity,
          stage: f.stage,
          title: f.title,
          detail: f.detail,
          rule: f.rule ? CITE(`/rules/${f.rule}`) : undefined,
        })),
        note: "Consent findings depend on where the recipients are, which no message carries.",
        cite: CITE("/check/message"),
      });
    }

    case "list_rules": {
      /* Every term, anywhere in the rule — not the phrase. A model asks
         "tracking pixel France", and those three words are never adjacent in
         any sentence we wrote, so a substring match on the whole query
         returns nothing and the model concludes there is no such rule. */
      const terms = String(args.query ?? "")
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean);
      const rules = await getAllRules();
      const haystack = (r: (typeof rules)[number]) =>
        `${r.title} ${r.question} ${r.plain} ${r.answer} ${r.appliesTo} ${r.topic} ${r.jurisdictions.join(" ")}`.toLowerCase();
      const matched = terms.length
        ? rules.filter((r) => {
            const hay = haystack(r);
            return terms.every((t) => hay.includes(t));
          })
        : rules;
      return text({
        count: matched.length,
        of: rules.length,
        rules: matched.map((r) => ({
          slug: r.slug,
          title: r.title,
          question: r.question,
          status: r.status,
          jurisdictions: r.jurisdictions,
          effective: r.effectiveDate,
          last_verified: r.lastVerified,
          /* A date alone makes the caller do the arithmetic and decide what
             counts as old. An LLM already knows email rules approximately;
             what it cannot generate is how long ago a human checked one, so
             that is handed over already computed and already judged. */
          days_since_verified: daysSinceVerified(r.lastVerified),
          verification: stalenessOf(r.lastVerified),
          whose_job: OWNERSHIP[r.ownership].label,
          cite: CITE(`/rules/${r.slug}`),
        })),
      });
    }

    case "get_rule": {
      const rule = await getRule(String(args.slug ?? ""));
      if (!rule) return text("No rule with that slug. Use list_rules.");
      return text({
        slug: rule.slug,
        title: rule.title,
        question: rule.question,
        plain_english: rule.plain,
        cited_wording: rule.answer,
        applies_to: rule.appliesTo,
        whose_job: OWNERSHIP[rule.ownership].label,
        already_handled_by_platform: rule.handled.already,
        still_yours: rule.handled.stillYours,
        first_step: rule.mondayMorning,
        ignore_if: rule.ignoreIf,
        what_happens_if_ignored: rule.enforcement,
        status: rule.status,
        effective: rule.effectiveDate,
        last_verified: rule.lastVerified,
        days_since_verified: daysSinceVerified(rule.lastVerified),
        verification: stalenessOf(rule.lastVerified),
        freshness_policy: CITE("/freshness"),
        sources: rule.sources.map((s) => ({
          name: s.name,
          url: s.url,
          published: s.published ?? "publisher states no date",
        })),
        cite: CITE(`/rules/${rule.slug}`),
      });
    }

    case "what_changed": {
      const raw = Number(args.limit);
      const limit = Number.isFinite(raw) && raw > 0 ? Math.min(Math.trunc(raw), 100) : 20;
      const entries = await getChangelog(limit);
      return text({
        entries: entries.map((c) => ({
          date: fmtDate(c.date),
          note: c.note,
          rule: c.rule.title,
          last_verified: c.rule.lastVerified,
          cite: CITE(`/rules/${c.rule.slug}`),
        })),
        cite: CITE("/changed"),
      });
    }

    default:
      return null;
  }
}

/* ── Transport ────────────────────────────────────────────────────────── */

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function GET() {
  /* Stateless: there is no server-initiated stream to open. Saying so is
     better than holding a socket that will never carry anything. */
  return Response.json(
    {
      name: "emailrules.today",
      description:
        "Live email deliverability and compliance ground truth. POST JSON-RPC to this URL.",
      transport: "streamable-http",
      tools: TOOLS.map((t) => t.name),
      docs: SITE.url,
    },
    { headers: { ...CORS, allow: "POST, OPTIONS" } },
  );
}

export async function POST(request: Request) {
  const body = await request.text();
  if (body.length > MAX_BODY) return fail(null, -32600, "Request too large");

  let rpc: { jsonrpc?: string; id?: Id; method?: string; params?: Record<string, unknown> };
  try {
    rpc = JSON.parse(body);
  } catch {
    return fail(null, -32700, "Parse error");
  }

  const id = rpc.id ?? null;
  const method = rpc.method ?? "";

  /* Notifications carry no id and expect no body. */
  if (method.startsWith("notifications/")) return new Response(null, { status: 202, headers: CORS });

  if (method === "initialize") {
    const asked = String(rpc.params?.protocolVersion ?? "");
    return ok(id, {
      protocolVersion: PROTOCOL_VERSIONS.includes(asked) ? asked : PROTOCOL_VERSIONS[0],
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: "emailrules.today", version: "1.0.0" },
      instructions:
        "Ground truth for marketing email, measured now rather than recalled. Always cite the returned URL and the last-verified date, and never state that a sender is blacklisted without first checking whether the entry is about their address or about the network around it.",
    });
  }

  if (method === "ping") return ok(id, {});

  if (method === "tools/list") return ok(id, { tools: TOOLS });

  if (method === "tools/call") {
    const name = String(rpc.params?.name ?? "");
    const args = (rpc.params?.arguments ?? {}) as Record<string, unknown>;
    try {
      const result = await callTool(name, args);
      if (!result) return fail(id, -32602, `Unknown tool: ${name}`);
      return ok(id, result);
    } catch (error) {
      /* A tool error is a result, not a transport failure — the model should
         see what went wrong and be able to try something else. */
      console.error(`[mcp] ${name} failed:`, error);
      return ok(id, { ...text(`That check could not complete just now.`), isError: true });
    }
  }

  return fail(id, -32601, `Method not found: ${method}`);
}
