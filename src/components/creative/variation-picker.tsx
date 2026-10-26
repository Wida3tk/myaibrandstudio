"use client";

import { Check } from "lucide-react";
import { useLocale } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { DesignVariation, LayoutVariant } from "@/lib/creative/types";

const VARIANT_LABEL: Record<LayoutVariant, { en: string; ar: string }> = {
  editorial: { en: "Premium editorial", ar: "تحريري فاخر" },
  bold: { en: "Bold marketing", ar: "تسويقي جريء" },
  minimal: { en: "Minimal modern", ar: "عصري بسيط" },
};

export function VariationPicker({
  variations,
  onApprove,
}: {
  variations: DesignVariation[];
  onApprove: (variation: DesignVariation) => void;
}) {
  const { locale } = useLocale();

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {variations.map((variation) => (
        <Card key={variation.id} className="overflow-hidden">
          <CardContent className="flex flex-col gap-3 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- static export, data-url preview */}
            <img
              src={variation.previewDataUrl}
              alt={VARIANT_LABEL[variation.layoutVariant][locale]}
              className="w-full rounded-[var(--radius-md)] border border-border"
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-text">
                {VARIANT_LABEL[variation.layoutVariant][locale]}
              </span>
              <Button type="button" size="sm" onClick={() => onApprove(variation)}>
                <Check size={14} aria-hidden="true" />
                {locale === "ar" ? "اعتماد" : "Use this"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
