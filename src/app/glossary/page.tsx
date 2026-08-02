import type { Metadata } from "next";
import Link from "next/link";
import { GLOSSARY } from "@/content/glossary";
import { SectionHead } from "@/components/bits";

export const metadata: Metadata = {
  title: "Glossary — plain English for email jargon",
  description:
    "SPF, DKIM, DMARC, soft opt-in, spam traps and more — short definitions for people who ship email, including week-one marketers.",
  alternates: { canonical: "/glossary" },
};

export default function GlossaryPage() {
  const sorted = [...GLOSSARY].sort((a, b) => a.term.localeCompare(b.term));

  return (
    <div className="shell shell-tight py-12 sm:py-16">
      <SectionHead
        label="Glossary"
        title="Every jargon word, in plain English"
        lede="Email is full of acronyms. This page is the parachute. On rule pages, dotted underlines open the same short definitions — you never have to leave to understand a sentence."
      />

      <p className="mt-6 text-[13.5px] text-muted-fg">
        {sorted.length} terms · also linked inline across the site ·{" "}
        <Link href="/rules" className="text-fg underline underline-offset-3">
          Back to rules
        </Link>
      </p>

      <ul className="mt-10 list-none space-y-0 border-t p-0">
        {sorted.map((t) => (
          <li key={t.id} id={t.id} className="scroll-mt-24 border-b py-6">
            <h2 className="text-[1.05rem] font-semibold tracking-tight">{t.term}</h2>
            <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-fg">{t.short}</p>
            <p className="mt-2 max-w-[62ch] text-[14px] leading-relaxed text-muted-fg">{t.long}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
