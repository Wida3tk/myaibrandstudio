"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Search, FileText, LayoutDashboard } from "lucide-react";
import * as RadixDialog from "@radix-ui/react-dialog";
import { useLocale } from "@/components/locale-provider";
import { useOrg } from "@/lib/org/use-org";
import { PRIMARY_BRAND_ID } from "@/lib/brand/schema";
import { listContentItems } from "@/lib/content/data";
import type { ContentItem } from "@/lib/content/schema";
import { NAV_ITEMS } from "./nav-items";
import { Input } from "@/components/ui/input";

type ResultItem = {
  key: string;
  href: string;
  label: string;
  hint?: string;
  icon: typeof Search;
};

export function CommandSearch() {
  const router = useRouter();
  const { locale } = useLocale();
  const { orgId } = useOrg();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [highlighted, setHighlighted] = useState(0);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!open || !orgId) return;
    listContentItems(orgId, PRIMARY_BRAND_ID)
      .then(setContentItems)
      .catch(() => setContentItems([]));
  }, [open, orgId]);

  const results = useMemo<ResultItem[]>(() => {
    const navResults: ResultItem[] = NAV_ITEMS.map((item) => ({
      key: `nav-${item.href}`,
      href: item.href,
      label: locale === "ar" ? item.labelAr : item.labelEn,
      icon: LayoutDashboard,
    }));
    const contentResults: ResultItem[] = contentItems.map((item) => ({
      key: `content-${item.id}`,
      href: "/content",
      label: item.structuredPayload.hook || item.topic,
      hint: item.status,
      icon: FileText,
    }));
    const all = [...navResults, ...contentResults];
    if (!query.trim()) return all.slice(0, 8);
    const q = query.trim().toLowerCase();
    return all.filter((r) => r.label.toLowerCase().includes(q)).slice(0, 20);
  }, [query, contentItems, locale]);

  function go(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  return (
    <RadixDialog.Root open={open} onOpenChange={setOpen}>
      <RadixDialog.Trigger
        className="flex h-10 w-full max-w-sm items-center gap-2 rounded-[var(--radius-md)] border border-border bg-bg px-3 text-sm text-text-muted transition-colors hover:border-border-strong"
        style={{ transitionDuration: "var(--duration-fast)" }}
      >
        <Search size={16} aria-hidden="true" />
        <span className="flex-1 text-start">
          {locale === "ar" ? "بحث..." : "Search..."}
        </span>
        <kbd className="rounded border border-border px-1.5 py-0.5 text-xs">
          Ctrl K
        </kbd>
      </RadixDialog.Trigger>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="dialog-overlay fixed inset-0 z-50 bg-navy/40 backdrop-blur-sm" />
        <RadixDialog.Content
          className="dialog-content fixed start-1/2 top-24 z-50 w-[min(92vw,34rem)] -translate-x-1/2 rounded-[var(--radius-lg)] border border-border bg-surface shadow-[var(--shadow-lg)] focus:outline-none rtl:translate-x-1/2"
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlighted((h) => Math.min(h + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlighted((h) => Math.max(h - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              const picked = results[highlighted];
              if (picked) go(picked.href);
            }
          }}
        >
          <RadixDialog.Title className="sr-only">
            {locale === "ar" ? "البحث" : "Search"}
          </RadixDialog.Title>
          <div className="flex items-center gap-2 border-b border-border p-3">
            <Search size={16} className="text-text-muted" aria-hidden="true" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHighlighted(0);
              }}
              placeholder={
                locale === "ar"
                  ? "ابحث في الصفحات والمحتوى"
                  : "Search pages and content"
              }
              className="border-none bg-transparent px-0 focus-visible:border-none"
              aria-label={locale === "ar" ? "البحث" : "Search"}
            />
          </div>
          <ul role="listbox" className="max-h-80 overflow-y-auto p-2 scrollbar-thin">
            {results.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-text-muted">
                {locale === "ar" ? "لا توجد نتائج" : "No results"}
              </li>
            )}
            {results.map((result, i) => {
              const Icon = result.icon;
              return (
                <li key={result.key} role="option" aria-selected={i === highlighted}>
                  <button
                    type="button"
                    onClick={() => go(result.href)}
                    onMouseEnter={() => setHighlighted(i)}
                    className={`flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-start text-sm ${
                      i === highlighted ? "bg-accent-soft text-accent" : "text-text"
                    }`}
                  >
                    <Icon size={16} aria-hidden="true" />
                    <span className="flex-1 truncate">{result.label}</span>
                    {result.hint && (
                      <span className="text-xs text-text-muted">{result.hint}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
