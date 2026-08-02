import type { Topic } from "@/lib/types";

/** Opening briefing for each topic hub — who should care, common mistakes. */
export const TOPIC_BRIEFS: Record<
  Topic,
  { who: string; watch: string; newbie: string }
> = {
  "consent-tracking": {
    who: "Anyone who collects emails or sends marketing across borders.",
    watch: "Assuming “they bought once” is enough forever, or treating open pixels like free data.",
    newbie:
      "Consent means a clear yes to marketing. Tracking opens can be a separate yes in some countries. Your email tool (ESP) stores the address; you still own whether the permission was real.",
  },
  authentication: {
    who: "Anyone whose mail goes to Gmail, Yahoo, Outlook, or Apple — i.e. almost everyone.",
    watch: "Green ticks inside the ESP that do not mean the From domain is aligned.",
    newbie:
      "Authentication is how inboxes check you are really you: SPF (who may send), DKIM (signature), DMARC (policy). DNS is the public phone book where those records live.",
  },
  "provider-rules": {
    who: "Bulk and lifecycle senders — especially over ~5,000/day to a single provider.",
    watch: "Treating Gmail rules as the only rules; Yahoo, Microsoft and Apple have teeth too.",
    newbie:
      "Mailbox providers (Gmail, Yahoo, Outlook.com, iCloud) set extra rules for high volume. Spam/complaint rates and one-click unsubscribe matter as much as pretty design.",
  },
  "content-claims": {
    who: "Anyone writing subject lines and offers — especially US consumer brands.",
    watch: "Evergreen “today only” flows and fake urgency that do not match the offer.",
    newbie:
      "What you promise in the subject must match the email and the landing experience. Some US states treat misleading subjects as automatic violations.",
  },
  "ai-disclosure": {
    who: "Teams using AI for copy or product imagery into the EU.",
    watch: "Assuming every AI sentence needs a label — the real line is often about synthetic media, not draft copy.",
    newbie:
      "Rules about AI labels are newer and narrow. Read the rule: marketing text and product images are not always treated the same.",
  },
  measurement: {
    who: "Anyone reporting opens, revenue, or “email drove this” to a founder.",
    watch: "Open rate as a north star after Apple Mail Privacy Protection; MPP opens counted as revenue.",
    newbie:
      "Open rate is often a bad KPI now because apps load images without a human read. Prefer clicks, orders, and honest experiments (holdouts) when your tool supports them.",
  },
  "bounces-hygiene": {
    who: "Anyone importing lists, running big databases, or seeing rising blocks.",
    watch: "Purchased lists, never sunsetting inactives, and assuming every ESP bounce rule is the same.",
    newbie:
      "Hygiene is list health: remove dead addresses, do not buy lists, stop mailing people who never engage. Spam traps are fake addresses that punish bad collection.",
  },
};
