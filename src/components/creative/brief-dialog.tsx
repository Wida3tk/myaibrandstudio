"use client";

import { useState } from "react";
import { Sparkles, AlertTriangle } from "lucide-react";
import { useLocale } from "@/components/locale-provider";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  FieldGroup,
  Label,
  Select,
  Input,
  Textarea,
} from "@/components/ui/input";
import type { BrandProfileInput } from "@/lib/brand/schema";
import { FORMAT_PRESETS } from "@/lib/design/presets";
import type { Language } from "@/lib/ai/types";
import type { CreativeBrief, PlatformId } from "@/lib/creative/types";

const STYLE_PRESETS = [
  "Let the AI decide",
  "Premium editorial",
  "Bold and energetic",
  "Minimal and modern",
  "Warm and friendly",
  "Luxury",
];

const STYLE_LABEL_AR: Record<string, string> = {
  "Let the AI decide": "اترك الذكاء الاصطناعي يقرر",
  "Premium editorial": "تحريري فاخر",
  "Bold and energetic": "جريء وحيوي",
  "Minimal and modern": "بسيط وعصري",
  "Warm and friendly": "دافئ وودود",
  Luxury: "فاخر جدًا",
};

export function BriefDialog({
  open,
  onOpenChange,
  brand,
  defaultLanguage,
  onGenerate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brand: BrandProfileInput | null;
  defaultLanguage: Language;
  onGenerate: (brief: CreativeBrief) => Promise<void>;
}) {
  const { locale } = useLocale();
  const [objective, setObjective] = useState("");
  const [platform, setPlatform] = useState<PlatformId>(
    FORMAT_PRESETS[0].id as PlatformId,
  );
  const [language, setLanguage] = useState<Language>(defaultLanguage);
  const [style, setStyle] = useState(STYLE_PRESETS[0]);
  const [audienceOverride, setAudienceOverride] = useState("");
  const [requiredText, setRequiredText] = useState("");
  const [customInstructions, setCustomInstructions] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!objective.trim()) return;
    setError(null);
    setSubmitting(true);
    try {
      await onGenerate({
        objective: objective.trim(),
        platform,
        language,
        style: style === STYLE_PRESETS[0] ? undefined : style,
        audienceOverride: audienceOverride.trim() || undefined,
        requiredText: requiredText.trim() || undefined,
        customInstructions: customInstructions.trim() || undefined,
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[min(92vw,34rem)]"
        title={
          locale === "ar" ? "إنشاء تصميم بالذكاء الاصطناعي" : "Generate with AI"
        }
        description={
          locale === "ar"
            ? "صف ما تريده — سيتولى الذكاء الاصطناعي الاستراتيجية والنصوص والصورة والتخطيط."
            : "Describe what you want — AI handles strategy, copy, imagery and layout."
        }
      >
        <div className="flex flex-col gap-4">
          <FieldGroup>
            <Label htmlFor="objective">
              {locale === "ar" ? "الهدف من الحملة" : "Campaign objective"}
            </Label>
            <Textarea
              id="objective"
              required
              rows={2}
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder={
                locale === "ar"
                  ? "مثال: الترويج لدورة تدريبية جديدة في عطلة نهاية الأسبوع"
                  : "e.g. Promote a new weekend training course"
              }
            />
          </FieldGroup>

          <div className="grid grid-cols-2 gap-3">
            <FieldGroup>
              <Label>{locale === "ar" ? "المنصة" : "Platform"}</Label>
              <Select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as PlatformId)}
              >
                {FORMAT_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {locale === "ar" ? p.labelAr : p.labelEn}
                  </option>
                ))}
              </Select>
            </FieldGroup>
            <FieldGroup>
              <Label>{locale === "ar" ? "لغة النص" : "Copy language"}</Label>
              <Select
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
              >
                <option value="en">English</option>
                <option value="ar">العربية</option>
              </Select>
            </FieldGroup>
          </div>

          <FieldGroup>
            <Label>{locale === "ar" ? "النمط البصري" : "Visual style"}</Label>
            <Select value={style} onChange={(e) => setStyle(e.target.value)}>
              {STYLE_PRESETS.map((preset) => (
                <option key={preset} value={preset}>
                  {locale === "ar" ? STYLE_LABEL_AR[preset] : preset}
                </option>
              ))}
            </Select>
          </FieldGroup>

          <FieldGroup>
            <Label htmlFor="audience">
              {locale === "ar" ? "الجمهور (اختياري)" : "Audience (optional)"}
            </Label>
            <Input
              id="audience"
              value={audienceOverride}
              onChange={(e) => setAudienceOverride(e.target.value)}
              placeholder={
                brand?.audienceDescription ||
                (locale === "ar"
                  ? "جمهور العلامة الافتراضي"
                  : "Defaults to your brand audience")
              }
            />
          </FieldGroup>

          <FieldGroup>
            <Label htmlFor="required-text">
              {locale === "ar"
                ? "نص لا بد أن يظهر (اختياري)"
                : "Required text (optional)"}
            </Label>
            <Input
              id="required-text"
              value={requiredText}
              onChange={(e) => setRequiredText(e.target.value)}
              placeholder={
                locale === "ar" ? "مثال: يبدأ 1 مارس" : "e.g. Starts March 1st"
              }
            />
          </FieldGroup>

          <FieldGroup>
            <Label htmlFor="instructions">
              {locale === "ar"
                ? "تعليمات إضافية (اختياري)"
                : "Custom instructions (optional)"}
            </Label>
            <Textarea
              id="instructions"
              rows={2}
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
            />
          </FieldGroup>

          {error && (
            <div className="flex items-start gap-2 rounded-[var(--radius-md)] border border-danger/30 bg-danger-soft p-3 text-sm text-danger">
              <AlertTriangle
                size={16}
                className="mt-0.5 shrink-0"
                aria-hidden="true"
              />
              <span>{error}</span>
            </div>
          )}

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !objective.trim()}
            className="w-full"
          >
            <Sparkles size={16} aria-hidden="true" />
            {submitting
              ? locale === "ar"
                ? "جارٍ إنشاء 3 تصاميم..."
                : "Generating 3 designs..."
              : locale === "ar"
                ? "إنشاء"
                : "Generate"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
