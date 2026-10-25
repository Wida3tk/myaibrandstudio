"use client";

import { useState } from "react";
import { useLocale } from "@/components/locale-provider";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FieldGroup, Label, Select } from "@/components/ui/input";
import { PLATFORM_LABEL } from "@/components/platform-previews";
import { PLATFORMS, type Platform } from "@/lib/content/schema";
import type { ContentItem } from "@/lib/content/schema";

export function ScheduleDialog({
  date,
  items,
  onClose,
  onSchedule,
}: {
  date: Date;
  items: ContentItem[];
  onClose: () => void;
  onSchedule: (contentItemId: string, platform: Platform) => Promise<void>;
}) {
  const { locale } = useLocale();
  const [contentItemId, setContentItemId] = useState(items[0]?.id ?? "");
  const [platform, setPlatform] = useState<Platform>(PLATFORMS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dateLabel = date.toLocaleDateString(locale === "ar" ? "ar" : "en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  async function handleSchedule() {
    if (!contentItemId) return;
    setError(null);
    setSaving(true);
    try {
      await onSchedule(contentItemId, platform);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to schedule.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        title={locale === "ar" ? "جدولة محتوى" : "Schedule content"}
        description={dateLabel}
      >
        {items.length === 0 ? (
          <p className="text-sm text-text-muted">
            {locale === "ar"
              ? "لا يوجد محتوى متاح للجدولة. أنشئ محتوى أولاً."
              : "No content available to schedule. Generate some content first."}
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <FieldGroup>
              <Label>{locale === "ar" ? "المحتوى" : "Content"}</Label>
              <Select
                value={contentItemId}
                onChange={(e) => setContentItemId(e.target.value)}
              >
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.structuredPayload.hook || item.topic}
                  </option>
                ))}
              </Select>
            </FieldGroup>
            <FieldGroup>
              <Label>{locale === "ar" ? "المنصة" : "Platform"}</Label>
              <Select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as Platform)}
              >
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {PLATFORM_LABEL[p]}
                  </option>
                ))}
              </Select>
            </FieldGroup>
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="button" onClick={handleSchedule} disabled={saving}>
              {saving
                ? locale === "ar"
                  ? "جارٍ الجدولة..."
                  : "Scheduling..."
                : locale === "ar"
                  ? "جدولة"
                  : "Schedule"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
