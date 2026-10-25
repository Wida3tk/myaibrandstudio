"use client";

import { useEffect, useMemo, useState } from "react";
import { LayoutGrid, List, Search as SearchIcon, Sparkles } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-provider";
import { useOrg } from "@/lib/org/use-org";
import { useLocale } from "@/components/locale-provider";
import { PRIMARY_BRAND_ID } from "@/lib/brand/schema";
import { listContentItems } from "@/lib/content/data";
import { listAssets } from "@/lib/assets/data";
import type { ContentItem, ContentStatus } from "@/lib/content/schema";
import type { Asset } from "@/lib/assets/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ContentDetailDialog } from "@/components/content/content-detail-dialog";

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
const FILTERS: ("all" | ContentStatus)[] = [
  "all",
  "draft",
  "in_review",
  "approved",
  "published",
];

export default function ContentListPage() {
  const { user } = useAuth();
  const { orgId, brand, loading: orgLoading } = useOrg();
  const { locale } = useLocale();

  const [items, setItems] = useState<ContentItem[]>([]);
  const [imageAssets, setImageAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ContentStatus>(
    "all",
  );
  const [view, setView] = useState<"card" | "list">("card");
  const [openItemId, setOpenItemId] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [contentItems, assets] = await Promise.all([
          listContentItems(orgId, PRIMARY_BRAND_ID),
          listAssets(orgId, PRIMARY_BRAND_ID),
        ]);
        if (cancelled) return;
        setItems(contentItems);
        setImageAssets(assets.filter((a) => a.kind === "image"));
      } catch (err) {
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : "Failed to load content.",
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (!q) return true;
      return (
        item.topic.toLowerCase().includes(q) ||
        item.structuredPayload.hook.toLowerCase().includes(q) ||
        item.structuredPayload.caption.toLowerCase().includes(q)
      );
    });
  }, [items, query, statusFilter]);

  const openItem = items.find((i) => i.id === openItemId) ?? null;

  function handleChanged(updated: ContentItem) {
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
  }

  if (orgLoading || loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-9 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      dir={locale === "ar" ? "rtl" : "ltr"}
      className="flex flex-col gap-6 text-start"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text">
            {locale === "ar" ? "مكتبة المحتوى" : "Content Library"}
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            {locale === "ar" ? `${items.length} عنصر` : `${items.length} items`}
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/content/new">
            {locale === "ar" ? "إنشاء محتوى" : "Generate content"}
          </Link>
        </Button>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <SearchIcon
            size={16}
            className="absolute start-3 top-1/2 -translate-y-1/2 text-text-muted"
            aria-hidden="true"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={locale === "ar" ? "بحث" : "Search"}
            className="ps-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setStatusFilter(f)}
              className={`rounded-[var(--radius-full)] border px-3 py-1 text-sm transition-colors ${
                statusFilter === f
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-border text-text-muted hover:border-border-strong"
              }`}
              style={{ transitionDuration: "var(--duration-fast)" }}
            >
              {f === "all"
                ? locale === "ar"
                  ? "الكل"
                  : "All"
                : locale === "ar"
                  ? STATUS_LABEL_AR[f]
                  : STATUS_LABEL_EN[f]}
            </button>
          ))}
        </div>
        <div className="ms-auto flex items-center gap-1 rounded-[var(--radius-md)] border border-border p-0.5">
          <button
            type="button"
            aria-label={locale === "ar" ? "عرض البطاقات" : "Card view"}
            aria-pressed={view === "card"}
            onClick={() => setView("card")}
            className={`flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] ${view === "card" ? "bg-accent-soft text-accent" : "text-text-muted"}`}
          >
            <LayoutGrid size={16} />
          </button>
          <button
            type="button"
            aria-label={locale === "ar" ? "عرض القائمة" : "List view"}
            aria-pressed={view === "list"}
            onClick={() => setView("list")}
            className={`flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] ${view === "list" ? "bg-accent-soft text-accent" : "text-text-muted"}`}
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={<Sparkles size={20} />}
              title={
                items.length === 0
                  ? locale === "ar"
                    ? "لا يوجد محتوى بعد"
                    : "No content yet"
                  : locale === "ar"
                    ? "لا توجد نتائج"
                    : "No matches"
              }
              description={
                items.length === 0
                  ? locale === "ar"
                    ? "أنشئ أول محتوى لك ليظهر هنا."
                    : "Generate your first piece of content to see it here."
                  : locale === "ar"
                    ? "جرّب تغيير البحث أو الفلتر."
                    : "Try a different search or filter."
              }
              action={
                items.length === 0 ? (
                  <Button asChild size="sm">
                    <Link href="/content/new">
                      {locale === "ar" ? "إنشاء محتوى" : "Generate content"}
                    </Link>
                  </Button>
                ) : undefined
              }
            />
          </CardContent>
        </Card>
      ) : view === "card" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setOpenItemId(item.id)}
              className="text-start"
            >
              <Card
                className="h-full transition-shadow hover:shadow-[var(--shadow-md)]"
                style={{ transitionDuration: "var(--duration-base)" }}
              >
                {item.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element -- static export
                  <img
                    src={item.imageUrl}
                    alt=""
                    className="h-32 w-full rounded-t-[var(--radius-lg)] object-cover"
                  />
                )}
                <CardContent className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone={STATUS_TONE[item.status]}>
                      {locale === "ar"
                        ? STATUS_LABEL_AR[item.status]
                        : STATUS_LABEL_EN[item.status]}
                    </Badge>
                    <span className="text-xs text-text-muted">
                      {item.platformTargets.length}
                    </span>
                  </div>
                  <p className="line-clamp-2 font-medium text-text">
                    {item.structuredPayload.hook || item.topic}
                  </p>
                  <p className="line-clamp-2 text-sm text-text-muted">
                    {item.structuredPayload.caption}
                  </p>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      ) : (
        <Card>
          <ul className="divide-y divide-border">
            {filtered.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setOpenItemId(item.id)}
                  className="flex w-full items-center gap-3 px-5 py-3 text-start hover:bg-accent-soft/50"
                >
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- static export
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-[var(--radius-sm)] object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 shrink-0 rounded-[var(--radius-sm)] bg-accent-soft" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-text">
                      {item.structuredPayload.hook || item.topic}
                    </p>
                    <p className="truncate text-xs text-text-muted">
                      {item.topic}
                    </p>
                  </div>
                  <Badge tone={STATUS_TONE[item.status]} className="shrink-0">
                    {locale === "ar"
                      ? STATUS_LABEL_AR[item.status]
                      : STATUS_LABEL_EN[item.status]}
                  </Badge>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

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
    </div>
  );
}
