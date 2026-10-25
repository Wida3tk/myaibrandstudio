"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-provider";
import { useOrg } from "@/lib/org/use-org";
import { useLocale } from "@/components/locale-provider";
import { PRIMARY_BRAND_ID } from "@/lib/brand/schema";
import { listContentItems, transitionContentItem } from "@/lib/content/data";
import { listAssets } from "@/lib/assets/data";
import { createCalendarEntry, deleteCalendarEntry, listCalendarEntries } from "@/lib/calendar/data";
import { getMonthGridDays, getWeekDays, toDateKey } from "@/lib/calendar/grid";
import type { ContentItem } from "@/lib/content/schema";
import type { CalendarEntry } from "@/lib/calendar/schema";
import type { Asset } from "@/lib/assets/schema";
import { PLATFORM_LABEL, PlatformPreview } from "@/components/platform-previews";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ContentDetailDialog } from "@/components/content/content-detail-dialog";
import { ScheduleDialog } from "@/components/calendar/schedule-dialog";

const WEEKDAY_LABELS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_LABELS_AR = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];

export default function CalendarPage() {
  const { user } = useAuth();
  const { orgId, brand, loading: orgLoading } = useOrg();
  const { locale } = useLocale();

  const [items, setItems] = useState<ContentItem[]>([]);
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [imageAssets, setImageAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [calView, setCalView] = useState<"month" | "week" | "list">("month");
  const [anchor, setAnchor] = useState(() => new Date());
  const [scheduleDate, setScheduleDate] = useState<Date | null>(null);
  const [openItemId, setOpenItemId] = useState<string | null>(null);
  const [busyApprovalId, setBusyApprovalId] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [contentItems, calendarEntries, assets] = await Promise.all([
          listContentItems(orgId, PRIMARY_BRAND_ID),
          listCalendarEntries(orgId, PRIMARY_BRAND_ID),
          listAssets(orgId, PRIMARY_BRAND_ID),
        ]);
        if (cancelled) return;
        setItems(contentItems);
        setEntries(calendarEntries);
        setImageAssets(assets.filter((a) => a.kind === "image"));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load calendar.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  const itemsById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const entriesByDate = useMemo(() => {
    const map = new Map<string, CalendarEntry[]>();
    for (const entry of entries) {
      const list = map.get(entry.scheduledFor) ?? [];
      list.push(entry);
      map.set(entry.scheduledFor, list);
    }
    return map;
  }, [entries]);

  const days = calView === "week" ? getWeekDays(anchor) : getMonthGridDays(anchor.getFullYear(), anchor.getMonth());
  const todayKey = toDateKey(new Date());
  const weekdayLabels = locale === "ar" ? WEEKDAY_LABELS_AR : WEEKDAY_LABELS_EN;

  function stepAnchor(dir: 1 | -1) {
    setAnchor((a) => {
      const next = new Date(a);
      if (calView === "week") next.setDate(next.getDate() + dir * 7);
      else next.setMonth(next.getMonth() + dir);
      return next;
    });
  }

  async function handleScheduleSave(contentItemId: string, platform: import("@/lib/content/schema").Platform) {
    if (!orgId || !scheduleDate) return;
    const id = await createCalendarEntry(orgId, PRIMARY_BRAND_ID, {
      contentItemId,
      platform,
      scheduledFor: toDateKey(scheduleDate),
    });
    setEntries((prev) => [...prev, { id, contentItemId, platform, scheduledFor: toDateKey(scheduleDate), publishStatus: "scheduled" }]);
  }

  async function handleUnschedule(entryId: string) {
    if (!orgId) return;
    await deleteCalendarEntry(orgId, PRIMARY_BRAND_ID, entryId);
    setEntries((prev) => prev.filter((e) => e.id !== entryId));
  }

  async function handleApprove(item: ContentItem, toStatus: "in_review" | "approved" | "draft", action: string) {
    if (!orgId || !user) return;
    setBusyApprovalId(item.id);
    try {
      await transitionContentItem(orgId, PRIMARY_BRAND_ID, item, toStatus, user.uid, action);
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? {
                ...i,
                status: toStatus,
                history: [...i.history, { uid: user.uid, action, fromStatus: item.status, toStatus, at: new Date().toISOString() }],
              }
            : i,
        ),
      );
    } finally {
      setBusyApprovalId(null);
    }
  }

  function handleChanged(updated: ContentItem) {
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
  }

  const pendingApproval = items.filter((i) => i.status === "in_review");
  const unscheduledItems = items; // any item can be scheduled, including re-scheduling for another platform/date
  const openItem = items.find((i) => i.id === openItemId) ?? null;

  if (orgLoading || loading) {
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
          {locale === "ar" ? "التقويم والموافقات" : "Calendar & Approvals"}
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          {locale === "ar"
            ? "جدول محتواك وراجع ما ينتظر الموافقة."
            : "Schedule your content and review what's waiting for approval."}
        </p>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <Tabs defaultValue="calendar">
        <TabsList>
          <TabsTrigger value="calendar">{locale === "ar" ? "التقويم" : "Calendar"}</TabsTrigger>
          <TabsTrigger value="approvals">
            {locale === "ar" ? "الموافقات" : "Approvals"}
            {pendingApproval.length > 0 && (
              <Badge tone="warning" className="ms-1.5">{pendingApproval.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="mt-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="icon" onClick={() => stepAnchor(-1)} aria-label="Previous">
                <ChevronLeft size={16} className="rtl:rotate-180" />
              </Button>
              <span className="min-w-36 text-center font-medium text-text">
                {anchor.toLocaleDateString(locale === "ar" ? "ar" : "en-US", { month: "long", year: "numeric" })}
              </span>
              <Button type="button" variant="ghost" size="icon" onClick={() => stepAnchor(1)} aria-label="Next">
                <ChevronRight size={16} className="rtl:rotate-180" />
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => setAnchor(new Date())}>
                {locale === "ar" ? "اليوم" : "Today"}
              </Button>
            </div>
            <div className="flex gap-1.5">
              {(["month", "week", "list"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setCalView(v)}
                  className={`rounded-[var(--radius-full)] border px-3 py-1 text-sm ${
                    calView === v ? "border-accent bg-accent-soft text-accent" : "border-border text-text-muted"
                  }`}
                >
                  {v === "month"
                    ? locale === "ar" ? "شهر" : "Month"
                    : v === "week"
                      ? locale === "ar" ? "أسبوع" : "Week"
                      : locale === "ar" ? "قائمة" : "List"}
                </button>
              ))}
            </div>
          </div>

          {calView === "list" ? (
            entries.length === 0 ? (
              <Card>
                <CardContent>
                  <EmptyState title={locale === "ar" ? "لا يوجد محتوى مجدول" : "Nothing scheduled"} />
                </CardContent>
              </Card>
            ) : (
              <Card>
                <ul className="divide-y divide-border">
                  {entries.map((entry) => {
                    const item = itemsById.get(entry.contentItemId);
                    const published = Boolean(item?.publishes[entry.platform]);
                    return (
                      <li key={entry.id} className="flex items-center gap-3 px-5 py-3">
                        <span className="w-24 shrink-0 text-sm text-text-muted">{entry.scheduledFor}</span>
                        <button
                          type="button"
                          onClick={() => item && setOpenItemId(item.id)}
                          className="flex-1 truncate text-start text-sm font-medium text-text hover:underline"
                        >
                          {item?.structuredPayload.hook || item?.topic || entry.contentItemId}
                        </button>
                        <Badge tone="neutral">{PLATFORM_LABEL[entry.platform]}</Badge>
                        <Badge tone={published ? "success" : "accent"}>
                          {published
                            ? locale === "ar" ? "منشور" : "Published"
                            : locale === "ar" ? "مجدول" : "Scheduled"}
                        </Badge>
                        <button
                          type="button"
                          onClick={() => handleUnschedule(entry.id)}
                          aria-label={locale === "ar" ? "إلغاء الجدولة" : "Unschedule"}
                          className="text-text-muted hover:text-danger"
                        >
                          <X size={14} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            )
          ) : (
            <div className="overflow-x-auto">
              <div className="grid min-w-[42rem] grid-cols-7 gap-px rounded-[var(--radius-lg)] border border-border bg-border">
                {weekdayLabels.map((label) => (
                  <div key={label} className="bg-surface-raised px-2 py-1.5 text-center text-xs font-medium text-text-muted">
                    {label}
                  </div>
                ))}
                {days.map((day) => {
                  const key = toDateKey(day);
                  const dayEntries = entriesByDate.get(key) ?? [];
                  const inMonth = calView === "week" || day.getMonth() === anchor.getMonth();
                  const isToday = key === todayKey;
                  return (
                    <div
                      key={key}
                      className={`flex min-h-24 flex-col gap-1 bg-surface p-1.5 ${inMonth ? "" : "opacity-40"}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${isToday ? "bg-accent text-accent-contrast" : "text-text-muted"}`}>
                          {day.getDate()}
                        </span>
                        <button
                          type="button"
                          onClick={() => setScheduleDate(day)}
                          aria-label={locale === "ar" ? "جدولة محتوى" : "Schedule content"}
                          className="text-text-muted hover:text-accent"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <div className="flex flex-col gap-1">
                        {dayEntries.map((entry) => {
                          const item = itemsById.get(entry.contentItemId);
                          const published = Boolean(item?.publishes[entry.platform]);
                          return (
                            <button
                              key={entry.id}
                              type="button"
                              onClick={() => item && setOpenItemId(item.id)}
                              className={`truncate rounded-[var(--radius-sm)] px-1.5 py-0.5 text-start text-xs ${
                                published ? "bg-success-soft text-success" : "bg-accent-soft text-accent"
                              }`}
                              title={item?.structuredPayload.hook}
                            >
                              {item?.structuredPayload.hook || item?.topic}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="approvals" className="mt-4">
          {pendingApproval.length === 0 ? (
            <Card>
              <CardContent>
                <EmptyState
                  title={locale === "ar" ? "لا شيء ينتظر الموافقة" : "Nothing waiting for approval"}
                  description={
                    locale === "ar"
                      ? "عندما يُرسل محتوى للمراجعة سيظهر هنا."
                      : "Content submitted for review will show up here."
                  }
                />
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-4">
              {pendingApproval.map((item) => (
                <Card key={item.id}>
                  <CardContent className="flex flex-col gap-4 md:flex-row md:items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge tone="warning">{locale === "ar" ? "قيد المراجعة" : "In review"}</Badge>
                        <span className="text-xs text-text-muted">{item.topic}</span>
                      </div>
                      <p className="mt-2 font-medium text-text">{item.structuredPayload.hook}</p>
                      <p className="mt-1 text-sm text-text-muted">{item.structuredPayload.caption}</p>
                      <div className="mt-3 flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          disabled={busyApprovalId === item.id}
                          onClick={() => handleApprove(item, "approved", "approved")}
                        >
                          {locale === "ar" ? "اعتماد" : "Approve"}
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={busyApprovalId === item.id}
                          onClick={() => handleApprove(item, "draft", "changes_requested")}
                        >
                          {locale === "ar" ? "طلب تعديلات" : "Request changes"}
                        </Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setOpenItemId(item.id)}>
                          {locale === "ar" ? "عرض التفاصيل" : "View details"}
                        </Button>
                      </div>
                    </div>
                    {item.platformTargets[0] && (
                      <div className="shrink-0">
                        <PlatformPreview
                          platform={item.platformTargets[0]}
                          brandName={brand?.name ?? "Your Brand"}
                          content={item.structuredPayload}
                          language={item.language}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {openItem && orgId && user && (
        <ContentDetailDialog
          item={openItem}
          orgId={orgId}
          uid={user.uid}
          brandName={brand?.name ?? "Your Brand"}
          imageAssets={imageAssets}
          onClose={() => setOpenItemId(null)}
          onChanged={handleChanged}
        />
      )}

      {scheduleDate && (
        <ScheduleDialog
          date={scheduleDate}
          items={unscheduledItems}
          onClose={() => setScheduleDate(null)}
          onSchedule={handleScheduleSave}
        />
      )}
    </div>
  );
}
