import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="shell shell-tight py-24 sm:py-32">
      <p className="label">404</p>
      <h1 className="mt-4 text-[clamp(2rem,6vw,3.5rem)]">That page is not here.</h1>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/" className={cn(buttonVariants({ size: "lg" }), "h-10 px-4")}>
          Home
        </Link>
        <Link
          href="/rules"
          className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-10 px-4")}
        >
          Browse rules
        </Link>
      </div>
    </div>
  );
}
