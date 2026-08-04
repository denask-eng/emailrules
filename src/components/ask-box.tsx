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
      {/* The button lives inside the field.
          It used to sit underneath and left-aligned while everything above it
          was centred, so on a wide screen the one thing you click drifted off
          the axis of the one thing you read. Putting it in the composer is not
          a borrowed fashion — it is the arrangement that keeps the action on
          the same axis as the input at every width. */}
      <div
        className="relative w-full rounded-2xl border border-input bg-card focus-within:border-accent focus-within:ring-[3px] focus-within:ring-accent/20"
        style={{ boxShadow: "var(--lift)" }}
      >
        {/* One example, not three. The old placeholder printed a domain, an
            address and an IP separated by interpuncts, which told you the field
            was clever before it told you what to type — it read as
            configuration. What it accepts is said in words underneath. */}
        <textarea
          id={id}
          name="q"
          required
          rows={rows}
          spellCheck={false}
          placeholder="yourbrand.com"
          className="num field-sizing-content max-h-[32vh] min-h-[3.5rem] w-full resize-none bg-transparent px-4 pt-4 pb-14 text-left text-[1.05rem] leading-relaxed outline-none placeholder:text-dim sm:pl-5"
        />
        {/* "Read it" was a pun on the paste box and told nobody what happens
            next. A button on a checker says the thing it does. */}
        <button
          type="submit"
          className={cn(
            buttonVariants({ size: "lg" }),
            "absolute right-2.5 bottom-2.5 h-10 rounded-xl px-5 text-[14.5px] font-medium",
          )}
        >
          Check it
        </button>
      </div>

      {/* Three beats, one line, on the same axis as everything above it. */}
      <p className={cn("mt-3 text-[13.5px] text-dim", align === "center" && "text-center")}>
        No account. Free. Never a score.
      </p>
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
/**
 * Four doors, and the DMARC reader is deliberately not one of them.
 *
 * It stays live and works, but it is a product with per-user state on a site
 * that has one subscriber, and promoting it costs attention the shelf needs
 * more. It comes back when there is an audience to bring to it.
 */
const SURFACES = [
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
  /* Added after shipping the corpus and discovering it was reachable only from
     the footer. "How does Gmail decide" is the question this whole audience
     arrives with, and the answer — including the part where Google never said
     it — was three clicks from the front page. */
  {
    href: "/providers",
    label: "What Gmail actually said",
    note: "Their words, with the date. And the things they have never said at all.",
  },
  {
    href: "/freshness",
    label: "How old is this shelf",
    note: "Every claim's date, published — including the ones that are getting old.",
  },
] as const;

export function Surfaces({ className }: { className?: string }) {
  return (
    <ul
      className={cn(
        /* Five doors now, so the wide breakpoint fits five. Leaving it at four
           would strand the newest one alone on a second row, which reads as an
           afterthought rather than as a shelf. */
        "grid list-none gap-px overflow-hidden border-y bg-border p-0 sm:grid-cols-2 lg:grid-cols-5",
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
