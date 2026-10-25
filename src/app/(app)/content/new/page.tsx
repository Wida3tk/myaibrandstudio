"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/lib/auth/auth-provider";
import { useOrg } from "@/lib/org/use-org";
import { useLocale } from "@/components/locale-provider";
import { PRIMARY_BRAND_ID } from "@/lib/brand/schema";
import {
  generateContent,
  GenerationError,
  type GeneratedContent,
} from "@/lib/ai/generate";
import type { ContentType, Language } from "@/lib/ai/types";
import { createDraftContentItem } from "@/lib/content/data";
import { PLATFORMS, type Platform } from "@/lib/content/schema";
import { PLATFORM_LABEL, PlatformPreview } from "@/components/platform-previews";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FieldGroup, Input, Label, Select, Textarea } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

const CONTENT_TYPES: ContentType[] = [
  "post",
  "hook",
  "caption",
  "script",
  "calendar-note",
];

const CONTENT_TYPE_LABEL: Record<ContentType, string> = {
  post: "Post",
  hook: "Hook",
  caption: "Caption",
  script: "Script",
  "calendar-note": "Calendar note",
};

const CONTENT_TYPE_LABEL_AR: Record<ContentType, string> = {
  post: "منشور",
  hook: "خطّاف",
  caption: "تعليق",
  script: "سيناريو",
  "calendar-note": "ملاحظة تقويم",
};

const ERROR_MESSAGE_AR: Partial<Record<string, string>> = {
  "resource-exhausted":
    "انتهت ميزانية الذكاء الاصطناعي اليومية لهذا المساحة — حاول مرة أخرى غدًا.",
  "all-providers-failed":
    "جميع مزودي الذكاء الاصطناعي غير متاحين مؤقتًا. حاول مرة أخرى خلال لحظات.",
  "permission-denied": "ليس لديك صلاحية لإنشاء محتوى لهذه العلامة.",
  "not-found": "تعذر العثور على ملف العلامة التجارية.",
  "invalid-argument": "الطلب غير صالح — تحقق من الحقول وحاول مرة أخرى.",
};

// Values are sent to the AI gateway as-is (English reads fine as prompt input regardless of UI
// language) — only the displayed label is localized.
const TONE_PRESETS = [
  "Use brand voice",
  "Professional",
  "Playful",
  "Bold",
  "Warm",
  "Luxury",
  "Minimal",
];

const TONE_LABEL_AR: Record<string, string> = {
  "Use brand voice": "استخدام صوت العلامة",
  Professional: "احترافي",
  Playful: "مرح",
  Bold: "جريء",
  Warm: "دافئ",
  Luxury: "فاخر",
  Minimal: "بسيط",
};

type Variant = {
  id: string;
  provider: string;
  content: GeneratedContent;
};

function newVariantId() {
  return `v${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function NewContentPage() {
  const { user } = useAuth();
  const { orgId, brand } = useOrg();
  const { locale } = useLocale();

  const [contentType, setContentType] = useState<ContentType>("post");
  const [language, setLanguage] = useState<Language>("en");
  const [topic, setTopic] = useState("");
  const [platforms, setPlatforms] = useState<Platform[]>(["instagram"]);
  const [tone, setTone] = useState(TONE_PRESETS[0]);
  const [audienceOverride, setAudienceOverride] = useState("");
  const [pillarInput, setPillarInput] = useState("");
  const [pillars, setPillars] = useState<string[]>([]);
  const [customInstructions, setCustomInstructions] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<GenerationError | Error | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [activeVariantId, setActiveVariantId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const activeVariant = variants.find((v) => v.id === activeVariantId) ?? null;

  function addPillar() {
    const value = pillarInput.trim();
    if (!value || pillars.includes(value)) return;
    setPillars((p) => [...p, value]);
    setPillarInput("");
  }

  function togglePlatform(platform: Platform) {
    setPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform],
    );
  }

  async function handleGenerate() {
    if (!orgId) return;
    setError(null);
    setSaved(false);
    setSubmitting(true);
    try {
      const output = await generateContent({
        orgId,
        brandId: PRIMARY_BRAND_ID,
        contentType,
        language,
        topic,
        toneOverride: tone === TONE_PRESETS[0] ? undefined : tone,
        audienceOverride: audienceOverride.trim() || undefined,
        pillars: pillars.length > 0 ? pillars : undefined,
        customInstructions: customInstructions.trim() || undefined,
      });
      const variant: Variant = {
        id: newVariantId(),
        provider: output.provider,
        content: output.structured,
      };
      setVariants((prev) => [variant, ...prev]);
      setActiveVariantId(variant.id);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Generation failed."));
    } finally {
      setSubmitting(false);
    }
  }

  function updateActiveContent(patch: Partial<GeneratedContent>) {
    if (!activeVariantId) return;
    setVariants((prev) =>
      prev.map((v) =>
        v.id === activeVariantId
          ? { ...v, content: { ...v.content, ...patch } }
          : v,
      ),
    );
    setSaved(false);
  }

  function removeVariant(id: string) {
    setVariants((prev) => prev.filter((v) => v.id !== id));
    if (activeVariantId === id) {
      const remaining = variants.filter((v) => v.id !== id);
      setActiveVariantId(remaining[0]?.id ?? null);
    }
  }

  async function handleCopy() {
    if (!activeVariant) return;
    const text = [
      activeVariant.content.hook,
      activeVariant.content.caption,
      activeVariant.content.hashtags.map((t) => `#${t}`).join(" "),
      activeVariant.content.callToAction,
    ]
      .filter(Boolean)
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API unavailable — nothing more we can do here
    }
  }

  async function handleSaveDraft() {
    if (!orgId || !user || !activeVariant) return;
    setError(null);
    setSaving(true);
    try {
      await createDraftContentItem(orgId, PRIMARY_BRAND_ID, user.uid, {
        type: contentType,
        language,
        topic,
        structuredPayload: activeVariant.content,
        platformTargets: platforms,
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to save draft."));
    } finally {
      setSaving(false);
    }
  }

  if (!orgId) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div dir={locale === "ar" ? "rtl" : "ltr"} className="flex flex-col gap-6 text-start">
      <div>
        <h1 className="text-2xl font-semibold text-text">
          {locale === "ar" ? "استوديو المحتوى بالذكاء الاصطناعي" : "AI Content Studio"}
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          {locale === "ar"
            ? "أنشئ محتوى متوافقًا مع صوت علامتك التجارية."
            : "Generate on-brand content, then refine and save it as a draft."}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
        <Card className="h-fit">
          <CardContent className="flex flex-col gap-4">
            <FieldGroup>
              <Label>{locale === "ar" ? "نوع المحتوى" : "Content type"}</Label>
              <Select
                value={contentType}
                onChange={(e) => setContentType(e.target.value as ContentType)}
              >
                {CONTENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {locale === "ar" ? CONTENT_TYPE_LABEL_AR[type] : CONTENT_TYPE_LABEL[type]}
                  </option>
                ))}
              </Select>
            </FieldGroup>

            <FieldGroup>
              <Label>{locale === "ar" ? "اللغة" : "Language"}</Label>
              <Select
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
              >
                <option value="en">English</option>
                <option value="ar">العربية</option>
              </Select>
            </FieldGroup>

            <FieldGroup>
              <Label htmlFor="topic">{locale === "ar" ? "الموضوع" : "Topic"}</Label>
              <Textarea
                id="topic"
                required
                rows={2}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={
                  locale === "ar" ? "عمّ يتحدث هذا المحتوى؟" : "What is this content about?"
                }
              />
            </FieldGroup>

            <fieldset className="flex flex-col gap-1.5">
              <legend className="mb-0.5 text-sm font-medium text-text-muted">
                {locale === "ar" ? "المنصات" : "Platforms"}
              </legend>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map((platform) => (
                  <button
                    key={platform}
                    type="button"
                    onClick={() => togglePlatform(platform)}
                    aria-pressed={platforms.includes(platform)}
                    className={`rounded-[var(--radius-full)] border px-3 py-1 text-sm transition-colors ${
                      platforms.includes(platform)
                        ? "border-accent bg-accent-soft text-accent"
                        : "border-border text-text-muted hover:border-border-strong"
                    }`}
                    style={{ transitionDuration: "var(--duration-fast)" }}
                  >
                    {PLATFORM_LABEL[platform]}
                  </button>
                ))}
              </div>
            </fieldset>

            <FieldGroup>
              <Label>{locale === "ar" ? "النبرة" : "Tone"}</Label>
              <Select value={tone} onChange={(e) => setTone(e.target.value)}>
                {TONE_PRESETS.map((preset) => (
                  <option key={preset} value={preset}>
                    {locale === "ar" ? TONE_LABEL_AR[preset] : preset}
                  </option>
                ))}
              </Select>
            </FieldGroup>

            <FieldGroup>
              <Label htmlFor="audience">
                {locale === "ar" ? "الجمهور (اختياري)" : "Audience override (optional)"}
              </Label>
              <Input
                id="audience"
                value={audienceOverride}
                onChange={(e) => setAudienceOverride(e.target.value)}
                placeholder={brand?.audienceDescription || (locale === "ar" ? "جمهور العلامة الافتراضي" : "Defaults to your brand audience")}
              />
            </FieldGroup>

            <FieldGroup>
              <Label htmlFor="pillars">
                {locale === "ar" ? "محاور المحتوى" : "Content pillars"}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="pillars"
                  value={pillarInput}
                  onChange={(e) => setPillarInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addPillar();
                    }
                  }}
                  placeholder={locale === "ar" ? "مثال: تعليمي" : "e.g. Education"}
                />
                <Button type="button" variant="secondary" size="sm" onClick={addPillar}>
                  {locale === "ar" ? "إضافة" : "Add"}
                </Button>
              </div>
              {pillars.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {pillars.map((pillar) => (
                    <Badge key={pillar} tone="accent">
                      {pillar}
                      <button
                        type="button"
                        aria-label={`Remove ${pillar}`}
                        onClick={() => setPillars((p) => p.filter((x) => x !== pillar))}
                        className="ms-0.5"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </FieldGroup>

            <FieldGroup>
              <Label htmlFor="instructions">
                {locale === "ar" ? "تعليمات إضافية" : "Custom instructions"}
              </Label>
              <Textarea
                id="instructions"
                rows={2}
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder={
                  locale === "ar"
                    ? "أي شيء يجب أن يلتزم به الذكاء الاصطناعي"
                    : "Anything the AI should stick to"
                }
              />
            </FieldGroup>

            {error && (
              <div className="flex items-start gap-2 rounded-[var(--radius-md)] border border-danger/30 bg-danger-soft p-3 text-sm text-danger">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                <span>
                  {locale === "ar" && error instanceof GenerationError
                    ? (ERROR_MESSAGE_AR[error.code] ?? error.message)
                    : error.message}
                </span>
              </div>
            )}

            <Button
              type="button"
              onClick={handleGenerate}
              disabled={submitting || !topic.trim()}
              className="w-full"
            >
              {submitting ? (
                <>
                  <RefreshCw size={16} className="animate-spin" aria-hidden="true" />
                  {locale === "ar" ? "جارٍ الإنشاء..." : "Generating..."}
                </>
              ) : (
                <>
                  <Sparkles size={16} aria-hidden="true" />
                  {variants.length > 0
                    ? locale === "ar"
                      ? "إنشاء نسخة أخرى"
                      : "Generate another variant"
                    : locale === "ar"
                      ? "إنشاء"
                      : "Generate"}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          {variants.length === 0 ? (
            <Card>
              <CardContent>
                <EmptyState
                  icon={<Sparkles size={20} />}
                  title={locale === "ar" ? "لا توجد نتائج بعد" : "No results yet"}
                  description={
                    locale === "ar"
                      ? "املأ النموذج واضغط إنشاء لرؤية المحتوى هنا."
                      : "Fill in the form and generate to see content here."
                  }
                />
              </CardContent>
            </Card>
          ) : (
            <>
              <Tabs
                value={activeVariantId ?? undefined}
                onValueChange={setActiveVariantId}
              >
                <div className="flex items-center justify-between">
                  <TabsList>
                    {variants.map((v, i) => (
                      <TabsTrigger key={v.id} value={v.id}>
                        {locale === "ar" ? `نسخة ${i + 1}` : `Variant ${i + 1}`}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {variants.length > 1 && activeVariant && (
                    <button
                      type="button"
                      onClick={() => removeVariant(activeVariant.id)}
                      className="flex items-center gap-1 text-xs text-text-muted hover:text-danger"
                      aria-label={locale === "ar" ? "حذف هذه النسخة" : "Discard this variant"}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                      {locale === "ar" ? "حذف" : "Discard"}
                    </button>
                  )}
                </div>

                {variants.map((v) => (
                  <TabsContent key={v.id} value={v.id} className="mt-4">
                    {activeVariant?.id === v.id && (
                      <div className="flex flex-col gap-4">
                        <Card>
                          <CardContent className="flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-text-muted">
                                {locale === "ar" ? "مزوّد الذكاء الاصطناعي" : "Provider"}:{" "}
                                <Badge tone="neutral">{v.provider}</Badge>
                              </span>
                            </div>
                            <FieldGroup>
                              <Label htmlFor="hook">{locale === "ar" ? "الخطّاف" : "Hook"}</Label>
                              <Input
                                id="hook"
                                value={v.content.hook}
                                onChange={(e) => updateActiveContent({ hook: e.target.value })}
                              />
                            </FieldGroup>
                            <FieldGroup>
                              <Label htmlFor="caption">
                                {locale === "ar" ? "التعليق" : "Caption"}
                              </Label>
                              <Textarea
                                id="caption"
                                rows={4}
                                value={v.content.caption}
                                onChange={(e) =>
                                  updateActiveContent({ caption: e.target.value })
                                }
                              />
                            </FieldGroup>
                            <FieldGroup>
                              <Label htmlFor="hashtags">
                                {locale === "ar" ? "الوسوم (مفصولة بفواصل)" : "Hashtags (comma-separated)"}
                              </Label>
                              <Input
                                id="hashtags"
                                value={v.content.hashtags.join(", ")}
                                onChange={(e) =>
                                  updateActiveContent({
                                    hashtags: e.target.value
                                      .split(",")
                                      .map((t) => t.trim().replace(/^#/, ""))
                                      .filter(Boolean),
                                  })
                                }
                              />
                            </FieldGroup>
                            <FieldGroup>
                              <Label htmlFor="cta">
                                {locale === "ar" ? "دعوة لاتخاذ إجراء" : "Call to action"}
                              </Label>
                              <Input
                                id="cta"
                                value={v.content.callToAction}
                                onChange={(e) =>
                                  updateActiveContent({ callToAction: e.target.value })
                                }
                              />
                            </FieldGroup>
                          </CardContent>
                        </Card>

                        {platforms.length > 0 && (
                          <div className="flex flex-wrap gap-6">
                            {platforms.map((platform) => (
                              <PlatformPreview
                                key={platform}
                                platform={platform}
                                brandName={brand?.name ?? "Your Brand"}
                                content={v.content}
                                language={language}
                              />
                            ))}
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-3">
                          <Button type="button" variant="secondary" onClick={handleCopy}>
                            {copied ? (
                              <Check size={16} aria-hidden="true" />
                            ) : (
                              <Copy size={16} aria-hidden="true" />
                            )}
                            {copied
                              ? locale === "ar"
                                ? "تم النسخ"
                                : "Copied"
                              : locale === "ar"
                                ? "نسخ"
                                : "Copy"}
                          </Button>
                          <Button
                            type="button"
                            onClick={handleSaveDraft}
                            disabled={saving || saved}
                          >
                            {saved
                              ? locale === "ar"
                                ? "تم الحفظ"
                                : "Saved"
                              : saving
                                ? locale === "ar"
                                  ? "جارٍ الحفظ..."
                                  : "Saving..."
                                : locale === "ar"
                                  ? "حفظ كمسودة"
                                  : "Save as draft"}
                          </Button>
                          {saved && (
                            <Link
                              href="/content"
                              className="text-sm font-medium text-accent hover:underline"
                            >
                              {locale === "ar" ? "عرض في المحتوى" : "View in Content"}
                            </Link>
                          )}
                        </div>
                      </div>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
