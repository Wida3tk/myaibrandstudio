"use client";

import { useState } from "react";
import { Clapperboard, AlertTriangle } from "lucide-react";
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
import type { Language } from "@/lib/ai/types";
import type { VideoScriptBrief } from "@/lib/video/types";

const STYLE_PRESETS = [
  "Let the AI decide",
  "Energetic and bold",
  "Calm and professional",
  "Warm and friendly",
  "Premium and cinematic",
];

const STYLE_LABEL_AR: Record<string, string> = {
  "Let the AI decide": "اترك الذكاء الاصطناعي يقرر",
  "Energetic and bold": "حيوي وجريء",
  "Calm and professional": "هادئ واحترافي",
  "Warm and friendly": "دافئ وودود",
  "Premium and cinematic": "فاخر وسينمائي",
};

const DURATIONS = [15, 30, 45, 60];

export function VideoBriefDialog({
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
  onGenerate: (brief: VideoScriptBrief) => Promise<void>;
}) {
  const { locale } = useLocale();
  const [objective, setObjective] = useState("");
  const [language, setLanguage] = useState<Language>(defaultLanguage);
  const [targetDurationSeconds, setTargetDurationSeconds] = useState(30);
  const [style, setStyle] = useState(STYLE_PRESETS[0]);
  const [audienceOverride, setAudienceOverride] = useState("");
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
        language,
        targetDurationSeconds,
        style: style === STYLE_PRESETS[0] ? undefined : style,
        audienceOverride: audienceOverride.trim() || undefined,
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
          locale === "ar"
            ? "إنشاء فيديو بالذكاء الاصطناعي"
            : "Generate a video with AI"
        }
        description={
          locale === "ar"
            ? "صف ما تريده — سيتولى الذكاء الاصطناعي السيناريو والصور والتعليق الصوتي."
            : "Describe what you want — AI handles the script, storyboard and voiceover."
        }
      >
        <div className="flex flex-col gap-4">
          <FieldGroup>
            <Label htmlFor="video-objective">
              {locale === "ar" ? "هدف الفيديو" : "Video objective"}
            </Label>
            <Textarea
              id="video-objective"
              required
              rows={2}
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder={
                locale === "ar"
                  ? "مثال: ترويج قصير لدورة تدريبية جديدة"
                  : "e.g. A short promo for a new training course"
              }
            />
          </FieldGroup>

          <div className="grid grid-cols-2 gap-3">
            <FieldGroup>
              <Label>{locale === "ar" ? "لغة النص" : "Script language"}</Label>
              <Select
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
              >
                <option value="en">English</option>
                <option value="ar">العربية</option>
              </Select>
            </FieldGroup>
            <FieldGroup>
              <Label>
                {locale === "ar" ? "المدة (ثانية)" : "Duration (seconds)"}
              </Label>
              <Select
                value={targetDurationSeconds}
                onChange={(e) =>
                  setTargetDurationSeconds(Number(e.target.value))
                }
              >
                {DURATIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}s
                  </option>
                ))}
              </Select>
            </FieldGroup>
          </div>

          <FieldGroup>
            <Label>{locale === "ar" ? "النمط" : "Style"}</Label>
            <Select value={style} onChange={(e) => setStyle(e.target.value)}>
              {STYLE_PRESETS.map((preset) => (
                <option key={preset} value={preset}>
                  {locale === "ar" ? STYLE_LABEL_AR[preset] : preset}
                </option>
              ))}
            </Select>
          </FieldGroup>

          <FieldGroup>
            <Label htmlFor="video-audience">
              {locale === "ar" ? "الجمهور (اختياري)" : "Audience (optional)"}
            </Label>
            <Input
              id="video-audience"
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
            <Label htmlFor="video-instructions">
              {locale === "ar"
                ? "تعليمات إضافية (اختياري)"
                : "Custom instructions (optional)"}
            </Label>
            <Textarea
              id="video-instructions"
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
            <Clapperboard size={16} aria-hidden="true" />
            {submitting
              ? locale === "ar"
                ? "جارٍ إنشاء السيناريو والمشاهد..."
                : "Generating script and scenes..."
              : locale === "ar"
                ? "إنشاء"
                : "Generate"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
