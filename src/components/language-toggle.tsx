"use client";

import { useLocale } from "./locale-provider";

const LABELS: Record<"en" | "ar", string> = {
  en: "English",
  ar: "العربية",
};

export function LanguageToggle() {
  const { locale, setLocale } = useLocale();
  const other = locale === "en" ? "ar" : "en";

  return (
    <button
      type="button"
      onClick={() => setLocale(other)}
      className="rounded-md border border-border px-3 py-1.5 text-sm text-text hover:bg-surface transition-colors"
      style={{ transitionDuration: "var(--duration-fast)" }}
      aria-label={`Switch language to ${LABELS[other]}`}
    >
      {LABELS[other]}
    </button>
  );
}
