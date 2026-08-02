import { SITE } from "@/lib/site";
import { BADGE } from "@/app/badge/badge-svg";

/**
 * One place that knows what the embed code looks like.
 *
 * The alt text deliberately does not claim a verdict. The badge can say
 * something unflattering, so an alt reading "verified by emailrules.today"
 * would be a screen-reader-only claim the image itself might contradict.
 */
export function snippetsFor(domain: string) {
  const image = `${SITE.url}/badge/${domain}.svg`;
  const result = `${SITE.url}/check/${domain}`;
  const alt = `Email authentication check for ${domain} — ${SITE.name}`;

  return {
    image,
    result,
    alt,
    html: `<a href="${result}">
  <img src="${image}"
       alt="${alt}"
       width="${BADGE.width}" height="${BADGE.height}" loading="lazy">
</a>`,
    markdown: `[![${alt}](${image})](${result})`,
  };
}
