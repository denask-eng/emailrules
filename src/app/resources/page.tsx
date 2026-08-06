import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Resources",
  description: "Email authentication, provider rules, blocklists, measurement and machine-readable Emailrules resources.",
  alternates: { canonical: "/resources" },
};

const GROUPS = [
  {
    title: "Understand a campaign",
    links: [
      ["/how-email-works", "How email works", "Headers, DNS, delivery and measurement in the order they happen."],
      ["/check/headers", "Paste message source", "Use the same deterministic engine when an inbound test is unavailable."],
      ["/check", "Check published DNS", "Inspect what a sending domain publishes, separate from a real campaign."],
    ],
  },
  {
    title: "Providers and infrastructure",
    links: [
      ["/providers", "Mailbox providers", "Published Gmail, Yahoo, Microsoft and Apple requirements."],
      ["/esp", "Sending platforms", "Dated changes from Klaviyo, Mailchimp and Braze."],
      ["/blocklists", "Blocklists", "A live census that distinguishes a listing from a refused lookup."],
      ["/dmarc", "DMARC reports", "Receive and read aggregate reports without turning them into a score."],
    ],
  },
  {
    title: "Use the evidence",
    links: [
      ["/brief", "One-page brief", "A shareable operational view of the rules in your setup."],
      ["/embed", "Embed", "A live authentication badge for a domain."],
      ["/agents", "API and agents", "Machine-readable access to the public rule corpus."],
      ["/jurisdictions/eu", "Jurisdictions", "Browse rules by the places in which they apply."],
    ],
  },
] as const;

export default function ResourcesPage() {
  return (
    <div className="shell py-12 sm:py-16">
      <div className="max-w-[720px]">
        <p className="label">Resources</p>
        <h1 className="mt-3 font-serif text-[clamp(2.5rem,7vw,4.8rem)] leading-[0.98] tracking-[-0.04em]">
          The deeper material behind the preflight.
        </h1>
      </div>
      <div className="mt-12 grid gap-10 lg:grid-cols-3">
        {GROUPS.map((group) => (
          <section key={group.title}>
            <h2 className="border-b pb-3 text-[1.1rem] font-semibold">{group.title}</h2>
            <ul className="list-none p-0">
              {group.links.map(([href, title, body]) => (
                <li key={href} className="border-b py-4">
                  <Link href={href} className="group block">
                    <h3 className="text-[15px] font-semibold group-hover:text-accent">{title}</h3>
                    <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-fg">{body}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
