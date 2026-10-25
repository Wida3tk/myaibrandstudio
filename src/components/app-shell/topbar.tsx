"use client";

import { Menu } from "lucide-react";
import { useLocale } from "@/components/locale-provider";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { CommandSearch } from "./command-search";
import { QuickCreate } from "./quick-create";
import { UserMenu } from "./user-menu";

export function Topbar({ onOpenMobileNav }: { onOpenMobileNav: () => void }) {
  const { locale } = useLocale();

  return (
    <header className="flex items-center gap-3 border-b border-border bg-surface/80 px-4 py-3 backdrop-blur-sm sm:px-6">
      <button
        type="button"
        onClick={onOpenMobileNav}
        aria-label={locale === "ar" ? "فتح القائمة" : "Open menu"}
        className="rounded-[var(--radius-sm)] p-2 text-text-muted hover:bg-accent-soft lg:hidden"
      >
        <Menu size={20} />
      </button>

      <div className="flex-1">
        <CommandSearch />
      </div>

      <div className="flex items-center gap-2">
        <QuickCreate />
        <div className="hidden sm:block">
          <ThemeToggle locale={locale} />
        </div>
        <LanguageToggle />
        <UserMenu />
      </div>
    </header>
  );
}
