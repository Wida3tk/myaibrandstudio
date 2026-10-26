"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Canvas, FabricObject, Textbox } from "fabric";
import {
  Type,
  Upload,
  Download,
  Save,
  Undo2,
  Redo2,
  Trash2,
  ZoomIn,
  ZoomOut,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/lib/auth/auth-provider";
import { useOrg } from "@/lib/org/use-org";
import { useLocale } from "@/components/locale-provider";
import { PRIMARY_BRAND_ID } from "@/lib/brand/schema";
import { createAsset, listAssets } from "@/lib/assets/data";
import { uploadToCloudinary } from "@/lib/assets/cloudinary";
import { validateAssetFile } from "@/lib/assets/validate";
import type { Asset } from "@/lib/assets/schema";
import { canvasToFile } from "@/lib/design/export";
import { FORMAT_PRESETS, getPreset } from "@/lib/design/presets";
import {
  TEMPLATES,
  getTemplate,
  type TemplateObjectSpec,
} from "@/lib/design/templates";
import { composeLayout } from "@/lib/design/compose";
import {
  applyComposedSpecs,
  LAYOUT_PROPERTIES_TO_INCLUDE,
} from "@/lib/design/apply-layout";
import { summarizeCanvas, applyEditOps } from "@/lib/design/revise";
import {
  runCreativeDirector,
  buildDesignVariations,
} from "@/lib/creative/pipeline";
import { createCampaign, selectCampaignVariation } from "@/lib/creative/data";
import { generateRevisionOps } from "@/lib/creative/generate";
import type {
  CreativeBrief,
  CreativeSpec,
  DesignVariation,
  LayoutVariant,
} from "@/lib/creative/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FieldGroup, Label, Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { LayersPanel } from "@/components/design/layers-panel";
import { TextPropertiesPanel } from "@/components/design/text-properties-panel";
import { BriefDialog } from "@/components/creative/brief-dialog";
import { VariationPicker } from "@/components/creative/variation-picker";
import { RevisePanel } from "@/components/creative/revise-panel";

const MAX_HISTORY = 50;

export default function DesignPage() {
  const { user } = useAuth();
  const { orgId, brand } = useOrg();
  const { locale } = useLocale();

  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);
  const fabricModuleRef = useRef<typeof import("fabric") | null>(null);
  const historyRef = useRef<{ stack: string[]; index: number }>({
    stack: [],
    index: -1,
  });

  const [ready, setReady] = useState(false);
  const [version, setVersion] = useState(0);
  const [selectedObject, setSelectedObject] = useState<FabricObject | null>(
    null,
  );
  const [formatId, setFormatId] = useState(FORMAT_PRESETS[0].id);
  const [zoom, setZoom] = useState(0.5);
  const [backgroundColor, setBackgroundColor] = useState(
    TEMPLATES[0].background,
  );
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const [assets, setAssets] = useState<Asset[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [briefOpen, setBriefOpen] = useState(false);
  const [pipelineStep, setPipelineStep] = useState<string | null>(null);
  const [pipelineOutput, setPipelineOutput] = useState<{
    spec: CreativeSpec;
    backgroundImageUrl: string | null;
    language: "ar" | "en";
    variations: DesignVariation[];
  } | null>(null);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [activeCampaign, setActiveCampaign] = useState<{
    spec: CreativeSpec;
    backgroundImageUrl: string | null;
    language: "ar" | "en";
    variant: LayoutVariant;
  } | null>(null);

  const bump = useCallback(() => setVersion((v) => v + 1), []);

  const pushHistory = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    // canvas.toJSON() takes no arguments (it's JSON.stringify's own hook) — toObject() is the
    // call that accepts propertiesToInclude, needed so AI-layout role tags survive undo/redo.
    const json = JSON.stringify(canvas.toObject(LAYOUT_PROPERTIES_TO_INCLUDE));
    const h = historyRef.current;
    const nextStack = [...h.stack.slice(0, h.index + 1), json].slice(
      -MAX_HISTORY,
    );
    historyRef.current = { stack: nextStack, index: nextStack.length - 1 };
    setCanUndo(historyRef.current.index > 0);
    setCanRedo(false);
  }, []);

  const commit = useCallback(() => {
    fabricCanvasRef.current?.requestRenderAll();
    bump();
    pushHistory();
    setSaved(false);
  }, [bump, pushHistory]);

  function applySpecs(
    canvas: Canvas,
    fabric: typeof import("fabric"),
    specs: TemplateObjectSpec[],
  ) {
    for (const spec of specs) {
      if (spec.type === "rect") {
        canvas.add(
          new fabric.Rect({
            left: spec.left,
            top: spec.top,
            width: spec.width,
            height: spec.height,
            fill: spec.fill,
            rx: spec.rx ?? 0,
            ry: spec.rx ?? 0,
          }),
        );
      } else {
        canvas.add(
          new fabric.Textbox(spec.text, {
            left: spec.left,
            top: spec.top,
            width: spec.width,
            fontSize: spec.fontSize,
            fill: spec.fill,
            fontWeight: spec.fontWeight ?? "400",
            textAlign: spec.textAlign ?? "left",
            fontFamily: "Geist, sans-serif",
          }),
        );
      }
    }
  }

  function drawGuide(
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  ) {
    ctx.save();
    ctx.strokeStyle = "#6750d8";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
  }

  // Initialize the fabric canvas once on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const fabric = await import("fabric");
      if (cancelled || !canvasElRef.current) return;
      fabricModuleRef.current = fabric;

      const preset = getPreset(formatId);
      const canvas = new fabric.Canvas(canvasElRef.current, {
        width: preset.width,
        height: preset.height,
        backgroundColor,
        preserveObjectStacking: true,
      });
      fabricCanvasRef.current = canvas;
      applySpecs(
        canvas,
        fabric,
        getTemplate("blank").build(preset.width, preset.height),
      );
      canvas.requestRenderAll();

      canvas.on("selection:created", (e) =>
        setSelectedObject(e.selected?.[0] ?? null),
      );
      canvas.on("selection:updated", (e) =>
        setSelectedObject(e.selected?.[0] ?? null),
      );
      canvas.on("selection:cleared", () => setSelectedObject(null));
      canvas.on("object:modified", () => commit());
      canvas.on("text:editing:exited", () => commit());
      canvas.on("object:moving", (e) => {
        const target = e.target;
        const ctx = canvas.contextTop;
        canvas.clearContext(ctx);
        if (!target) return;
        const threshold = 6;
        const centerX = canvas.getWidth() / 2;
        const centerY = canvas.getHeight() / 2;
        const center = target.getCenterPoint();
        if (Math.abs(center.x - centerX) < threshold) {
          target.set({ left: centerX - target.getScaledWidth() / 2 });
          drawGuide(ctx, centerX, 0, centerX, canvas.getHeight());
        }
        if (Math.abs(center.y - centerY) < threshold) {
          target.set({ top: centerY - target.getScaledHeight() / 2 });
          drawGuide(ctx, 0, centerY, canvas.getWidth(), centerY);
        }
      });
      canvas.on("mouse:up", () => {
        canvas.clearContext(canvas.contextTop);
      });

      setReady(true);
      bump();
      pushHistory();
    })();

    return () => {
      cancelled = true;
      fabricCanvasRef.current?.dispose();
      fabricCanvasRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-time canvas setup
  }, []);

  useEffect(() => {
    if (!orgId) return;
    listAssets(orgId, PRIMARY_BRAND_ID)
      .then((list) => setAssets(list.filter((a) => a.kind === "image")))
      .catch(() => setAssets([]));
  }, [orgId]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;
      const active = canvas.getActiveObject() as
        (FabricObject & { isEditing?: boolean }) | undefined;
      if (active?.isEditing) return;

      if ((e.key === "Delete" || e.key === "Backspace") && active) {
        e.preventDefault();
        canvas.remove(active);
        commit();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handleUndo/handleRedo are stable closures over refs
  }, [commit]);

  function handleFormatChange(id: string) {
    setFormatId(id);
    const canvas = fabricCanvasRef.current;
    const fabric = fabricModuleRef.current;
    if (!canvas || !fabric) return;
    const preset = getPreset(id);
    canvas.setDimensions({ width: preset.width, height: preset.height });

    if (activeCampaign) {
      // Multi-format output: re-run the same layout variant at the new dimensions instead of
      // naively stretching the existing objects.
      canvas
        .getObjects()
        .slice()
        .forEach((o) => canvas.remove(o));
      const specs = composeLayout(activeCampaign.variant, {
        spec: activeCampaign.spec,
        width: preset.width,
        height: preset.height,
        language: activeCampaign.language,
        backgroundImageUrl: activeCampaign.backgroundImageUrl,
        logoUrl: brand?.logoUrl ?? "",
      });
      applyComposedSpecs(canvas, fabric, specs).then(() => commit());
      return;
    }

    canvas.requestRenderAll();
    commit();
  }

  function handleBackgroundChange(color: string) {
    setBackgroundColor(color);
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    canvas.backgroundColor = color;
    canvas.requestRenderAll();
    commit();
  }

  function handleApplyTemplate(id: string) {
    const canvas = fabricCanvasRef.current;
    const fabric = fabricModuleRef.current;
    if (!canvas || !fabric) return;
    const template = getTemplate(id);
    canvas
      .getObjects()
      .slice()
      .forEach((o) => canvas.remove(o));
    canvas.backgroundColor = template.background;
    setBackgroundColor(template.background);
    applySpecs(
      canvas,
      fabric,
      template.build(canvas.getWidth(), canvas.getHeight()),
    );
    canvas.requestRenderAll();
    commit();
  }

  async function handleGenerateFromBrief(brief: CreativeBrief) {
    if (!orgId || !user) return;
    const preset = getPreset(brief.platform);
    setPipelineStep(
      locale === "ar"
        ? "جارٍ التوجيه الإبداعي..."
        : "Directing the creative...",
    );
    try {
      const { spec, backgroundImageUrl } = await runCreativeDirector(
        orgId,
        PRIMARY_BRAND_ID,
        user.uid,
        brief,
        { width: preset.width, height: preset.height },
      );
      setPipelineStep(
        locale === "ar" ? "جارٍ تصميم 3 نسخ..." : "Composing 3 layouts...",
      );
      const variations = await buildDesignVariations(
        spec,
        { width: preset.width, height: preset.height },
        brief.language,
        backgroundImageUrl,
        brand?.logoUrl ?? "",
      );
      setPipelineOutput({
        spec,
        backgroundImageUrl,
        language: brief.language,
        variations,
      });
      setFormatId(brief.platform);
      try {
        // Persisting the campaign is for history/revisit — the 3 variations are already fully
        // usable client-side, so a save failure (e.g. Firestore rules not yet deployed for this
        // new collection) shouldn't block picking and editing one.
        const id = await createCampaign(orgId, PRIMARY_BRAND_ID, user.uid, {
          brief,
          spec,
          backgroundImageUrl,
          variations,
        });
        setCampaignId(id);
      } catch (err) {
        console.error(
          "Failed to save campaign (variations are still usable):",
          err,
        );
      }
    } finally {
      setPipelineStep(null);
    }
  }

  async function handleApproveVariation(variation: DesignVariation) {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !pipelineOutput) return;
    const preset = getPreset(formatId);
    canvas.setDimensions({ width: preset.width, height: preset.height });
    await canvas.loadFromJSON(variation.fabricJson);
    canvas.requestRenderAll();
    setActiveCampaign({
      spec: pipelineOutput.spec,
      backgroundImageUrl: pipelineOutput.backgroundImageUrl,
      language: pipelineOutput.language,
      variant: variation.layoutVariant,
    });
    setBackgroundColor(String(canvas.backgroundColor || "#ffffff"));
    setSelectedObject(null);
    bump();
    historyRef.current = { stack: [], index: -1 };
    pushHistory();
    setSaved(false);
    if (orgId && campaignId) {
      await selectCampaignVariation(
        orgId,
        PRIMARY_BRAND_ID,
        campaignId,
        variation.id,
      );
    }
    setPipelineOutput(null);
  }

  async function handleRevise(instruction: string): Promise<string[]> {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !orgId) return [];
    const preset = getPreset(formatId);
    const summary = summarizeCanvas(canvas);
    const { ops } = await generateRevisionOps(
      orgId,
      PRIMARY_BRAND_ID,
      instruction,
      activeCampaign?.language ?? (locale === "ar" ? "ar" : "en"),
      { width: preset.width, height: preset.height },
      summary,
    );
    const applied = applyEditOps(canvas, ops);
    if (applied.length > 0) commit();
    return applied;
  }

  function handleAddText() {
    const canvas = fabricCanvasRef.current;
    const fabric = fabricModuleRef.current;
    if (!canvas || !fabric) return;
    const textbox = new fabric.Textbox(
      locale === "ar" ? "نص جديد" : "New text",
      {
        left: canvas.getWidth() / 2 - 100,
        top: canvas.getHeight() / 2 - 20,
        width: 200,
        fontSize: 32,
        fill: "#1e2440",
        fontFamily: "Geist, sans-serif",
        direction: locale === "ar" ? "rtl" : "ltr",
        textAlign: locale === "ar" ? "right" : "left",
      },
    );
    canvas.add(textbox);
    canvas.setActiveObject(textbox);
    commit();
  }

  async function addImageFromUrl(url: string) {
    const canvas = fabricCanvasRef.current;
    const fabric = fabricModuleRef.current;
    if (!canvas || !fabric) return;
    const img = await fabric.FabricImage.fromURL(url, {
      crossOrigin: "anonymous",
    });
    const maxWidth = canvas.getWidth() * 0.6;
    if (img.width && img.width > maxWidth) {
      img.scaleToWidth(maxWidth);
    }
    img.set({
      left: canvas.getWidth() / 2 - (img.getScaledWidth() ?? 0) / 2,
      top: canvas.getHeight() / 2 - (img.getScaledHeight() ?? 0) / 2,
    });
    canvas.add(img);
    canvas.setActiveObject(img);
    commit();
  }

  async function handleUploadImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !orgId || !user) return;
    const validationError = validateAssetFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const uploaded = await uploadToCloudinary(file);
      await createAsset(orgId, PRIMARY_BRAND_ID, user.uid, {
        url: uploaded.url,
        publicId: uploaded.publicId,
        kind: "image",
      });
      setAssets((prev) => [
        ...prev,
        {
          id: uploaded.publicId,
          url: uploaded.url,
          publicId: uploaded.publicId,
          kind: "image",
          tags: [],
          createdBy: user.uid,
        },
      ]);
      await addImageFromUrl(uploaded.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  function restoreFromHistory(index: number) {
    const canvas = fabricCanvasRef.current;
    const json = historyRef.current.stack[index];
    if (!canvas || !json) return;
    canvas.loadFromJSON(json).then(() => {
      canvas.requestRenderAll();
      setSelectedObject(null);
      bump();
    });
  }

  function handleUndo() {
    const h = historyRef.current;
    if (h.index <= 0) return;
    h.index -= 1;
    restoreFromHistory(h.index);
    setCanUndo(h.index > 0);
    setCanRedo(true);
  }

  function handleRedo() {
    const h = historyRef.current;
    if (h.index >= h.stack.length - 1) return;
    h.index += 1;
    restoreFromHistory(h.index);
    setCanUndo(true);
    setCanRedo(h.index < h.stack.length - 1);
  }

  function handleDownload() {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "design.png";
    link.href = canvas.toDataURL({ format: "png", multiplier: 2 });
    link.click();
  }

  async function handleSaveToAssets() {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !orgId || !user) return;
    setError(null);
    setSaving(true);
    try {
      const el = canvas.toCanvasElement(2);
      const file = await canvasToFile(el, `design-${Date.now()}.png`);
      const uploaded = await uploadToCloudinary(file);
      await createAsset(orgId, PRIMARY_BRAND_ID, user.uid, {
        url: uploaded.url,
        publicId: uploaded.publicId,
        kind: "image",
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  const preset = getPreset(formatId);
  const canvas = fabricCanvasRef.current;

  return (
    <div
      dir={locale === "ar" ? "rtl" : "ltr"}
      className="flex flex-col gap-6 text-start"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text">
            {locale === "ar" ? "استوديو التصميم" : "Design Studio"}
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            {locale === "ar"
              ? "صمّم مرئيات تناسب كل منصة."
              : "Design visuals sized for every platform."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" onClick={() => setBriefOpen(true)}>
            <Sparkles size={16} aria-hidden="true" />
            {locale === "ar" ? "إنشاء بالذكاء الاصطناعي" : "Generate with AI"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleUndo}
            disabled={!canUndo}
          >
            <Undo2 size={16} aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleRedo}
            disabled={!canRedo}
          >
            <Redo2 size={16} aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleDownload}
            disabled={!ready}
          >
            <Download size={16} aria-hidden="true" />
            {locale === "ar" ? "تنزيل" : "Download"}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSaveToAssets}
            disabled={!ready || saving || saved}
          >
            <Save size={16} aria-hidden="true" />
            {saved
              ? locale === "ar"
                ? "تم الحفظ"
                : "Saved"
              : saving
                ? locale === "ar"
                  ? "جارٍ الحفظ..."
                  : "Saving..."
                : locale === "ar"
                  ? "حفظ في الأصول"
                  : "Save to Assets"}
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <BriefDialog
        open={briefOpen}
        onOpenChange={setBriefOpen}
        brand={brand}
        defaultLanguage={locale === "ar" ? "ar" : "en"}
        onGenerate={handleGenerateFromBrief}
      />

      {pipelineStep && (
        <Card>
          <CardContent className="flex items-center gap-2 text-sm text-text-muted">
            <Skeleton className="h-4 w-4 rounded-full" />
            {pipelineStep}
          </CardContent>
        </Card>
      )}

      {pipelineOutput && (
        <Card>
          <CardContent className="flex flex-col gap-3">
            <div>
              <h2 className="text-sm font-medium text-text">
                {locale === "ar"
                  ? "اختر إحدى النسخ الثلاث"
                  : "Choose one of the 3 variations"}
              </h2>
              <p className="text-xs text-text-muted">
                {locale === "ar"
                  ? "يمكنك تعديل أي نسخة يدويًا أو بالذكاء الاصطناعي بعد الاعتماد."
                  : "You can still edit the approved one manually or with AI afterwards."}
              </p>
            </div>
            <VariationPicker
              variations={pipelineOutput.variations}
              onApprove={handleApproveVariation}
            />
          </CardContent>
        </Card>
      )}

      <div className="grid min-w-0 gap-6 lg:grid-cols-[14rem_1fr_16rem]">
        <Card className="h-fit">
          <CardContent className="flex flex-col gap-4">
            <FieldGroup>
              <Label>{locale === "ar" ? "القالب" : "Template"}</Label>
              <Select
                defaultValue="blank"
                onChange={(e) => handleApplyTemplate(e.target.value)}
              >
                {TEMPLATES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {locale === "ar" ? t.nameAr : t.nameEn}
                  </option>
                ))}
              </Select>
            </FieldGroup>

            <FieldGroup>
              <Label>{locale === "ar" ? "المقاس" : "Format"}</Label>
              <Select
                value={formatId}
                onChange={(e) => handleFormatChange(e.target.value)}
              >
                {FORMAT_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {locale === "ar" ? p.labelAr : p.labelEn} ({p.width}×
                    {p.height})
                  </option>
                ))}
              </Select>
            </FieldGroup>

            <FieldGroup>
              <Label>{locale === "ar" ? "لون الخلفية" : "Background"}</Label>
              <input
                type="color"
                value={backgroundColor}
                onChange={(e) => handleBackgroundChange(e.target.value)}
                className="h-9 w-full rounded-[var(--radius-md)] border border-border bg-bg"
              />
            </FieldGroup>

            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={handleAddText}
                disabled={!ready}
              >
                <Type size={16} aria-hidden="true" />
                {locale === "ar" ? "إضافة نص" : "Add text"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={!ready || uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={16} aria-hidden="true" />
                {uploading
                  ? locale === "ar"
                    ? "جارٍ الرفع..."
                    : "Uploading..."
                  : locale === "ar"
                    ? "رفع صورة"
                    : "Upload image"}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleUploadImage}
                className="hidden"
              />
            </div>

            {assets.length > 0 && (
              <div>
                <Label>{locale === "ar" ? "من الأصول" : "From Assets"}</Label>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {assets.slice(0, 9).map((asset) => (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => addImageFromUrl(asset.url)}
                      className="h-12 w-12 overflow-hidden rounded-[var(--radius-sm)] border border-border hover:border-accent"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- static export, no Image Optimization API */}
                      <img
                        src={asset.url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex min-w-0 items-start justify-center">
          <div className="flex min-w-0 max-w-full flex-col items-center gap-3">
            <div
              className="scrollbar-thin max-w-full overflow-auto rounded-[var(--radius-lg)] border border-border bg-surface p-4 shadow-[var(--shadow-sm)]"
              style={{ maxHeight: "70vh" }}
            >
              <div
                style={{
                  width: preset.width * zoom,
                  height: preset.height * zoom,
                }}
              >
                <div
                  style={{
                    width: preset.width,
                    height: preset.height,
                    transform: `scale(${zoom})`,
                    transformOrigin: "top left",
                  }}
                >
                  <canvas ref={canvasElRef} />
                </div>
              </div>
            </div>
            {!ready && <Skeleton className="h-10 w-48" />}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setZoom((z) => Math.max(0.1, z - 0.1))}
              >
                <ZoomOut size={16} />
              </Button>
              <span className="w-12 text-center text-sm text-text-muted">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setZoom((z) => Math.min(1.5, z + 0.1))}
              >
                <ZoomIn size={16} />
              </Button>
            </div>
          </div>
        </div>

        <Card className="h-fit">
          <CardContent className="flex flex-col gap-4">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label>{locale === "ar" ? "الطبقات" : "Layers"}</Label>
                {selectedObject && (
                  <button
                    type="button"
                    onClick={() => {
                      canvas?.remove(selectedObject);
                      commit();
                    }}
                    aria-label={
                      locale === "ar" ? "حذف المحدد" : "Delete selected"
                    }
                    className="text-text-muted hover:text-danger"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              {canvas && (
                <LayersPanel
                  canvas={canvas}
                  version={version}
                  activeObject={selectedObject}
                  onChange={bump}
                />
              )}
            </div>

            {canvas && selectedObject?.type === "textbox" && (
              <TextPropertiesPanel
                canvas={canvas}
                textbox={selectedObject as Textbox}
                onChange={bump}
              />
            )}

            {activeCampaign && <RevisePanel onRevise={handleRevise} />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
