"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

/**
 * ⌘K / / search over the corpus.
 * Index is passed as props — no round trip.
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
        return;
      }
      if (e.key === "/" && !open) {
        const t = e.target as HTMLElement | null;
        const typing =
          t &&
          (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable);
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
      {/* Two shapes, one control. On a phone it is a borderless icon with a
          44px hit area: a bordered box next to the accent pill reads as a
          broken input, and the old ⌕ was a text glyph, not an icon — tiny,
          off-centre, and the wrong weight beside real UI. From sm up there is
          room for the labelled pill and the shortcut. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search rules"
        className="flex size-11 items-center justify-center rounded-lg text-muted-fg transition-colors hover:bg-muted/80 hover:text-fg sm:size-auto sm:gap-2 sm:border sm:bg-card sm:px-2.5 sm:py-1.5 sm:text-[13px] sm:text-dim sm:hover:bg-card"
      >
        <SearchIcon className="size-[17px] sm:size-[13px]" strokeWidth={2} aria-hidden />
        <span className="hidden sm:inline">Search</span>
        <kbd className="num hidden rounded border px-1.5 py-0.5 text-[11px] sm:inline">⌘K</kbd>
      </button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search rules"
        description="Search by title, question, jurisdiction or ownership"
      >
        <CommandInput placeholder="Klaviyo, DMARC, France, spam trap…" />
        <CommandList>
          <CommandEmpty>
            Nothing matches. Try “Klaviyo”, “DMARC”, “France” or “open rate”.
          </CommandEmpty>
          <CommandGroup heading={`${items.length} rules`}>
            {items.map((it) => (
              <CommandItem
                key={it.slug}
                value={`${it.title} ${it.question} ${it.jurisdictions} ${it.ownership} ${it.slug}`}
                onSelect={() => go(it.slug)}
              >
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
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
