"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

/**
 * ⌘K over the corpus.
 *
 * Takes a flattened index as a prop rather than fetching: seventeen rules is
 * a few kilobytes, and a search box that needs a round trip before it can
 * answer is not a search box a practitioner will use twice.
 */

export interface SearchItem {
  slug: string;
  title: string;
  question: string;
  ownership: string;
  jurisdictions: string;
}

export function Search({ items }: { items: SearchItem[] }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "/" && !open) {
        const t = e.target as HTMLElement | null;
        const typing = t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName);
        if (!typing) {
          e.preventDefault();
          setOpen(true);
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const go = (slug: string) => {
    setOpen(false);
    router.push(`/rules/${slug}`);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search rules"
        className="hidden items-center gap-2 rounded-lg border bg-card px-2.5 py-1.5 text-[13px] text-dim transition-colors hover:text-fg sm:flex"
      >
        <span>Search</span>
        <kbd className="num rounded border px-1.5 py-0.5 text-[11px]">⌘K</kbd>
      </button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search rules"
        description="Search every rule by title, question or jurisdiction"
      >
        <CommandInput placeholder="Search rules, questions, jurisdictions…" />
        <CommandList>
          <CommandEmpty>Nothing matches. Try &ldquo;Klaviyo&rdquo;, &ldquo;DMARC&rdquo; or &ldquo;France&rdquo;.</CommandEmpty>
          <CommandGroup heading="Rules">
            {items.map((it) => (
              <CommandItem
                key={it.slug}
                /* cmdk matches on `value`, so everything searchable goes in it
                   while the visible label stays clean. */
                value={`${it.title} ${it.question} ${it.jurisdictions} ${it.ownership}`}
                onSelect={() => go(it.slug)}
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-[14px] font-medium">{it.title}</span>
                  <span className="truncate text-[12.5px] text-muted-fg">{it.question}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
