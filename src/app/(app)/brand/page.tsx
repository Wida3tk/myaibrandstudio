"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Check, LogOut, Palette, Plus, X } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-provider";
import { useOrg } from "@/lib/org/use-org";
import { useLocale } from "@/components/locale-provider";
import { PRIMARY_BRAND_ID } from "@/lib/brand/schema";
import { saveBrandProfile } from "@/lib/brand/data";
import { brandProfileSchema, type BrandProfileInput } from "@/lib/brand/schema";
import { listAssets } from "@/lib/assets/data";
import type { Asset } from "@/lib/assets/schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FieldGroup, Input, Label, Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

const EMPTY: BrandProfileInput = {
  name: "",
  voiceTone: "",
  audienceDescription: "",
  objectives: [],
  memoryFacts: [],
  primaryColor: "",
  logoUrl: "",
};

const COPY = {
  en: {
    newTitle: "Set up your brand",
    title: "Brand Hub",
    subtitle: "The context every AI generation and design draws from.",
    signOut: "Sign out",
    positioning: "Positioning",
    positioningHint: "What your brand is called and what it stands for.",
    brandName: "Brand name",
    voice: "Voice & tone",
    voiceHint: "How your brand sounds — words, rhythm, formality.",
    audience: "Audience",
    audienceHint: "Who you're writing for.",
    objectives: "Objectives",
    objectivesHint: "One per line — what content should achieve.",
    memory: "Brand memory",
    memoryHint: "Rules the AI must always follow.",
    memoryPlaceholder: "e.g. Never use emoji in captions",
    add: "Add",
    visual: "Visual identity",
    visualHint: "Used to pre-fill the Design Studio.",
    primaryColor: "Primary color",
    logo: "Logo",
    pickFromAssets: "Pick from Assets",
    noImageAssets:
      "No images in your Asset Library yet — upload one on the Assets page.",
    save: "Save",
    saving: "Saving...",
    saved: "Saved",
  },
  ar: {
    newTitle: "أنشئ علامتك التجارية",
    title: "مركز العلامة التجارية",
    subtitle: "السياق الذي يعتمد عليه كل إنشاء بالذكاء الاصطناعي وكل تصميم.",
    signOut: "تسجيل الخروج",
    positioning: "الوضع التنافسي",
    positioningHint: "اسم علامتك وما تمثله.",
    brandName: "اسم العلامة",
    voice: "الصوت والنبرة",
    voiceHint: "كيف يبدو صوت علامتك — الكلمات والإيقاع ومستوى الرسمية.",
    audience: "الجمهور",
    audienceHint: "لمن تكتب.",
    objectives: "الأهداف",
    objectivesHint: "هدف واحد في كل سطر — ما الذي يجب أن يحققه المحتوى.",
    memory: "ذاكرة العلامة",
    memoryHint: "قواعد يجب أن يلتزم بها الذكاء الاصطناعي دائمًا.",
    memoryPlaceholder: "مثال: لا تستخدم الرموز التعبيرية أبدًا",
    add: "إضافة",
    visual: "الهوية البصرية",
    visualHint: "تُستخدم لتعبئة استوديو التصميم مسبقًا.",
    primaryColor: "اللون الأساسي",
    logo: "الشعار",
    pickFromAssets: "اختر من الأصول",
    noImageAssets:
      "لا توجد صور في مكتبة الأصول بعد — ارفع صورة من صفحة الأصول.",
    save: "حفظ",
    saving: "جارٍ الحفظ...",
    saved: "تم الحفظ",
  },
};

export default function BrandPage() {
  const { signOut } = useAuth();
  const { orgId, brand, loading: orgLoading } = useOrg();
  const { locale } = useLocale();
  const copy = COPY[locale];

  const [form, setForm] = useState<BrandProfileInput>(EMPTY);
  const [objectivesText, setObjectivesText] = useState("");
  const [newFact, setNewFact] = useState("");
  const [isNew, setIsNew] = useState(true);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [loadedBrand, setLoadedBrand] = useState(brand);

  if (brand !== loadedBrand) {
    setLoadedBrand(brand);
    if (brand) {
      setForm(brand);
      setObjectivesText(brand.objectives.join("\n"));
      setIsNew(false);
    }
  }

  useEffect(() => {
    if (!orgId) return;
    listAssets(orgId, PRIMARY_BRAND_ID)
      .then((list) => setAssets(list.filter((a) => a.kind === "image")))
      .catch(() => setAssets([]));
  }, [orgId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!orgId) return;
    setError(null);

    const parsed = brandProfileSchema.safeParse({
      ...form,
      objectives: objectivesText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input.");
      return;
    }

    setSaving(true);
    try {
      await saveBrandProfile(orgId, parsed.data, isNew);
      setForm(parsed.data);
      setIsNew(false);
      setSavedAt(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  function addFact() {
    const fact = newFact.trim();
    if (!fact) return;
    setForm((f) => ({ ...f, memoryFacts: [...f.memoryFacts, fact] }));
    setNewFact("");
  }

  function removeFact(index: number) {
    setForm((f) => ({
      ...f,
      memoryFacts: f.memoryFacts.filter((_, i) => i !== index),
    }));
  }

  if (orgLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  return (
    <div
      dir={locale === "ar" ? "rtl" : "ltr"}
      className="mx-auto flex max-w-3xl flex-col gap-6 text-start"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text">
            {isNew ? copy.newTitle : copy.title}
          </h1>
          <p className="mt-1 text-sm text-text-muted">{copy.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => signOut()}
          className="flex items-center gap-1.5 text-sm text-text-muted hover:text-danger"
        >
          <LogOut size={14} aria-hidden="true" />
          {copy.signOut}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>{copy.positioning}</CardTitle>
              <CardDescription>{copy.positioningHint}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Label htmlFor="name">{copy.brandName}</Label>
              <Input
                id="name"
                required
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>{copy.voice}</CardTitle>
              <CardDescription>{copy.voiceHint}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              rows={3}
              value={form.voiceTone}
              onChange={(e) =>
                setForm((f) => ({ ...f, voiceTone: e.target.value }))
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>{copy.audience}</CardTitle>
              <CardDescription>{copy.audienceHint}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              rows={3}
              value={form.audienceDescription}
              onChange={(e) =>
                setForm((f) => ({ ...f, audienceDescription: e.target.value }))
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>{copy.objectives}</CardTitle>
              <CardDescription>{copy.objectivesHint}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              rows={3}
              value={objectivesText}
              onChange={(e) => setObjectivesText(e.target.value)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>{copy.memory}</CardTitle>
              <CardDescription>{copy.memoryHint}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {form.memoryFacts.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {form.memoryFacts.map((fact, i) => (
                  <Badge key={`${fact}-${i}`} tone="accent">
                    {fact}
                    <button
                      type="button"
                      onClick={() => removeFact(i)}
                      aria-label={`Remove: ${fact}`}
                      className="ms-0.5"
                    >
                      <X size={12} />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                value={newFact}
                onChange={(e) => setNewFact(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addFact();
                  }
                }}
                placeholder={copy.memoryPlaceholder}
              />
              <Button type="button" variant="secondary" onClick={addFact}>
                <Plus size={16} aria-hidden="true" />
                {copy.add}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>{copy.visual}</CardTitle>
              <CardDescription>{copy.visualHint}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row">
            <FieldGroup className="flex-1">
              <Label htmlFor="color">{copy.primaryColor}</Label>
              <div className="flex items-center gap-2">
                <input
                  id="color"
                  type="color"
                  value={form.primaryColor || "#6750d8"}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, primaryColor: e.target.value }))
                  }
                  className="h-9 w-14 rounded-[var(--radius-md)] border border-border bg-bg"
                />
                <span className="text-sm text-text-muted">
                  {form.primaryColor || "#6750d8"}
                </span>
              </div>
            </FieldGroup>

            <FieldGroup className="flex-1">
              <Label>{copy.logo}</Label>
              <div className="flex items-center gap-3">
                {form.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- static export, no Image Optimization API
                  <img
                    src={form.logoUrl}
                    alt=""
                    className="h-12 w-12 rounded-[var(--radius-sm)] border border-border object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-sm)] border border-dashed border-border text-text-muted">
                    <Palette size={18} />
                  </div>
                )}
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowAssetPicker((s) => !s)}
                >
                  {copy.pickFromAssets}
                </Button>
              </div>
              {showAssetPicker && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {assets.length === 0 ? (
                    <p className="text-xs text-text-muted">
                      {copy.noImageAssets}
                    </p>
                  ) : (
                    assets.map((asset) => (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() => {
                          setForm((f) => ({ ...f, logoUrl: asset.url }));
                          setShowAssetPicker(false);
                        }}
                        className="h-10 w-10 overflow-hidden rounded-[var(--radius-sm)] border border-border hover:border-accent"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- static export, no Image Optimization API */}
                        <img
                          src={asset.url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </button>
                    ))
                  )}
                </div>
              )}
            </FieldGroup>
          </CardContent>
        </Card>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? copy.saving : copy.save}
          </Button>
          {savedAt && !error && (
            <span className="flex items-center gap-1 text-sm text-success">
              <Check size={14} aria-hidden="true" />
              {copy.saved}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
