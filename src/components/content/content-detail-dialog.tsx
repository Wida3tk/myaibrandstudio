"use client";

import { useState } from "react";
import { Check, ImageIcon } from "lucide-react";
import { useLocale } from "@/components/locale-provider";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FieldGroup, Input, Label, Textarea } from "@/components/ui/input";
import { PlatformPreview } from "@/components/platform-previews";
import type { GeneratedContent } from "@/lib/ai/generate";
import {
  attachImageToContentItem,
  nextStatus,
  transitionContentItem,
  updateContentItemPayload,
} from "@/lib/content/data";
import type { ContentItem, ContentStatus } from "@/lib/content/schema";
import type { Asset } from "@/lib/assets/schema";
import { publishToInstagram } from "@/lib/publish/instagram";
import { PRIMARY_BRAND_ID } from "@/lib/brand/schema";

const STATUS_LABEL_EN: Record<ContentStatus, string> = {
  draft: "Draft",
  in_review: "In review",
  approved: "Approved",
  published: "Published",
};
const STATUS_LABEL_AR: Record<ContentStatus, string> = {
  draft: "مسودة",
  in_review: "قيد المراجعة",
  approved: "معتمد",
  published: "منشور",
};
const STATUS_TONE: Record<
  ContentStatus,
  "neutral" | "warning" | "success" | "accent"
> = {
  draft: "neutral",
  in_review: "warning",
  approved: "success",
  published: "accent",
};

export function ContentDetailDialog({
  item,
  orgId,
  uid,
  brandName,
  imageAssets,
  onClose,
  onChanged,
}: {
  item: ContentItem;
  orgId: string;
  uid: string;
  brandName: string;
  imageAssets: Asset[];
  onClose: () => void;
  onChanged: (updated: ContentItem) => void;
}) {
  const { locale } = useLocale();
  const [content, setContent] = useState<GeneratedContent>(
    item.structuredPayload,
  );
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pickingImage, setPickingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function patch(p: Partial<GeneratedContent>) {
    setContent((c) => ({ ...c, ...p }));
    setDirty(true);
  }

  async function handleSaveEdits() {
    setError(null);
    setSaving(true);
    try {
      await updateContentItemPayload(orgId, PRIMARY_BRAND_ID, item.id, content);
      onChanged({ ...item, structuredPayload: content });
      setDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function handleTransition(toStatus: ContentStatus, action: string) {
    setError(null);
    setBusy(true);
    try {
      await transitionContentItem(
        orgId,
        PRIMARY_BRAND_ID,
        item,
        toStatus,
        uid,
        action,
      );
      onChanged({
        ...item,
        status: toStatus,
        history: [
          ...item.history,
          {
            uid,
            action,
            fromStatus: item.status,
            toStatus,
            at: new Date().toISOString(),
          },
        ],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status.");
    } finally {
      setBusy(false);
    }
  }

  async function handleAttachImage(url: string) {
    setError(null);
    setBusy(true);
    try {
      await attachImageToContentItem(orgId, PRIMARY_BRAND_ID, item.id, url);
      onChanged({ ...item, imageUrl: url });
      setPickingImage(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to attach image.");
    } finally {
      setBusy(false);
    }
  }

  async function handlePublishInstagram() {
    if (!item.imageUrl) return;
    setError(null);
    setBusy(true);
    try {
      const result = await publishToInstagram({
        orgId,
        brandId: PRIMARY_BRAND_ID,
        contentItemId: item.id,
        imageUrl: item.imageUrl,
        caption: content.caption,
      });
      onChanged({
        ...item,
        status: "published",
        publishes: {
          ...item.publishes,
          instagram: { ...result, publishedAt: new Date().toISOString() },
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to publish.");
    } finally {
      setBusy(false);
    }
  }

  const forward = nextStatus(item.status);
  const instagramPublish = item.publishes.instagram;
  const canPublishInstagram =
    item.status === "approved" &&
    item.platformTargets.includes("instagram") &&
    item.imageUrl &&
    !instagramPublish;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        title={item.structuredPayload.hook || item.topic}
        className="max-h-[85vh] w-[min(94vw,56rem)] overflow-y-auto scrollbar-thin"
      >
        <div className="flex items-center gap-2">
          <Badge tone={STATUS_TONE[item.status]}>
            {locale === "ar"
              ? STATUS_LABEL_AR[item.status]
              : STATUS_LABEL_EN[item.status]}
          </Badge>
          <span className="text-xs text-text-muted">{item.topic}</span>
        </div>

        {error && <p className="mt-2 text-sm text-danger">{error}</p>}

        <div className="mt-4 grid gap-6 md:grid-cols-[1fr_18rem]">
          <div className="flex flex-col gap-3">
            <FieldGroup>
              <Label>{locale === "ar" ? "الخطّاف" : "Hook"}</Label>
              <Input
                value={content.hook}
                onChange={(e) => patch({ hook: e.target.value })}
              />
            </FieldGroup>
            <FieldGroup>
              <Label>{locale === "ar" ? "التعليق" : "Caption"}</Label>
              <Textarea
                rows={4}
                value={content.caption}
                onChange={(e) => patch({ caption: e.target.value })}
              />
            </FieldGroup>
            <FieldGroup>
              <Label>{locale === "ar" ? "الوسوم" : "Hashtags"}</Label>
              <Input
                value={content.hashtags.join(", ")}
                onChange={(e) =>
                  patch({
                    hashtags: e.target.value
                      .split(",")
                      .map((t) => t.trim().replace(/^#/, ""))
                      .filter(Boolean),
                  })
                }
              />
            </FieldGroup>
            <FieldGroup>
              <Label>
                {locale === "ar" ? "دعوة لاتخاذ إجراء" : "Call to action"}
              </Label>
              <Input
                value={content.callToAction}
                onChange={(e) => patch({ callToAction: e.target.value })}
              />
            </FieldGroup>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={handleSaveEdits}
                disabled={!dirty || saving}
              >
                {saving
                  ? locale === "ar"
                    ? "جارٍ الحفظ..."
                    : "Saving..."
                  : locale === "ar"
                    ? "حفظ التعديلات"
                    : "Save edits"}
              </Button>
              {!dirty && (
                <span className="flex items-center gap-1 text-xs text-text-muted">
                  <Check size={12} /> {locale === "ar" ? "محدث" : "Up to date"}
                </span>
              )}
            </div>

            <div className="border-t border-border pt-3">
              <Label>{locale === "ar" ? "الصورة" : "Image"}</Label>
              <div className="mt-2 flex items-center gap-3">
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- static export
                  <img
                    src={item.imageUrl}
                    alt=""
                    className="h-16 w-16 rounded-[var(--radius-sm)] border border-border object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-[var(--radius-sm)] border border-dashed border-border text-text-muted">
                    <ImageIcon size={18} />
                  </div>
                )}
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setPickingImage((s) => !s)}
                >
                  {locale === "ar" ? "اختيار صورة" : "Choose image"}
                </Button>
              </div>
              {pickingImage && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {imageAssets.length === 0 ? (
                    <p className="text-xs text-text-muted">
                      {locale === "ar"
                        ? "لا توجد صور في مكتبة الأصول."
                        : "No images in your Asset Library."}
                    </p>
                  ) : (
                    imageAssets.map((asset) => (
                      <button
                        key={asset.id}
                        type="button"
                        disabled={busy}
                        onClick={() => handleAttachImage(asset.url)}
                        className="h-12 w-12 overflow-hidden rounded-[var(--radius-sm)] border border-border hover:border-accent"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- static export */}
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
            </div>

            <div className="flex flex-wrap gap-2 border-t border-border pt-3">
              {forward && (
                <Button
                  type="button"
                  size="sm"
                  disabled={busy}
                  onClick={() =>
                    handleTransition(
                      forward,
                      forward === "approved" ? "approved" : "submitted",
                    )
                  }
                >
                  {forward === "in_review"
                    ? locale === "ar"
                      ? "إرسال للمراجعة"
                      : "Submit for review"
                    : locale === "ar"
                      ? "اعتماد"
                      : "Approve"}
                </Button>
              )}
              {item.status === "in_review" && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={busy}
                  onClick={() => handleTransition("draft", "changes_requested")}
                >
                  {locale === "ar" ? "طلب تعديلات" : "Request changes"}
                </Button>
              )}
              {canPublishInstagram && (
                <Button
                  type="button"
                  size="sm"
                  disabled={busy}
                  onClick={handlePublishInstagram}
                >
                  {busy
                    ? locale === "ar"
                      ? "جارٍ النشر..."
                      : "Publishing..."
                    : locale === "ar"
                      ? "نشر على إنستغرام"
                      : "Publish to Instagram"}
                </Button>
              )}
              {instagramPublish?.permalink && (
                <a
                  href={instagramPublish.permalink}
                  target="_blank"
                  rel="noreferrer"
                  className="self-center text-sm text-accent underline"
                >
                  {locale === "ar" ? "عرض على إنستغرام" : "View on Instagram"}
                </a>
              )}
            </div>

            <div className="border-t border-border pt-3">
              <Label>{locale === "ar" ? "السجل" : "History"}</Label>
              <ol className="mt-1.5 flex flex-col gap-1 text-xs text-text-muted">
                {item.history.map((h, i) => (
                  <li key={i}>
                    {new Date(h.at).toLocaleString()} — {h.action}
                    {h.fromStatus ? ` (${h.fromStatus} → ${h.toStatus})` : ""}
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {item.platformTargets.length > 0 ? (
              item.platformTargets.map((platform) => (
                <PlatformPreview
                  key={platform}
                  platform={platform}
                  brandName={brandName}
                  content={content}
                  language={item.language}
                />
              ))
            ) : (
              <p className="text-sm text-text-muted">
                {locale === "ar"
                  ? "لا توجد منصات مستهدفة."
                  : "No platform targets."}
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
