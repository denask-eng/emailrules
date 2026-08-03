import { promises as dns } from "node:dns";
import type { Finding } from "./dns-check";
import {
  EXCLUDED,
  LISTS,
  spamhausLists,
  type Delisting,
  type ListDef,
  type ListKind,
} from "./blocklist-lists";

/* No `server-only` here, for the same reason domain-snapshot.ts omits it: the
   parsing and classification below are the part most worth testing, and the
   suite runs under plain Node where that import throws. Nothing in this file
   runs anywhere but the server regardless — it opens raw DNS sockets. */

/**
 * Blocklists, asked honestly and then sorted.
 *
 * Two things every other checker in this category gets wrong, and this file
 * exists to get both right.
 *
 * **A list can decline to answer, and that is not "clean".** Spamhaus refuses
 * queries from public resolvers, and the shape of the refusal depends on which
 * resolver asked: measured on 3 Aug 2026, `zen.spamhaus.org` returned
 * 127.255.255.254 through Cloudflare — an error code — and NXDOMAIN through
 * Google, for a name that is definitely listed. The first reads as "listed on
 * everything" to a naive parser. The second, far worse, reads as "you are
 * fine". So nothing here trusts a list's silence until the list has proved, on
 * this run, that it is still talking: every list answers a control it must
 * list and a control it must not, and one that fails either is reported as
 * unanswered rather than as a pass. RFC 5782 §5 supplies both controls free
 * for address lists — 127.0.0.2 must be listed, 127.0.0.1 must not.
 *
 * **A hit is not a hit.** UCEPROTECT Level 3 lists entire autonomous systems;
 * Backscatterer's own operators say theirs is not a spam list; Spamhaus PBL is
 * a statement by the network that owns an address, not an accusation about the
 * sender. Rendered as identical red rows — which is what every free checker
 * does — these send marketers into a panic about entries that were never about
 * them and that they could not remove if they tried. Every list here carries
 * what its operator says it lists, and findings are sorted by that.
 */

export type { ListKind, ListTarget, Delisting } from "./blocklist-lists";
export { EXCLUDED } from "./blocklist-lists";

export type ListStatus = "answered" | "refused" | "wildcard" | "silent";

export interface ListReport {
  id: string;
  label: string;
  kind: ListKind;
  status: ListStatus;
}

export interface Hit {
  list: ListDef;
  /** The address or domain the entry is against. */
  subject: string;
  codes: string[];
}

export interface BlocklistResult {
  findings: Finding[];
  /** Per-list outcome, so a page can name what was asked and what declined. */
  lists: ListReport[];
  /** Every list we meant to ask actually answered. Gates history writes. */
  reliable: boolean;
  /** Entries that are genuinely about this sender. */
  actionable: Hit[];
  /** Entries about the surrounding network, or about something other than spam. */
  contextual: Hit[];
}

/* ── One lookup ───────────────────────────────────────────────────────── */

export type Answer =
  | { kind: "listed"; codes: string[] }
  | { kind: "absent" }
  | { kind: "refused"; codes: string[] }
  | { kind: "error" };

/* Every DNSBL signals "your query was refused" inside 127.255.255.0/24 rather
   than by failing, because the protocol has no other channel. Treating that
   block as a listing is the single most common bug in tools of this kind.
   Exported because it is the one line whose being wrong would mislead every
   visitor at once, so it is tested directly rather than through a socket. */
export const isRefusalCode = (code: string, extra: string[] = []) =>
  code.startsWith("127.255.255.") || extra.includes(code);

/**
 * Classify a set of A answers. Pure, so the rules that matter can be tested.
 *
 * `notListed` is the third case and the one nobody implements: a code that
 * resolves and does not mean "listed". Spamhaus PBL is the example that
 * matters — 127.0.0.10 is the address's own network saying it should not send
 * mail directly, which on an ESP-sent campaign is expected and says nothing
 * about the sender. Counting it as a blocklisting is how a clean domain gets
 * told it is blacklisted.
 */
export function classifyCodes(
  codes: string[],
  options: { refusalCodes?: string[]; notListed?: string[] } = {},
): Answer {
  if (!codes.length) return { kind: "absent" };
  if (codes.some((c) => isRefusalCode(c, options.refusalCodes))) return { kind: "refused", codes };
  const real = options.notListed ? codes.filter((c) => !options.notListed!.includes(c)) : codes;
  if (!real.length) return { kind: "absent" };
  return { kind: "listed", codes: real };
}

/* NXDOMAIN and NODATA are answers — the name is not in the zone. Everything
   else means our resolver fell over and we did not actually ask. */
const ANSWERED_ABSENT = new Set(["ENOTFOUND", "ENODATA"]);

async function ask(name: string, list?: ListDef): Promise<Answer> {
  try {
    return classifyCodes(await dns.resolve4(name), {
      refusalCodes: list?.refusalCodes,
      notListed: list?.notListed,
    });
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code ?? "";
    return ANSWERED_ABSENT.has(code) ? { kind: "absent" } : { kind: "error" };
  }
}

/* ── Proving a list is talking ────────────────────────────────────────── */

/* Controls are identical for every visitor, so asking them per check would be
   fifty lookups spent re-learning the same fact. Short enough that a list
   coming back stays broken for minutes rather than hours. */
const CONTROL_TTL_MS = 10 * 60 * 1000;
const controlMemo = new Map<string, { until: number; status: ListStatus }>();

async function listStatus(list: ListDef): Promise<ListStatus> {
  const hit = controlMemo.get(list.id);
  if (hit && hit.until > Date.now()) return hit.status;

  /* The controls are asked raw. `notListed` must not apply here: PBL codes are
     a perfectly good proof of life even though they are not a listing. */
  const [listed, clean] = await Promise.all([
    ask(`${list.control}.${list.zone}`, { ...list, notListed: undefined }),
    ask(`${list.clean}.${list.zone}`, { ...list, notListed: undefined }),
  ]);

  let status: ListStatus;
  if (listed.kind === "refused" || clean.kind === "refused") status = "refused";
  else if (listed.kind === "error" || clean.kind === "error") status = "silent";
  /* It failed to list the name it is required to list. Whatever it is doing,
     it is not answering us, and its silence about a real domain is worthless. */
  else if (listed.kind !== "listed") status = "silent";
  /* It listed a name it is required not to list, so it lists everything. */
  else if (clean.kind !== "absent") status = "wildcard";
  else status = "answered";

  controlMemo.set(list.id, { until: Date.now() + CONTROL_TTL_MS, status });
  return status;
}

/** The roster for this deployment. Spamhaus joins it only with a key. */
export function activeLists(): ListDef[] {
  return [...LISTS, ...spamhausLists(process.env.SPAMHAUS_DQS_KEY)];
}

/* ── Targets ──────────────────────────────────────────────────────────── */

export interface SpfTargets {
  /** Addresses the domain publishes as its own, one host each. */
  ips: string[];
  /** Ranges we refuse to enumerate, with how many addresses they cover. */
  ranges: { mechanism: string; addresses: number }[];
  /** Platforms authorised to send. Named, never expanded. */
  includes: string[];
}

/* A /24 is 256 lookups per list. Checking eight of them and calling the range
   clean would be a sample dressed up as a verdict, so ranges are reported as
   ranges and only genuine single hosts are queried. Three is the cap because
   every host costs one query per address list, and free lists have fair-use
   limits we intend to stay inside. */
const MAX_IP_TARGETS = 3;

export function spfTargets(spf: string | null): SpfTargets {
  const out: SpfTargets = { ips: [], ranges: [], includes: [] };
  if (!spf) return out;

  for (const raw of spf.split(/\s+/)) {
    const token = raw.replace(/^[+\-~?]/, "");
    const lower = token.toLowerCase();

    if (lower.startsWith("include:")) {
      const host = token.slice("include:".length).toLowerCase();
      if (host && !out.includes.includes(host)) out.includes.push(host);
      continue;
    }

    if (lower.startsWith("ip4:") || lower.startsWith("ip6:")) {
      const value = token.slice(4);
      const [address, prefix] = value.split("/");
      if (!address) continue;
      const v6 = lower.startsWith("ip6:");
      const bits = prefix ? Number(prefix) : v6 ? 128 : 32;
      if (!Number.isFinite(bits)) continue;

      const full = v6 ? 128 : 32;
      const addresses = bits >= full ? 1 : 2 ** (full - bits);
      if (addresses === 1) {
        if (!out.ips.includes(address)) out.ips.push(address);
      } else {
        out.ranges.push({ mechanism: token, addresses });
      }
    }
  }

  out.ips = out.ips.slice(0, MAX_IP_TARGETS);
  return out;
}

/** Reverse an address into the label order a DNSBL expects. */
export function reverseAddress(ip: string): string | null {
  if (ip.includes(":")) return reverseIpv6(ip);
  const octets = ip.split(".");
  if (octets.length !== 4) return null;
  if (!octets.every((o) => /^\d{1,3}$/.test(o) && Number(o) <= 255)) return null;
  return octets.reverse().join(".");
}

function reverseIpv6(ip: string): string | null {
  const [head, tail] = ip.split("::");
  const left = head ? head.split(":") : [];
  const right = tail ? tail.split(":") : [];
  if (ip.split("::").length > 2) return null;
  const missing = 8 - left.length - right.length;
  if (tail === undefined && left.length !== 8) return null;
  if (tail !== undefined && missing < 0) return null;
  const groups = [...left, ...Array<string>(tail === undefined ? 0 : missing).fill("0"), ...right];
  if (groups.length !== 8) return null;
  let nibbles = "";
  for (const group of groups) {
    if (!/^[0-9a-f]{0,4}$/i.test(group)) return null;
    nibbles += group.padStart(4, "0").toLowerCase();
  }
  return nibbles.split("").reverse().join(".");
}

/* ── Querying ─────────────────────────────────────────────────────────── */

/** Same helper as dns-check's private one; duplicated to keep the seams apart. */
async function txt(name: string): Promise<string[]> {
  try {
    return (await dns.resolveTxt(name)).map((chunks) => chunks.join(""));
  } catch {
    return [];
  }
}

const RULE = "fix-the-cause-before-blocklist-removal";

async function usableLists(): Promise<{ usable: ListDef[]; reports: ListReport[] }> {
  const statuses = await Promise.all(
    activeLists().map(async (list) => ({ list, status: await listStatus(list) })),
  );
  return {
    usable: statuses.filter((s) => s.status === "answered").map((s) => s.list),
    reports: statuses.map((s) => ({
      id: s.list.id,
      label: s.list.label,
      kind: s.list.kind,
      status: s.status,
    })),
  };
}

async function queryAll(
  lists: ListDef[],
  subject: string,
  name: (list: ListDef) => string,
): Promise<Hit[]> {
  const answers = await Promise.all(
    lists.map(async (list) => ({ list, answer: await ask(name(list), list) })),
  );
  return answers
    .filter((a) => a.answer.kind === "listed")
    .map((a) => ({ list: a.list, subject, codes: (a.answer as { codes: string[] }).codes }));
}

/** Every address list, against one address. The message check's entry point. */
export async function checkAddress(ip: string): Promise<{ hits: Hit[]; reports: ListReport[] }> {
  const reversed = reverseAddress(ip);
  const { usable, reports } = await usableLists();
  if (!reversed) return { hits: [], reports };
  const ipLists = usable.filter((l) => l.target === "ip");
  return { hits: await queryAll(ipLists, ip, (l) => `${reversed}.${l.zone}`), reports };
}

export async function checkBlocklists(
  domain: string,
  options: { spf?: string | null } = {},
): Promise<BlocklistResult> {
  const spf =
    options.spf !== undefined
      ? options.spf
      : ((await txt(domain)).find((r) => r.toLowerCase().startsWith("v=spf1")) ?? null);
  const targets = spfTargets(spf);

  const { usable, reports } = await usableLists();
  const domainLists = usable.filter((l) => l.target === "domain");
  const ipLists = usable.filter((l) => l.target === "ip");

  const [domainHits, ipHitLists] = await Promise.all([
    queryAll(domainLists, domain, (l) => `${domain}.${l.zone}`),
    Promise.all(
      targets.ips.map(async (ip) => {
        const reversed = reverseAddress(ip);
        return reversed ? queryAll(ipLists, ip, (l) => `${reversed}.${l.zone}`) : [];
      }),
    ),
  ]);

  const hits = [...domainHits, ...ipHitLists.flat()];
  const actionable = hits.filter((h) => h.list.kind === "address");
  const contextual = hits.filter((h) => h.list.kind !== "address");
  const unusable = reports.filter((r) => r.status !== "answered");

  return {
    findings: buildFindings({ domain, targets, hits, domainLists, ipLists, unusable }),
    lists: reports,
    reliable: unusable.length === 0,
    actionable,
    contextual,
  };
}

/* ── Findings ─────────────────────────────────────────────────────────── */

const DELISTING_LINE: Record<Delisting, string> = {
  automatic: "It expires on its own once the behaviour behind it stops; nobody has to ask.",
  "self-service": "Whoever holds this address can request removal directly.",
  "network-owner":
    "Only the network that owns the address can remove it, which on a shared sending pool means your platform rather than you.",
};

function buildFindings({
  domain,
  targets,
  hits,
  domainLists,
  ipLists,
  unusable,
}: {
  domain: string;
  targets: SpfTargets;
  hits: Hit[];
  domainLists: ListDef[];
  ipLists: ListDef[];
  unusable: ListReport[];
}): Finding[] {
  const findings: Finding[] = [];
  const evidence = (h: Hit) => `${h.subject} on ${h.list.zone} → ${h.codes.join(", ")}`;

  /* ── Entries that are genuinely about this sender ──────────────────── */
  for (const hit of hits.filter((h) => h.list.kind === "address")) {
    findings.push({
      severity: "fail",
      title: `${hit.subject} is listed on ${hit.list.label}`,
      detail: `${hit.list.describes} ${DELISTING_LINE[hit.list.delisting]} Read the rule before requesting removal — coming off without fixing what put you there is how a listing comes back.`,
      rule: RULE,
      term: "reputation",
      evidence: evidence(hit),
    });
  }

  /* ── Entries about the neighbourhood, which is the whole point ──────── */
  for (const hit of hits.filter((h) => h.list.kind === "neighbourhood")) {
    findings.push({
      severity: "info",
      title: `${hit.list.label} lists ${hit.subject}, and that is a statement about the network, not about you`,
      detail: `${hit.list.describes} Every other checker renders this identically to a listing against your own address, which is how people end up paying to remove an entry that was never theirs and that they have no standing to remove. ${DELISTING_LINE[hit.list.delisting]}`,
      rule: RULE,
      term: "reputation",
      evidence: evidence(hit),
    });
  }

  /* ── Entries that are not about spam at all ─────────────────────────── */
  for (const hit of hits.filter((h) => h.list.kind === "not-spam")) {
    findings.push({
      severity: "info",
      title: `${hit.list.label} has an entry for ${hit.subject}, and it is not a spam listing`,
      detail: `${hit.list.describes} Worth knowing, and not worth alarm. ${DELISTING_LINE[hit.list.delisting]}`,
      term: "reputation",
      evidence: evidence(hit),
    });
  }

  /* ── The clean answers, which have to be as legible as the hits ─────── */
  const listedSubjects = new Set(hits.filter((h) => h.list.kind === "address").map((h) => h.subject));
  if (domainLists.length && !listedSubjects.has(domain)) {
    findings.push({
      severity: "pass",
      title: `${domain} is not on ${joinNames(domainLists.map((l) => l.label))}`,
      detail:
        "A domain listing is the half that follows your brand rather than your sending platform, so it is the half no change of tool would fix. These are the domain lists that answered us today.",
      term: "reputation",
    });
  }
  const cleanIps = targets.ips.filter((ip) => !listedSubjects.has(ip));
  if (cleanIps.length && ipLists.length) {
    findings.push({
      severity: "pass",
      title: `The ${cleanIps.length} address${cleanIps.length > 1 ? "es" : ""} your own SPF names ${cleanIps.length > 1 ? "are" : "is"} not listed`,
      detail: `Checked against ${ipLists.length} address list${ipLists.length > 1 ? "s" : ""} that answered today.`,
      term: "spf",
      evidence: cleanIps.join(", "),
    });
  }

  /* ── What we will not pretend to have checked ───────────────────────── */
  if (targets.includes.length) {
    findings.push({
      severity: "info",
      title: `${targets.includes.length} sending platform${targets.includes.length > 1 ? "s are" : " is"} authorised in your SPF, and nobody can check their pools`,
      detail:
        "These resolve to tens or hundreds of thousands of addresses — one large platform authorises over 400,000 — so no tool checks them, including the ones that imply they do. What can be checked is the single address that actually delivered a real message, which is why the message check exists. On a shared pool the reputation and the removal channel belong to the platform anyway.",
      rule: RULE,
      term: "esp",
      evidence: targets.includes.join(", "),
    });
  }

  if (targets.ranges.length) {
    const total = targets.ranges.reduce((sum, r) => sum + r.addresses, 0);
    findings.push({
      severity: "info",
      title: `Your SPF also authorises ${total.toLocaleString("en")} addresses as ranges, which we do not check`,
      detail:
        "Querying a handful out of a /24 and reporting the range as clean would be a sample presented as a verdict.",
      term: "spf",
      evidence: targets.ranges
        .map((r) => `${r.mechanism} (${r.addresses.toLocaleString("en")})`)
        .join(", "),
    });
  }

  if (unusable.length) {
    findings.push({
      severity: "info",
      title: `We could not ask ${joinNames(unusable.map((s) => s.label))}`,
      detail:
        "Reported rather than quietly dropped. A blocklist that declines to answer looks exactly like one reporting you clean, and counting the difference as a pass is how a checker tells you that you are fine when it never managed to ask. Nothing above covers these.",
      term: "reputation",
      evidence: unusable.map((s) => `${s.label}: ${describeStatus(s.status)}`).join("\n"),
    });
  }

  return findings;
}

export function describeStatus(status: ListStatus): string {
  switch (status) {
    case "refused":
      return "declined the query — this list refuses shared resolvers";
    case "wildcard":
      return "answered a control it is required not to list, so it answers everything";
    case "silent":
      return "did not confirm the entry it is required to publish";
    default:
      return "answered";
  }
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** For /blocklists: probe every zone and report, without checking anybody. */
export async function censusLists(): Promise<ListReport[]> {
  return (await usableLists()).reports;
}

export { EXCLUDED as EXCLUDED_LISTS };
