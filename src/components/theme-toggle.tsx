"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type Theme } from "@/components/theme-provider";
import { cn } from "@/lib/cn";

const OPTIONS: {
  value: Theme;
  icon: typeof Sun;
  labelEn: string;
  labelAr: string;
}[] = [
  { value: "light", icon: Sun, labelEn: "Light theme", labelAr: "فاتح" },
  { value: "dark", icon: Moon, labelEn: "Dark theme", labelAr: "داكن" },
  {
    value: "system",
    icon: Monitor,
    labelEn: "System theme",
    labelAr: "النظام",
  },
];

export function ThemeToggle({ locale }: { locale: "en" | "ar" }) {
  const { theme, setTheme } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label={locale === "ar" ? "اختيار المظهر" : "Choose theme"}
      className="inline-flex items-center gap-0.5 rounded-[var(--radius-md)] border border-border bg-surface p-0.5"
    >
      {OPTIONS.map(({ value, icon: Icon, labelEn, labelAr }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          aria-label={locale === "ar" ? labelAr : labelEn}
          title={locale === "ar" ? labelAr : labelEn}
          onClick={() => setTheme(value)}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-text-muted transition-colors",
            theme === value && "bg-accent-soft text-accent",
          )}
          style={{ transitionDuration: "var(--duration-fast)" }}
        >
          <Icon size={16} />
        </button>
      ))}
    </div>
  );
}
