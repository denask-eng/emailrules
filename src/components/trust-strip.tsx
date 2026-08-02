import Image from "next/image";
import Link from "next/link";
import { AUTHOR } from "@/lib/site";

/** Above-the-fold human proof — personal, no employer. */
export function TrustStrip({ className = "" }: { className?: string }) {
  return (
    <div
      className={`mx-auto flex max-w-xl flex-col items-center gap-3 sm:flex-row sm:items-start sm:gap-4 sm:text-left ${className}`}
    >
      <Image
        src={AUTHOR.avatar}
        alt=""
        width={48}
        height={48}
        className="h-12 w-12 shrink-0 rounded-full ring-1 ring-border"
        priority
      />
      <div className="min-w-0 text-center sm:text-left">
        <p className="text-[14px] font-medium leading-snug tracking-tight text-fg">
          {AUTHOR.hook}
        </p>
        <p className="mt-1 text-[13px] leading-relaxed text-muted-fg">
          Built by{" "}
          <a
            href={AUTHOR.x}
            target="_blank"
            rel="me noopener"
            className="font-medium text-fg underline decoration-border underline-offset-3 hover:decoration-accent"
          >
            {AUTHOR.name}
          </a>
          , email geek — too busy to chase every PDF, so this shelf is dated, sourced, and filtered
          to your desk.{" "}
          <Link href="/start" className="underline underline-offset-3 hover:text-fg">
            15‑minute path
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
