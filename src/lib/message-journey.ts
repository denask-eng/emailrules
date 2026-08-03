import { GLOSSARY, STAGES, type Stage, type StageId } from "@/content/how-email-works";
import type { Finding, Severity } from "./dns-check";

/**
 * A real message, read along the eight stops the explainer already draws.
 *
 * /how-email-works walks a hypothetical email through eight stops and it is
 * the best thing on this site. The message check produced a flat list of
 * findings sorted by alarm, which is the shape that makes somebody read
 * every row to discover that six of them are about the same moment.
 *
 * Every finding is something that went right or wrong at exactly one stop.
 * Grouping them that way turns a list into a story with a beginning: the
 * address was collected, the message was built, it left the building, its
 * identity was checked, reputation decided, the verdict landed. A marketer
 * who has read the explainer already knows this map, and now it is drawn on
 * their own campaign.
 *
 * Nothing is invented to fill a stop. A stop with nothing to say says that a
 * single message cannot show it, which is true and is the honest half of the
 * story: no message can prove how its recipient was collected.
 */

const STAGE_OF_TERM = new Map<string, StageId>(GLOSSARY.map((t) => [t.id, t.stage]));

export interface JourneyStop {
  stage: Stage;
  findings: Finding[];
  fails: number;
  warns: number;
  /** Nothing at this stop, and a single message is why. */
  unseeable: boolean;
}

/**
 * What one message can and cannot show at each stop.
 *
 * Said in the reader's terms rather than left blank, because a blank stop
 * reads as a pass and this is the opposite of a pass: it is the boundary of
 * the method, and the site's whole position is that boundaries get printed.
 */
const CANNOT_SEE: Partial<Record<StageId, string>> = {
  collect:
    "No message can show this. How an address was collected lives in your signup records, and it is the one stop where a checker has nothing to offer and the consequences are the largest.",
  filter:
    "Only partly visible. Blocklists are public and we read them, but the reputation a mailbox provider keeps on you is theirs and they publish none of it.",
  verdict:
    "Not visible from one message. Whether it landed, and where, is a fact about the receiving mailbox rather than about the message we were handed.",
  react:
    "Mostly not visible. What a human did next is your platform's data, though what they were given to react to is in the message and is read above.",
  count:
    "Not visible here. What comes back as numbers is your platform's reporting, and this check deliberately never asks for access to it.",
};

const SEVERITY_ORDER: Record<Severity, number> = { fail: 0, warn: 1, pass: 2, info: 3 };

function stageOf(finding: Finding): StageId | null {
  if (finding.stage) return finding.stage;
  if (finding.term) return STAGE_OF_TERM.get(finding.term) ?? null;
  return null;
}

export interface Journey {
  stops: JourneyStop[];
  /** Findings we will not pretend to place. Rendered, never dropped. */
  unplaced: Finding[];
}

export function toJourney(findings: Finding[]): Journey {
  const byStage = new Map<StageId, Finding[]>();
  const unplaced: Finding[] = [];

  for (const finding of findings) {
    const id = stageOf(finding);
    if (!id) {
      unplaced.push(finding);
      continue;
    }
    byStage.set(id, [...(byStage.get(id) ?? []), finding]);
  }

  const stops = STAGES.map((stage) => {
    const own = (byStage.get(stage.id) ?? []).sort(
      (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
    );
    return {
      stage,
      findings: own,
      fails: own.filter((f) => f.severity === "fail").length,
      warns: own.filter((f) => f.severity === "warn").length,
      unseeable: own.length === 0,
    };
  });

  return { stops, unplaced };
}

/** The one line under a stop's name: what this message said at this stop. */
export function stopVerdict(stop: JourneyStop): string {
  if (stop.unseeable) return CANNOT_SEE[stop.stage.id] ?? "Nothing to report at this stop.";
  if (stop.fails) return `${stop.fails} to fix here.`;
  if (stop.warns) return `${stop.warns} worth a look here.`;
  return "Nothing wrong here.";
}
