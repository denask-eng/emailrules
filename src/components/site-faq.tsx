import { SITE_FAQ } from "@/content/faq";

/**
 * Sitewide FAQ — brutal + funny, collapses cleanly so it doesn’t dominate.
 * Renders in the layout so every page carries the same human contract.
 */
export function SiteFaq() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: SITE_FAQ.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <section
      id="faq"
      className="no-print border-t bg-bg-2"
      aria-labelledby="site-faq-heading"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="shell py-14 sm:py-16">
        <div className="mx-auto max-w-[40rem] text-center sm:mx-0 sm:max-w-none sm:text-left">
          <p className="label">FAQ · no marketing answers</p>
          <h2
            id="site-faq-heading"
            className="mt-2 text-[clamp(1.35rem,3.2vw,1.75rem)] font-semibold tracking-tight"
          >
            The awkward questions, answered like a human.
          </h2>
          <p className="mt-2 max-w-[52ch] text-[14.5px] leading-relaxed text-muted-fg">
            Why it isn&rsquo;t a law library, a score app, or an AI content farm — and what we
            refuse on purpose.
          </p>
        </div>

        <div className="mx-auto mt-8 max-w-[720px] divide-y divide-border-soft border-y border-border-soft">
          {SITE_FAQ.map((item) => (
            <details key={item.q} className="group py-0">
              <summary className="cursor-pointer list-none py-4 pr-8 text-left text-[15px] font-semibold tracking-tight text-fg marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="flex items-start justify-between gap-4">
                  <span>{item.q}</span>
                  <span
                    aria-hidden
                    className="mt-0.5 shrink-0 text-[18px] font-normal text-dim transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </span>
              </summary>
              <p className="pb-5 pr-2 max-w-[62ch] text-[14.5px] leading-relaxed text-muted-fg">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
