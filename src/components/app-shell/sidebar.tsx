"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, X } from "lucide-react";
import { NAV_ITEMS } from "./nav-items";
import { useLocale } from "@/components/locale-provider";
import { cn } from "@/lib/cn";

export function Sidebar({
  mobileOpen,
  onCloseMobile,
}: {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const pathname = usePathname();
  const { locale } = useLocale();

  const content = (
    <nav
      aria-label={locale === "ar" ? "التنقل الرئيسي" : "Main navigation"}
      className="flex h-full flex-col gap-1 p-4"
    >
      <div className="mb-4 flex items-center justify-between px-2">
        <Link
          href="/"
          className="flex items-center gap-2 text-navy dark:text-text"
          onClick={onCloseMobile}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-accent text-accent-contrast">
            <Sparkles size={18} />
          </span>
          <span className="font-semibold">My AI Brand Studio</span>
        </Link>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label={locale === "ar" ? "إغلاق القائمة" : "Close menu"}
          className="rounded-[var(--radius-sm)] p-1.5 text-text-muted hover:bg-accent-soft lg:hidden"
        >
          <X size={18} />
        </button>
      </div>

      {NAV_ITEMS.map((item) => {
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onCloseMobile}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium text-text-muted transition-colors hover:bg-accent-soft hover:text-text",
              active && "bg-accent-soft text-accent",
            )}
            style={{ transitionDuration: "var(--duration-fast)" }}
          >
            <Icon size={18} aria-hidden="true" />
            {locale === "ar" ? item.labelAr : item.labelEn}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Desktop: persistent sidebar */}
      <aside className="hidden w-64 shrink-0 border-e border-border bg-surface lg:block">
        {content}
      </aside>

      {/* Mobile: off-canvas drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label={locale === "ar" ? "إغلاق القائمة" : "Close menu"}
            onClick={onCloseMobile}
            className="absolute inset-0 bg-navy/40"
          />
          <aside className="dialog-content absolute inset-y-0 start-0 w-64 border-e border-border bg-surface">
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
