import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin, signOut } from "@/lib/auth";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s — Admin" },
  robots: { index: false, follow: false },
};

/**
 * The real authorisation boundary.
 *
 * `src/proxy.ts` only checks that a cookie exists, which a forged cookie also
 * satisfies. This verifies the signature and expiry on every render.
 *
 * The (dash) route group exists so this guard does not also wrap
 * /admin/login: a guard that redirects the login page to itself is an
 * infinite loop, and route groups let the two live under one path prefix
 * without sharing a layout.
 */
export default async function DashLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  async function leave() {
    "use server";
    await signOut();
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b bg-bg-2">
        <div className="shell flex h-14 items-center gap-6">
          <Link href="/admin" className="text-[15px] font-semibold tracking-[-0.03em]">
            emailrules<span className="text-accent">.today</span>{" "}
            <span className="font-normal text-dim">admin</span>
          </Link>
          <nav className="ml-auto flex items-center gap-4 text-[13.5px] text-muted-fg">
            <Link href="/" className="hover:text-fg">
              View site
            </Link>
            <form action={leave}>
              <button type="submit" className="hover:text-fg">
                Sign out
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
