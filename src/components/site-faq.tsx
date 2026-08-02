import { SITE_FAQ } from "@/content/faq";

/**
 * Sitewide FAQ UI. Schema is emitted only on the homepage (see page.tsx)
 * so every URL does not claim the same FAQPage for Google.
 */
export function SiteFaq() {
  return (
    <section id="faq" className="no-print border-t" aria-labelledby="site-faq-heading">
      <div className="shell py-12 sm:py-14">
        <div className="mx-auto max-w-[36rem]">
          <p className="label">FAQ</p>
          <h2
            id="site-faq-heading"
            className="mt-1.5 text-[1.35rem] font-semibold tracking-tight sm:text-[1.45rem]"
          >
            Awkward questions
          </h2>

          <div className="mt-6 border-t border-fg/10">
            {SITE_FAQ.map((item, i) => (
              <details
                key={item.q}
                name="site-faq"
                className="faq-item group border-b border-border-soft"
                open={i === 0}
              >
                <summary className="flex cursor-pointer list-none items-center gap-3 py-3.5 text-left outline-none marker:content-none focus-visible:bg-muted/60 [&::-webkit-details-marker]:hidden">
                  <span className="min-w-0 flex-1 text-[14.5px] font-medium leading-snug tracking-tight text-fg sm:text-[15px]">
                    {item.q}
                  </span>
                  <span
                    aria-hidden
                    className="num shrink-0 text-[13px] text-dim transition-transform duration-300 ease-out group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <div className="faq-body">
                  <p className="pb-4 pr-8 text-[14px] leading-relaxed text-muted-fg sm:text-[14.5px]">
                    {item.a}
                  </p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/** Homepage-only FAQ schema — do not put this on every route. */
export function SiteFaqJsonLd() {
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
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
