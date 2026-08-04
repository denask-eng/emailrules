"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** Stagger index for list items (0–8) */
  delay?: number;
  /** Once visible, stay — default true */
  once?: boolean;
  as?: "div" | "section" | "li" | "article";
};

/**
 * Soft entrance when scrolled into view.
 * Natural ease-out rise — never bounce. Disabled under reduced-motion.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  once = true,
  as: Tag = "div",
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setOn(true);
          if (once) io.disconnect();
        } else if (!once) {
          setOn(false);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [once]);

  return (
    <Tag
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={ref as any}
      className={cn("reveal", on && "reveal-on", className)}
      style={{ ["--reveal-delay" as string]: `${Math.min(delay, 8) * 55}ms` }}
    >
      {children}
    </Tag>
  );
}
