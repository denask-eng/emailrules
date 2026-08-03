/**
 * The roster, and what each operator says it lists.
 *
 * Separated from the checking machinery because this file is the argument.
 * Anyone can run twenty-six DNS queries; the reason to use this checker rather
 * than another is that a hit here arrives already sorted into "this is about
 * your address", "this is about your provider's whole network", and "this is
 * not about spam at all". Every one of those verdicts is taken from what the
 * list operator publishes about itself, which is why `describes` and `home`
 * sit next to each other on every row — the claim and the place to check it.
 *
 * What is deliberately NOT here: any statement about which mailbox providers
 * consult which list. Nobody at Google, Microsoft or Yahoo publishes that, so
 * saying it would be the same invented authority this site exists to refuse.
 * A listing is a dataset entry. What a receiver does with it is theirs.
 */

/** What an entry on this list is actually about. */
export type ListKind =
  /** The entry names your specific address or domain. */
  | "address"
  /** The entry covers a range, an ASN or a whole allocation — your neighbours. */
  | "neighbourhood"
  /** The entry describes something that is not spam: backscatter, policy, novelty. */
  | "not-spam";

export type ListTarget = "ip" | "domain";

/** Who can actually get an entry removed. */
export type Delisting =
  /** Ages out on its own; nobody needs to ask. */
  | "automatic"
  /** The person holding the address can request it themselves. */
  | "self-service"
  /** Only the network that owns the address can, which on a shared pool is your platform. */
  | "network-owner";

export interface ListDef {
  id: string;
  zone: string;
  label: string;
  target: ListTarget;
  kind: ListKind;
  /** One line, in the operator's own terms. Checkable at `home`. */
  describes: string;
  home: string;
  delisting: Delisting;
  delistUrl?: string;
  /** A name this list must return as listed, or its silence means nothing. */
  control: string;
  /** A name this list must return as absent. Catches a zone answering everything. */
  clean: string;
  /**
   * Operator-published meaning per return code.
   *
   * Present only where the operator publishes a table we have read. Where they
   * do not, the code is printed verbatim and interpreted no further — a guessed
   * code table is how "listed on Mailspike" becomes a scare on a domain whose
   * actual answer was "reputation: good".
   */
  codes?: Record<string, string>;
  /** Codes that resolve but mean "we declined", beyond 127.255.255.x. */
  refusalCodes?: string[];
  /** Codes that resolve but are not a listing at all. */
  notListed?: string[];
}

/* RFC 5782 §5: an address DNSxL must contain 127.0.0.2 and must not contain
   127.0.0.1. That gives every IP list a positive and a negative control for
   free, and it is the whole reason this checker can tell a dead zone from a
   clean answer. */
export const IP_CONTROL_LISTED = "2.0.0.127";
export const IP_CONTROL_CLEAN = "1.0.0.127";

/**
 * Lists that answered both controls correctly from two independent resolvers
 * on 3 August 2026. Anything that failed is in EXCLUDED below, with the reason,
 * because the list we refuse to query is the only evidence that the list we do
 * query means something.
 */
export const LISTS: ListDef[] = [
  /* ── Address lists ────────────────────────────────────────────────────── */
  {
    id: "spamcop",
    zone: "bl.spamcop.net",
    label: "SpamCop",
    target: "ip",
    kind: "address",
    describes: "Addresses that sent mail reported by SpamCop users. Entries expire on their own once the reports stop.",
    home: "https://www.spamcop.net/bl.shtml",
    delisting: "automatic",
    control: IP_CONTROL_LISTED,
    clean: IP_CONTROL_CLEAN,
  },
  {
    id: "psbl",
    zone: "psbl.surriel.com",
    label: "PSBL",
    target: "ip",
    kind: "address",
    describes: "Addresses observed sending to spam traps, submitted passively. Removal is self-service and immediate.",
    home: "https://psbl.org/",
    delisting: "self-service",
    delistUrl: "https://psbl.org/remove",
    control: IP_CONTROL_LISTED,
    clean: IP_CONTROL_CLEAN,
  },
  {
    id: "mailspike-bl",
    zone: "bl.mailspike.net",
    label: "Mailspike",
    target: "ip",
    kind: "address",
    describes: "Addresses Mailspike scores as sending abuse, from its own live traffic sampling.",
    home: "https://mailspike.org/",
    delisting: "self-service",
    delistUrl: "https://mailspike.org/iplookup.html",
    control: IP_CONTROL_LISTED,
    clean: IP_CONTROL_CLEAN,
  },
  {
    id: "sem-black",
    zone: "bl.spameatingmonkey.net",
    label: "Spam Eating Monkey",
    target: "ip",
    kind: "address",
    describes: "Addresses seen sending spam to Spam Eating Monkey's own systems.",
    home: "https://spameatingmonkey.com/services",
    delisting: "self-service",
    control: IP_CONTROL_LISTED,
    clean: IP_CONTROL_CLEAN,
  },
  {
    id: "blocklist-de",
    zone: "bl.blocklist.de",
    label: "blocklist.de",
    target: "ip",
    kind: "address",
    describes: "Addresses reported by participating servers for attacks and abuse, mail included. Entries age out.",
    home: "https://www.blocklist.de/en/index.html",
    delisting: "self-service",
    delistUrl: "https://www.blocklist.de/en/delist.html",
    control: IP_CONTROL_LISTED,
    clean: IP_CONTROL_CLEAN,
  },
  {
    id: "0spam",
    zone: "bl.0spam.org",
    label: "0SPAM",
    target: "ip",
    kind: "address",
    describes: "Addresses caught by 0SPAM's trap network.",
    home: "https://0spam.org/",
    delisting: "self-service",
    control: IP_CONTROL_LISTED,
    clean: IP_CONTROL_CLEAN,
  },
  {
    id: "interserver",
    zone: "rbl.interserver.net",
    label: "InterServer",
    target: "ip",
    kind: "address",
    describes: "Addresses InterServer observes sending spam into its own hosting network.",
    home: "https://rbl.interserver.net/",
    delisting: "self-service",
    control: IP_CONTROL_LISTED,
    clean: IP_CONTROL_CLEAN,
  },
  {
    id: "spfbl",
    zone: "dnsbl.spfbl.net",
    label: "SPFBL",
    target: "ip",
    kind: "address",
    describes: "Addresses with poor reputation in SPFBL's distributed reputation system.",
    home: "https://spfbl.net/en/dnsbl/",
    delisting: "self-service",
    delistUrl: "https://matrix.spfbl.net/",
    control: IP_CONTROL_LISTED,
    clean: IP_CONTROL_CLEAN,
  },
  {
    id: "gbudb",
    zone: "truncate.gbudb.net",
    label: "GBUdb Truncate",
    target: "ip",
    kind: "address",
    describes: "Addresses GBUdb has only ever seen sending spam, with no legitimate traffic recorded.",
    home: "http://www.gbudb.com/truncate/index.jsp",
    delisting: "automatic",
    control: IP_CONTROL_LISTED,
    clean: IP_CONTROL_CLEAN,
  },
  {
    id: "s5h",
    zone: "all.s5h.net",
    label: "s5h.net",
    target: "ip",
    kind: "address",
    describes: "Addresses s5h.net records as sources of spam and abuse.",
    home: "https://www.usenix.org.uk/content/rbl.html",
    delisting: "self-service",
    control: IP_CONTROL_LISTED,
    clean: IP_CONTROL_CLEAN,
  },
  {
    id: "zapbl",
    zone: "dnsbl.zapbl.net",
    label: "ZapBL",
    target: "ip",
    kind: "address",
    describes: "Addresses ZapBL's operators have chosen to list for spam or abuse.",
    home: "https://zapbl.net/",
    delisting: "self-service",
    control: IP_CONTROL_LISTED,
    clean: IP_CONTROL_CLEAN,
  },
  {
    id: "swinog",
    zone: "dnsrbl.swinog.ch",
    label: "SWINOG",
    target: "ip",
    kind: "address",
    describes: "Addresses caught by the Swiss Network Operators Group trap network.",
    home: "https://antispam.imp.ch/",
    delisting: "self-service",
    control: IP_CONTROL_LISTED,
    clean: IP_CONTROL_CLEAN,
  },
  {
    id: "kempt",
    zone: "dnsbl.kempt.net",
    label: "Kempt",
    target: "ip",
    kind: "address",
    describes: "Addresses Kempt.net records as spam sources.",
    home: "https://kempt.net/dnsbl/",
    delisting: "self-service",
    control: IP_CONTROL_LISTED,
    clean: IP_CONTROL_CLEAN,
  },
  {
    id: "anonmails",
    zone: "spam.dnsbl.anonmails.de",
    label: "Anonmails",
    target: "ip",
    kind: "address",
    describes: "Addresses caught by the Anonmails trap network.",
    home: "https://anonmails.de/dnsbl.php",
    delisting: "self-service",
    control: IP_CONTROL_LISTED,
    clean: IP_CONTROL_CLEAN,
  },
  {
    id: "fabel",
    zone: "spamsources.fabel.dk",
    label: "Fabel",
    target: "ip",
    kind: "address",
    describes: "Addresses Fabel has recorded sending spam.",
    home: "https://spamsources.fabel.dk/",
    delisting: "self-service",
    control: IP_CONTROL_LISTED,
    clean: IP_CONTROL_CLEAN,
  },
  {
    id: "nosolicitado",
    zone: "bl.nosolicitado.org",
    label: "NoSolicitado",
    target: "ip",
    kind: "address",
    describes: "Addresses caught by the NoSolicitado trap network.",
    home: "https://www.nosolicitado.org/",
    delisting: "self-service",
    control: IP_CONTROL_LISTED,
    clean: IP_CONTROL_CLEAN,
  },
  {
    id: "jippg",
    zone: "mail-abuse.blacklist.jippg.org",
    label: "JIPPG",
    target: "ip",
    kind: "address",
    describes: "Addresses reported for mail abuse to the Japan IP Providers Protection Group.",
    home: "http://www.jippg.org/",
    delisting: "self-service",
    control: IP_CONTROL_LISTED,
    clean: IP_CONTROL_CLEAN,
  },

  /* ── Neighbourhood lists ──────────────────────────────────────────────── */
  /* The whole reason this checker exists. Every other tool renders a hit here
     identically to a Spamhaus SBL hit, and it is the most common false alarm
     in email: a marketer discovers their sending address is "blacklisted",
     panics, and buys a delisting service — for an entry that was never about
     them and that they could not remove if they tried. */
  {
    id: "uceprotect1",
    zone: "dnsbl-1.uceprotect.net",
    label: "UCEPROTECT Level 1",
    target: "ip",
    kind: "address",
    describes: "Single addresses UCEPROTECT observed sending to its traps. Level 1 is the only one of the three that is about one address.",
    home: "https://www.uceprotect.net/en/index.php",
    delisting: "automatic",
    control: IP_CONTROL_LISTED,
    clean: IP_CONTROL_CLEAN,
  },
  {
    id: "uceprotect2",
    zone: "dnsbl-2.uceprotect.net",
    label: "UCEPROTECT Level 2",
    target: "ip",
    kind: "neighbourhood",
    describes: "Whole address ranges, listed when UCEPROTECT sees repeated Level 1 entries inside them. Your address can appear here having done nothing.",
    home: "https://www.uceprotect.net/en/index.php",
    delisting: "network-owner",
    control: IP_CONTROL_LISTED,
    clean: IP_CONTROL_CLEAN,
  },
  {
    id: "uceprotect3",
    zone: "dnsbl-3.uceprotect.net",
    label: "UCEPROTECT Level 3",
    target: "ip",
    kind: "neighbourhood",
    describes: "Entire autonomous systems — every address a provider announces. An entry here is a statement about your provider, not about you.",
    home: "https://www.uceprotect.net/en/index.php",
    delisting: "network-owner",
    control: IP_CONTROL_LISTED,
    clean: IP_CONTROL_CLEAN,
  },

  /* ── Not about spam ───────────────────────────────────────────────────── */
  {
    id: "backscatterer",
    zone: "ips.backscatterer.org",
    label: "Backscatterer",
    target: "ip",
    kind: "not-spam",
    describes: "Addresses that sent misdirected bounces or auto-replies. Its operators state plainly that this is not a spam list and should never be used to reject normal mail.",
    home: "https://www.backscatterer.org/",
    delisting: "self-service",
    control: IP_CONTROL_LISTED,
    clean: IP_CONTROL_CLEAN,
  },
  {
    id: "sem-backscatter",
    zone: "backscatter.spameatingmonkey.net",
    label: "SEM Backscatter",
    target: "ip",
    kind: "not-spam",
    describes: "Addresses seen sending backscatter — bounces to forged senders. A different failure from sending spam.",
    home: "https://spameatingmonkey.com/services",
    delisting: "self-service",
    control: IP_CONTROL_LISTED,
    clean: IP_CONTROL_CLEAN,
  },

  /* ── Domain lists ─────────────────────────────────────────────────────── */
  {
    id: "uribl",
    zone: "multi.uribl.com",
    label: "URIBL",
    target: "domain",
    kind: "address",
    describes: "Domains appearing in the body of spam — the brand and link domains, not the sending address.",
    home: "https://uribl.com/about.shtml",
    delisting: "self-service",
    delistUrl: "https://uribl.com/refresh.shtml",
    control: "test.uribl.com",
    clean: "example.com",
    /* Their own published refusal code. Without this it reads as a hit on
       every domain the moment they rate-limit us. */
    refusalCodes: ["127.0.0.1"],
  },
];

/**
 * Spamhaus, which only exists with a key.
 *
 * Its free zones refuse queries from public resolvers, and every deployment of
 * this site runs on one. Measured 3 Aug 2026, `zen.spamhaus.org` answered an
 * error code through one public resolver and a plain "not listed" through
 * another, for a name that is definitely listed — the second of which is the
 * dangerous one, because a checker reads it as good news. So it switches on
 * with SPAMHAUS_DQS_KEY and not before.
 *
 * Code ranges are Spamhaus's own, from their DQS documentation.
 */
export function spamhausLists(key: string | undefined): ListDef[] {
  const dqs = key?.trim();
  if (!dqs || !/^[a-z0-9]{16,64}$/i.test(dqs)) return [];
  return [
    {
      id: "spamhaus-zen",
      zone: `${dqs}.zen.dq.spamhaus.net`,
      label: "Spamhaus ZEN",
      target: "ip",
      kind: "address",
      describes: "Spamhaus SBL, CSS and XBL for spam sources and compromised machines, plus PBL for addresses whose own provider says they should not be sending mail directly.",
      home: "https://www.spamhaus.org/blocklists/spamhaus-blocklist/",
      delisting: "network-owner",
      delistUrl: "https://check.spamhaus.org/",
      control: IP_CONTROL_LISTED,
      clean: IP_CONTROL_CLEAN,
      codes: {
        "127.0.0.2": "SBL — a spam source Spamhaus lists directly",
        "127.0.0.3": "CSS — a snowshoe or low-reputation spam source",
        "127.0.0.4": "XBL — a compromised or exploited machine",
        "127.0.0.9": "SBL DROP/EDROP — a hijacked or criminal netblock",
        "127.0.0.10": "PBL — the provider states this address should not send mail directly",
        "127.0.0.11": "PBL — the provider states this address should not send mail directly",
      },
      /* PBL is a policy statement made by the network that owns the address,
         not an accusation of spam. On an ESP-sent campaign it says nothing
         about the sender at all, and printing it as a blocklisting would be
         exactly the false alarm this checker exists to stop. */
      notListed: ["127.0.0.10", "127.0.0.11"],
    },
    {
      id: "spamhaus-dbl",
      zone: `${dqs}.dbl.dq.spamhaus.net`,
      label: "Spamhaus DBL",
      target: "domain",
      kind: "address",
      describes: "Domains Spamhaus records as spam domains, or as legitimate domains that have been abused.",
      home: "https://www.spamhaus.org/blocklists/domain-blocklist/",
      delisting: "self-service",
      delistUrl: "https://check.spamhaus.org/",
      control: "dbltest.com",
      clean: "example.com",
    },
    {
      id: "spamhaus-zrd",
      zone: `${dqs}.zrd.dq.spamhaus.net`,
      label: "Spamhaus ZRD",
      target: "domain",
      kind: "not-spam",
      describes: "Domains Spamhaus has only just observed. A hit means the domain is new, which is a fact about its age and not an accusation.",
      home: "https://www.spamhaus.org/blocklists/zero-reputation-domain/",
      delisting: "automatic",
      control: "dbltest.com",
      clean: "example.com",
    },
  ];
}

/** Why a zone we could have queried is not in LISTS. Rendered on /blocklists. */
export interface ExcludedList {
  zone: string;
  label: string;
  reason: string;
}

/**
 * Measured 3 August 2026 against two independent public resolvers, using the
 * RFC 5782 control every address list is required to publish.
 *
 * This is the honest half of "why only twenty-six". A checker can advertise a
 * hundred lists and quietly ask a dozen zones that answer nothing — and every
 * one of those silences is counted as a pass.
 */
export const EXCLUDED: ExcludedList[] = [
  { zone: "dnsbl.sorbs.net", label: "SORBS", reason: "Shut down in June 2024. The zone has no nameserver." },
  { zone: "spam.dnsbl.sorbs.net", label: "SORBS Spam", reason: "Shut down in June 2024. The zone has no nameserver." },
  { zone: "ubl.unsubscore.com", label: "LASHBACK", reason: "No nameserver answers for the zone." },
  { zone: "all.rbl.jp", label: "RBL JP", reason: "No nameserver answers for the zone." },
  { zone: "bl.konstant.no", label: "Konstant", reason: "No nameserver answers for the zone." },
  { zone: "rbl.triumf.ca", label: "TRIUMF", reason: "No nameserver answers for the zone." },
  { zone: "relays.nether.net", label: "NETHERRELAYS", reason: "No nameserver answers for the zone." },
  { zone: "blacklist.woody.ch", label: "Woodys SMTP", reason: "The zone resolves but publishes no RFC 5782 test entry." },
  { zone: "dnsbl.calivent.com.pe", label: "CALIVENT", reason: "The zone resolves but publishes no RFC 5782 test entry." },
  { zone: "forbidden.icm.edu.pl", label: "ICMFORBIDDEN", reason: "The zone resolves but publishes no RFC 5782 test entry." },
  { zone: "spamrbl.imp.ch", label: "IMP SPAM", reason: "The zone resolves but publishes no RFC 5782 test entry." },
  { zone: "wormrbl.imp.ch", label: "IMP WORM", reason: "The zone resolves but publishes no RFC 5782 test entry." },
  { zone: "spam.spamrats.com", label: "RATS Spam", reason: "Neither resolver received an answer for the test entry." },
  { zone: "dyna.spamrats.com", label: "RATS Dyna", reason: "Neither resolver received an answer for the test entry." },
  { zone: "noptr.spamrats.com", label: "RATS NoPtr", reason: "Neither resolver received an answer for the test entry." },
  { zone: "bl.score.senderscore.com", label: "Sender Score", reason: "Answers 127.255.255.255 — it refuses queries from shared resolvers." },
  { zone: "zen.spamhaus.org", label: "Spamhaus ZEN (free zone)", reason: "Refuses shared resolvers, and answers inconsistently through them. Queried instead through the keyed Data Query Service." },
  { zone: "b.barracudacentral.org", label: "Barracuda", reason: "Requires registering the addresses that will query it, and a serverless function has no fixed address to register." },
  { zone: "hostkarma.junkemailfilter.com", label: "Hostkarma", reason: "Returns 127.0.0.1 to mean whitelisted. Until that table is decoded, a hit here would be reported as the opposite of what it says." },
  { zone: "bogons.cymru.com", label: "CYMRU BOGONS", reason: "Lists unroutable space only. A real sending address can never appear, so a hit could only ever be our own bug." },
];
