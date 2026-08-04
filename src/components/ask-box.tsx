import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

/**
 * The front door, in one component, so there is exactly one of it.
 *
 * It used to live twice: once at the bottom of the homepage, below five
 * screens of shelf, and once on /check. A visitor whose actual sentence is
 * "our emails are going to spam" met a wall of prose before meeting anything
 * they could type into. Two copies of the same box also meant two chances to
 * drift apart, and they had.
 *
 * A plain form posting to a route handler, deliberately not a server action:
 * the one on /check/message posted nothing at all from a real browser once an
 * extension broke hydration, and the way into the product does not get to
 * depend on React being alive.
 */
export function AskBox({
  id = "q",
  rows = 2,
  align = "center",
  className,
}: {
  id?: string;
  rows?: number;
  /** The homepage centres on its own axis; /check is a left-aligned document. */
  align?: "center" | "start";
  className?: string;
}) {
  return (
    <form
      method="post"
      action="/api/detect"
      className={cn("max-w-[640px]", align === "center" && "mx-auto", className)}
    >
      <label htmlFor={id} className="sr-only">
        A domain, an address, an IP, or a whole message
      </label>
      <textarea
        id={id}
        name="q"
        required
        rows={rows}
        spellCheck={false}
        placeholder={
          "yourbrand.com   ·   hello@yourbrand.com   ·   23.83.223.10\n…or paste a whole message"
        }
        className="num field-sizing-content max-h-[32vh] min-h-[4.75rem] w-full resize-y rounded-xl border bg-card px-4 py-3.5 text-left text-[14px] leading-relaxed outline-none focus-visible:ring-[3px] focus-visible:ring-accent/25"
        style={{ boxShadow: "var(--lift)" }}
      />
      <div
        className={cn(
          "mt-3 flex flex-wrap items-center gap-x-4 gap-y-2",
          align === "center" ? "justify-center sm:justify-start" : "justify-start",
        )}
      >
        <button
          type="submit"
          className={cn(buttonVariants({ size: "lg" }), "h-11 rounded-[10px] px-6 font-medium")}
        >
          Read it
        </button>
        <span className="text-[13px] text-dim">
          No account. Nothing stored but the findings. Never a score.
        </span>
      </div>
    </form>
  );
}

/**
 * The three things this site can answer that a DNS lookup cannot, named on the
 * way in rather than left in the footer.
 *
 * Thirty-six routes existed and four were reachable from the header, which put
 * the two most differentiated surfaces on the site — the message check and the
 * census — behind a scroll to the bottom of a page nobody scrolls to the bottom
 * of. Each line here states what the destination answers, not what it is
 * called; "Blocklist census" tells a marketer nothing, "which lists answer and
 * which publish nothing" tells them whether to click.
 */
const SURFACES = [
  {
    href: "/dmarc",
    label: "Who is sending as you",
    note: "Every mailbox provider already mails you this daily. We read it. No account.",
  },
  {
    href: "/check/message",
    label: "Send a real campaign",
    note: "DNS cannot name the address that actually sent your mail. A message can.",
  },
  {
    href: "/blocklists",
    label: "Which blocklists answer",
    note: "Re-probed hourly. A dead list returns the same silence as a clean result.",
  },
  {
    href: "/esp",
    label: "Your sending platform",
    note: "What Klaviyo, Mailchimp, Sendgrid and the rest changed, with dates.",
  },
] as const;

export function Surfaces({ className }: { className?: string }) {
  return (
    <ul
      className={cn(
        "grid list-none gap-px overflow-hidden border-y bg-border p-0 sm:grid-cols-2 lg:grid-cols-4",
        className,
      )}
    >
      {SURFACES.map((s) => (
        <li key={s.href} className="bg-bg">
          <Link href={s.href} className="group block h-full px-5 py-6 text-left hover:bg-muted/60">
            <p className="flex items-baseline gap-1.5 text-[14.5px] font-medium">
              {s.label}
              <span aria-hidden className="text-dim transition-transform group-hover:translate-x-0.5">
                →
              </span>
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-fg">{s.note}</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
