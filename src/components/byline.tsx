import Image from "next/image";
import { AUTHOR } from "@/lib/site";

/**
 * The human. A named author with a face is what separates a maintained
 * reference from a content farm, and it is the only place on the site where
 * following someone is the call to action.
 */
export function Byline({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex items-center gap-2.5">
        <Image
          src={AUTHOR.avatar}
          alt={AUTHOR.name}
          width={28}
          height={28}
          className="rounded-full"
        />
        <span className="text-[13px] text-muted-foreground">
          Built by{" "}
          <a
            href={AUTHOR.x}
            target="_blank"
            rel="me noopener"
            className="text-foreground underline underline-offset-2"
          >
            {AUTHOR.name}
          </a>
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-4">
      <Image
        src={AUTHOR.avatar}
        alt={AUTHOR.name}
        width={44}
        height={44}
        className="shrink-0 rounded-full"
      />
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-[14.5px] font-semibold text-foreground">{AUTHOR.name}</span>
          <span className="text-[12.5px] text-muted-foreground">{AUTHOR.role}</span>
        </div>
        <p className="mt-1.5 max-w-[52ch] text-[13.5px] leading-relaxed text-muted-foreground">
          {AUTHOR.blurb}
        </p>
        <div className="mt-2.5 flex items-center gap-4 text-[13px]">
          <a
            href={AUTHOR.x}
            target="_blank"
            rel="me noopener"
            className="inline-flex items-center gap-1.5 text-foreground underline underline-offset-2"
          >
            <XIcon /> {AUTHOR.xHandle}
          </a>
          <a
            href={AUTHOR.linkedin}
            target="_blank"
            rel="me noopener"
            className="inline-flex items-center gap-1.5 text-foreground underline underline-offset-2"
          >
            <LinkedInIcon /> LinkedIn
          </a>
        </div>
      </div>
    </div>
  );
}

function XIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0z" />
    </svg>
  );
}

/** Person schema so the site has an identifiable author, not just a publisher. */
export function AuthorJsonLd({ siteUrl }: { siteUrl: string }) {
  const json = {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${siteUrl}/#author`,
    name: AUTHOR.name,
    url: siteUrl,
    image: `${siteUrl}${AUTHOR.avatar}`,
    jobTitle: AUTHOR.role,
    sameAs: [AUTHOR.x, AUTHOR.linkedin],
  };
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }} />
  );
}
