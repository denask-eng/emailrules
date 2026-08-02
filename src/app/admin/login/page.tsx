import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { signIn } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default async function AdminLogin({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const { e } = await searchParams;

  async function attempt(formData: FormData) {
    "use server";
    const password = String(formData.get("password") ?? "");
    if (await signIn(password)) redirect("/admin");
    /* Deliberately vague, and no timing branch before the scrypt compare:
       there is one account, so "wrong password" and "no account" are the
       same fact and neither is worth confirming to a stranger. */
    redirect("/admin/login?e=1");
  }

  return (
    <div className="shell shell-tight py-20">
      <h1 className="text-[clamp(1.6rem,4vw,2.2rem)]">Sign in</h1>
      <p className="mt-3 max-w-[46ch] text-[15px] text-muted-fg">
        One operator, one password. There is no account to create and no reset link.
      </p>

      <form action={attempt} className="mt-8 flex max-w-sm flex-col gap-3">
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          aria-label="Admin password"
          placeholder="Password"
          className="h-11 rounded-[10px] border bg-card px-4 text-[15px] outline-none focus-visible:ring-3 focus-visible:ring-accent/25"
        />
        <button type="submit" className={cn(buttonVariants({ size: "lg" }), "h-11 rounded-[10px] font-semibold")}>
          Sign in
        </button>
        {e ? (
          <p role="alert" className="text-[14px] text-live">
            That did not work.
          </p>
        ) : null}
      </form>
    </div>
  );
}
