import { promises as dns } from "node:dns";
import type { Finding } from "./dns-check";

/* No `server-only` here, for the same reason domain-snapshot.ts omits it: the
   parsing and classification below are the part most worth testing, and the
   suite runs under plain Node where that import throws. Nothing in this file
   runs anywhere but the server regardless — it opens raw DNS sockets. */

/**
 * Blocklists, asked honestly.
 *
 * Every free checker in this category runs the same query and reports the same
 * two outcomes: listed, or clean. There is a third outcome, it is common, and
 * reporting it as one of the other two is how these tools mislead people.
 *
 * A DNSBL can decline to answer. Spamhaus refuses queries from public
 * resolvers, and the shape of the refusal depends on which resolver asked:
 * measured on 3 Aug 2026, `zen.spamhaus.org` returned 127.255.255.254 through
 * Cloudflare — an error code — and NXDOMAIN through Google, for a name that is
 * definitely listed. The first reads as "listed on everything" to a naive
 * parser. The second, far worse, reads as "clean". A checker that cannot tell
 * a refusal from an answer will confidently tell a marketer their domain is
 * fine when it never managed to ask.
 *
 * So nothing here trusts a list's silence until the list has proved, on this
 * run, that it is still talking:
 *
 *  1. Every list answers a control it MUST list. RFC 5782 §5 requires an IP
 *     DNSBL to contain 127.0.0.2, which gives every IP list a positive control
 *     for free. Domain lists carry their own published test name.
 *  2. Every list answers a control it MUST NOT list — 127.0.0.1 under the same
 *     RFC. A zone answering that is answering everything, exactly like the
 *     wildcard `_domainkey` case in dns-check.ts, and its verdicts are fiction.
 *  3. A list failing either control is reported as unanswered. Never as clean.
 *
 * The result is a check that shrinks rather than lies: on a bad day it tells
 * you it could only reach three of five lists, and names the two it could not.
 */

export type ListKind = "ip" | "domain";

/** Answered honestly, declined to answer, or answered everything. */
export type ListStatus = "answered" | "refused" | "wildcard" | "silent";

export interface ListReport {
  id: string;
  label: string;
  kind: ListKind;
  status: ListStatus;
}

export interface BlocklistResult {
  findings: Finding[];
  /** Per-list outcome, so /methodology and the page can name what we asked. */
  lists: ListReport[];
  /** Every list we intended to ask actually answered. Gates history writes. */
  reliable: boolean;
  listedOn: number;
}

/**
 * The lists, and why these.
 *
 * Two are deliberately absent and both absences are the point:
 *
 *  - **Spamhaus** is the one that matters most and the one we cannot ask. Its
 *    free zones refuse cloud resolvers, and every deployment of this site runs
 *    on one. It switches on the moment SPAMHAUS_DQS_KEY holds a Data Query
 *    Service key, and not before, because a Spamhaus verdict read through a
 *    refused query is worse than no Spamhaus verdict.
 *  - **Barracuda** requires registering the IP addresses that will query it.
 *    Serverless functions do not have a stable egress address to register, so
 *    using it here would mean using it outside its terms. A site that demands
 *    a primary source for every sentence does not get to do that quietly.
 */
interface ListDef {
  id: string;
  zone: string;
  label: string;
  kind: ListKind;
  /** A name this list must return as listed, or its silence means nothing. */
  control: string;
  /** A name this list must return as absent. Catches a zone answering all. */
  clean: string;
  /** Return codes this list uses to mean "we declined", beyond 127.255.255.x. */
  refusalCodes?: string[];
  /** Cited on /methodology. */
  home: string;
}

const IP_CONTROL_LISTED = "2.0.0.127";
const IP_CONTROL_CLEAN = "1.0.0.127";

const LISTS: ListDef[] = [
  {
    id: "spamcop",
    zone: "bl.spamcop.net",
    label: "SpamCop",
    kind: "ip",
    control: IP_CONTROL_LISTED,
    clean: IP_CONTROL_CLEAN,
    home: "https://www.spamcop.net/bl.shtml",
  },
  {
    id: "psbl",
    zone: "psbl.surriel.com",
    label: "PSBL",
    kind: "ip",
    control: IP_CONTROL_LISTED,
    clean: IP_CONTROL_CLEAN,
    home: "https://psbl.org/",
  },
  {
    id: "mailspike",
    zone: "bl.mailspike.net",
    label: "Mailspike",
    kind: "ip",
    control: IP_CONTROL_LISTED,
    clean: IP_CONTROL_CLEAN,
    home: "https://mailspike.org/",
  },
  {
    id: "sem",
    zone: "bl.spameatingmonkey.net",
    label: "Spam Eating Monkey",
    kind: "ip",
    control: IP_CONTROL_LISTED,
    clean: IP_CONTROL_CLEAN,
    home: "https://spameatingmonkey.com/services",
  },
  {
    id: "uribl",
    zone: "multi.uribl.com",
    label: "URIBL",
    kind: "domain",
    control: "test.uribl.com",
    /* Their own published example of a name that is not listed. */
    clean: "example.com",
    /* URIBL answers 127.0.0.1 when it is refusing the querier rather than
       reporting a listing. Without this it reads as a hit on every domain. */
    refusalCodes: ["127.0.0.1"],
    home: "https://uribl.com/about.shtml",
  },
];

/** Spamhaus, only when we can ask it properly. */
function spamhausLists(): ListDef[] {
  const key = process.env.SPAMHAUS_DQS_KEY?.trim();
  if (!key || !/^[a-z0-9]{8,64}$/i.test(key)) return [];
  return [
    {
      id: "spamhaus-zen",
      zone: `${key}.zen.dq.spamhaus.net`,
      label: "Spamhaus ZEN",
      kind: "ip",
      control: IP_CONTROL_LISTED,
      clean: IP_CONTROL_CLEAN,
      home: "https://www.spamhaus.org/blocklists/spamhaus-blocklist/",
    },
    {
      id: "spamhaus-dbl",
      zone: `${key}.dbl.dq.spamhaus.net`,
      label: "Spamhaus DBL",
      kind: "domain",
      control: "dbltest.com",
      clean: "example.com",
      home: "https://www.spamhaus.org/blocklists/domain-blocklist/",
    },
  ];
}

function activeLists(): ListDef[] {
  return [...LISTS, ...spamhausLists()];
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

/** Classify a set of A answers. Pure, so the refusal rule can be tested. */
export function classifyCodes(codes: string[], refusalCodes?: string[]): Answer {
  if (!codes.length) return { kind: "absent" };
  if (codes.some((c) => isRefusalCode(c, refusalCodes))) return { kind: "refused", codes };
  return { kind: "listed", codes };
}

/* NXDOMAIN and NODATA are answers — the name is not in the zone. Everything
   else means our resolver fell over and we did not actually ask. */
const ANSWERED_ABSENT = new Set(["ENOTFOUND", "ENODATA"]);

async function ask(name: string, refusalCodes?: string[]): Promise<Answer> {
  try {
    return classifyCodes(await dns.resolve4(name), refusalCodes);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code ?? "";
    return ANSWERED_ABSENT.has(code) ? { kind: "absent" } : { kind: "error" };
  }
}

/* ── Proving a list is talking ────────────────────────────────────────── */

/* Controls are identical for every visitor, so asking them per check would be
   ten lookups spent re-learning the same fact. Short enough that a list coming
   back stays broken for minutes, not hours. */
const CONTROL_TTL_MS = 10 * 60 * 1000;
const controlMemo = new Map<string, { until: number; status: ListStatus }>();

async function listStatus(list: ListDef): Promise<ListStatus> {
  const hit = controlMemo.get(list.id);
  if (hit && hit.until > Date.now()) return hit.status;

  const [listed, clean] = await Promise.all([
    ask(`${list.control}.${list.zone}`, list.refusalCodes),
    ask(`${list.clean}.${list.zone}`, list.refusalCodes),
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
   ranges and only genuine single hosts are queried. */
const MAX_BLOCK_ADDRESSES = 8;
const MAX_IP_TARGETS = 8;

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
      if (addresses <= MAX_BLOCK_ADDRESSES && addresses === 1) {
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

/* ── The check ────────────────────────────────────────────────────────── */

/** Same helper as dns-check's private one; duplicated to keep the seams apart. */
async function txt(name: string): Promise<string[]> {
  try {
    return (await dns.resolveTxt(name)).map((chunks) => chunks.join(""));
  } catch {
    return [];
  }
}

const RULE = "fix-the-cause-before-blocklist-removal";

export async function checkBlocklists(
  domain: string,
  options: { spf?: string | null } = {},
): Promise<BlocklistResult> {
  const lists = activeLists();

  const spf =
    options.spf !== undefined
      ? options.spf
      : ((await txt(domain)).find((r) => r.toLowerCase().startsWith("v=spf1")) ?? null);
  const targets = spfTargets(spf);

  const statuses = await Promise.all(
    lists.map(async (list) => ({ list, status: await listStatus(list) })),
  );
  const usable = statuses.filter((s) => s.status === "answered");
  const unusable = statuses.filter((s) => s.status !== "answered");

  const domainLists = usable.filter((s) => s.list.kind === "domain").map((s) => s.list);
  const ipLists = usable.filter((s) => s.list.kind === "ip").map((s) => s.list);

  /* One query per target per list, all at once. Targets are already capped. */
  const [domainHits, ipHits] = await Promise.all([
    Promise.all(
      domainLists.map(async (list) => ({
        list,
        answer: await ask(`${domain}.${list.zone}`, list.refusalCodes),
      })),
    ),
    Promise.all(
      ipLists.flatMap((list) =>
        targets.ips.map(async (ip) => {
          const reversed = reverseAddress(ip);
          return {
            list,
            ip,
            answer: reversed
              ? await ask(`${reversed}.${list.zone}`, list.refusalCodes)
              : ({ kind: "error" } as Answer),
          };
        }),
      ),
    ),
  ]);

  const findings: Finding[] = [];

  /* ── The domain itself ──────────────────────────────────────────────── */
  const domainListed = domainHits.filter((h) => h.answer.kind === "listed");
  if (domainListed.length) {
    findings.push({
      severity: "fail",
      title: `${domain} is listed on ${joinNames(domainListed.map((h) => h.list.label))}`,
      detail:
        "A domain listing is the half of this that is unambiguously yours: it follows your From address and your links wherever you send them, so no change of sending platform moves it. Read the rule before requesting removal — coming off without fixing what put you there is how domains come back.",
      rule: RULE,
      term: "reputation",
      evidence: domainListed
        .map((h) => `${h.list.zone} → ${(h.answer as { codes: string[] }).codes.join(", ")}`)
        .join("\n"),
    });
  } else if (domainLists.length) {
    findings.push({
      severity: "pass",
      title: `${domain} is not on ${joinNames(domainLists.map((l) => l.label))}`,
      detail:
        "Checked against the domain blocklists that answered us today. A domain list is the one that follows your brand rather than your sending platform, which is why it is the half worth watching.",
      term: "reputation",
    });
  }

  /* ── Addresses the domain publishes as its own ──────────────────────── */
  const ipListed = ipHits.filter((h) => h.answer.kind === "listed");
  if (ipListed.length) {
    const byIp = new Map<string, string[]>();
    for (const hit of ipListed) {
      byIp.set(hit.ip, [...(byIp.get(hit.ip) ?? []), hit.list.label]);
    }
    findings.push({
      severity: "fail",
      title: `${byIp.size === 1 ? "An address" : `${byIp.size} addresses`} your own SPF authorises ${byIp.size === 1 ? "is" : "are"} listed`,
      detail:
        "These are addresses you publish as yours, not your platform's shared pool, so the removal request is yours to make and the cause is yours to find first.",
      rule: RULE,
      term: "reputation",
      evidence: [...byIp].map(([ip, on]) => `${ip} → ${on.join(", ")}`).join("\n"),
    });
  } else if (targets.ips.length && ipLists.length) {
    findings.push({
      severity: "pass",
      title: `The ${targets.ips.length} address${targets.ips.length > 1 ? "es" : ""} your SPF names directly ${targets.ips.length > 1 ? "are" : "is"} not listed`,
      detail: `Checked against ${joinNames(ipLists.map((l) => l.label))}.`,
      term: "spf",
      evidence: targets.ips.join(", "),
    });
  }

  /* ── The platforms' pools, named and not expanded ───────────────────── */
  if (targets.includes.length) {
    findings.push({
      severity: "info",
      title: `${targets.includes.length} sending platform${targets.includes.length > 1 ? "s are" : " is"} authorised in your SPF, and their addresses are not yours`,
      detail:
        "We do not expand these. On a shared pool the reputation and the removal channel belong to the platform, so a listing there is a support ticket rather than a job — and a checker that hands you a stranger's listed IP has handed you a fire you cannot put out. The rule below has the owner table.",
      rule: RULE,
      term: "esp",
      evidence: targets.includes.join(", "),
    });
  }

  /* ── Ranges we will not sample ──────────────────────────────────────── */
  if (targets.ranges.length) {
    const total = targets.ranges.reduce((sum, r) => sum + r.addresses, 0);
    findings.push({
      severity: "info",
      title: `Your SPF also authorises ${total.toLocaleString("en")} addresses as ranges, which we do not check`,
      detail:
        "Querying eight of a /24 and reporting the range as clean would be a sample presented as a verdict. If these are yours and you send from them, check them at the operator directly.",
      term: "spf",
      evidence: targets.ranges.map((r) => `${r.mechanism} (${r.addresses.toLocaleString("en")})`).join(", "),
    });
  }

  /* ── What we could not ask ──────────────────────────────────────────── */
  if (unusable.length) {
    findings.push({
      severity: "info",
      title: `We could not ask ${joinNames(unusable.map((s) => s.list.label))}`,
      detail:
        "Reported rather than quietly dropped, because a blocklist that declines to answer looks exactly like one reporting you clean. Nothing above covers these lists.",
      term: "reputation",
      evidence: unusable.map((s) => `${s.list.label}: ${describeStatus(s.status)}`).join("\n"),
    });
  }

  return {
    findings,
    lists: statuses.map((s) => ({
      id: s.list.id,
      label: s.list.label,
      kind: s.list.kind,
      status: s.status,
    })),
    reliable: unusable.length === 0,
    listedOn: new Set([
      ...domainListed.map((h) => h.list.id),
      ...ipListed.map((h) => h.list.id),
    ]).size,
  };
}

function describeStatus(status: ListStatus): string {
  switch (status) {
    case "refused":
      return "declined the query — these lists refuse public resolvers";
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
