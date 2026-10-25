"use client";

import { useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { useOrg } from "@/lib/org/use-org";
import { useLocale } from "@/components/locale-provider";
import { PRIMARY_BRAND_ID } from "@/lib/brand/schema";
import { listContentItems } from "@/lib/content/data";
import type { ContentItem, ContentStatus } from "@/lib/content/schema";
import { listUsageForMonth } from "@/lib/usage/data";
import { yyyymm, type UsageEntry } from "@/lib/usage/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

// Mirrors worker/src/index.ts's DAILY_TOKEN_LIMIT — the Worker has no "get config" endpoint, so
// this is a display-only copy of the real configured limit, not an independent value.
const DAILY_TOKEN_LIMIT = 50_000;

const STATUS_ORDER: ContentStatus[] = ["draft", "in_review", "approved", "published"];
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

export default function AnalyticsPage() {
  const { orgId, loading: orgLoading } = useOrg();
  const { locale } = useLocale();

  const [usage, setUsage] = useState<UsageEntry[]>([]);
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [usageEntries, contentItems] = await Promise.all([
          listUsageForMonth(orgId, yyyymm(new Date())),
          listContentItems(orgId, PRIMARY_BRAND_ID),
        ]);
        if (cancelled) return;
        setUsage(usageEntries);
        setItems(contentItems);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load analytics.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  const todayIso = new Date().toISOString().slice(0, 10);
  const todayTokens = useMemo(
    () =>
      usage
        .filter((u) => u.date === todayIso)
        .reduce((sum, u) => sum + u.tokensIn + u.tokensOut, 0),
    [usage, todayIso],
  );
  const monthTokens = useMemo(
    () => usage.reduce((sum, u) => sum + u.tokensIn + u.tokensOut, 0),
    [usage],
  );
  const byProvider = useMemo(() => {
    const map = new Map<string, number>();
    for (const u of usage) {
      map.set(u.provider, (map.get(u.provider) ?? 0) + u.tokensIn + u.tokensOut);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [usage]);
  const maxProviderTokens = Math.max(1, ...byProvider.map(([, t]) => t));

  if (orgLoading || loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div dir={locale === "ar" ? "rtl" : "ltr"} className="flex flex-col gap-6 text-start">
      <div>
        <h1 className="text-2xl font-semibold text-text">
          {locale === "ar" ? "التحليلات" : "Analytics"}
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          {locale === "ar"
            ? "مقاييس حقيقية فقط — لا بيانات وهمية."
            : "Only real, connected metrics — nothing fabricated."}
        </p>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <Card>
        <CardContent className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-text-muted">
              {locale === "ar" ? "استخدام اليوم من الذكاء الاصطناعي" : "Today's AI usage"}
            </span>
            <span className="text-sm text-text-muted">
              {todayTokens.toLocaleString()} / {DAILY_TOKEN_LIMIT.toLocaleString()}{" "}
              {locale === "ar" ? "رمز" : "tokens"}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-[var(--radius-full)] bg-accent-soft">
            <div
              className="h-full rounded-[var(--radius-full)] bg-accent"
              style={{ width: `${Math.min(100, (todayTokens / DAILY_TOKEN_LIMIT) * 100)}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent>
            <h2 className="text-base font-semibold text-text">
              {locale === "ar" ? "استخدام الذكاء الاصطناعي هذا الشهر" : "AI usage this month"}
            </h2>
            {usage.length === 0 ? (
              <EmptyState
                className="mt-4"
                icon={<Sparkles size={20} />}
                title={locale === "ar" ? "لا يوجد استخدام هذا الشهر بعد" : "No usage yet this month"}
                description={
                  locale === "ar"
                    ? "ستظهر الإحصاءات هنا بعد أول عملية إنشاء محتوى."
                    : "Stats appear here after your first content generation."
                }
              />
            ) : (
              <>
                <p className="mt-2 text-3xl font-semibold text-text">
                  {monthTokens.toLocaleString()}{" "}
                  <span className="text-sm font-normal text-text-muted">
                    {locale === "ar" ? "رمز عبر" : "tokens across"} {usage.length}{" "}
                    {locale === "ar" ? "عملية إنشاء" : "generations"}
                  </span>
                </p>
                <div className="mt-4 flex flex-col gap-2">
                  {byProvider.map(([provider, tokens]) => (
                    <div key={provider} className="flex items-center gap-2">
                      <span className="w-20 shrink-0 text-sm capitalize text-text">{provider}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-[var(--radius-full)] bg-accent-soft">
                        <div
                          className="h-full rounded-[var(--radius-full)] bg-accent"
                          style={{ width: `${(tokens / maxProviderTokens) * 100}%` }}
                        />
                      </div>
                      <span className="w-16 shrink-0 text-end text-xs text-text-muted">
                        {tokens.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h2 className="text-base font-semibold text-text">
              {locale === "ar" ? "حالة المحتوى" : "Content status"}
            </h2>
            {items.length === 0 ? (
              <EmptyState
                className="mt-4"
                title={locale === "ar" ? "لا يوجد محتوى بعد" : "No content yet"}
              />
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-3">
                {STATUS_ORDER.map((status) => (
                  <div key={status} className="flex flex-col gap-1">
                    <Badge tone="neutral" className="self-start">
                      {locale === "ar" ? STATUS_LABEL_AR[status] : STATUS_LABEL_EN[status]}
                    </Badge>
                    <span className="text-2xl font-semibold text-text">
                      {items.filter((i) => i.status === status).length}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
