"use client";

import Link from "next/link";
import { track } from "@vercel/analytics";

export function TrackedLink({
  href,
  event,
  className,
  children,
}: {
  href: string;
  event: string;
  className?: string;
  children: React.ReactNode;
}) {
  return <Link href={href} className={className} onClick={() => track(event)}>{children}</Link>;
}
