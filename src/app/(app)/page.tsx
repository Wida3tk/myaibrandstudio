"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  FileText,
  ImageIcon,
  PenSquare,
  Sparkles,
  Building2,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/lib/auth/auth-provider";
import { useOrg } from "@/lib/org/use-org";
import { useLocale } from "@/components/locale-provider";
import { PRIMARY_BRAND_ID } from "@/lib/brand/schema";
import { listContentItems } from "@/lib/content/data";
import { listAssets } from "@/lib/assets/data";
import type { ContentItem, ContentStatus } from "@/lib/content/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

const STATUS_TONE: Record<
  ContentStatus,
  "neutral" | "warning" | "success" | "accent"
> = {
  draft: "neutral",
  in_review: "warning",
  approved: "success",
  published: "accent",
};

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

const COPY = {
  en: {
    greeting: (name: string) => `Welcome back${name ? `, ${name}` : ""}`,
    subtitle: "Here's what's happening across your brand's content.",
    onboardingTitle: "Set up your brand profile",
    onboardingBody:
      "Tell the AI gateway about your voice, audience and objectives so every generated draft sounds like you.",
    onboardingCta: "Set up brand",
    emptyTitle: "No content yet",
    emptyBody: "Generate your first post, hook or caption to see it here.",
    emptyCta: "Generate content",
    recent: "Recent content",
    viewAll: "View all",
    quickActions: "Quick actions",
    newContent: "Generate content",
    newDesign: "Open design studio",
    uploadAsset: "Upload an asset",
    editBrand: "Edit brand profile",
    assetsLabel: "Assets in library",
  },
  ar: {
    greeting: (name: string) => `مرحبًا بعودتك${name ? `، ${name}` : ""}`,
    subtitle: "هذا ما يحدث في محتوى علامتك التجارية.",
    onboardingTitle: "أنشئ ملف العلامة التجارية",
    onboardingBody:
      "أخبر بوابة الذكاء الاصطناعي بصوتك وجمهورك وأهدافك ليبدو كل محتوى مُولّد كأنك أنت.",
    onboardingCta: "إنشاء الملف",
    emptyTitle: "لا يوجد محتوى بعد",
    emptyBody: "أنشئ أول منشور أو خطّاف أو تعليق لتراه هنا.",
    emptyCta: "إنشاء محتوى",
    recent: "المحتوى الأخير",
    viewAll: "عرض الكل",
    quickActions: "إجراءات سريعة",
    newContent: "إنشاء محتوى",
    newDesign: "فتح استوديو التصميم",
    uploadAsset: "رفع أصل",
    editBrand: "تعديل ملف العلامة",
    assetsLabel: "الأصول في المكتبة",
  },
};

const STATUS_ORDER: ContentStatus[] = [
  "draft",
  "in_review",
  "approved",
  "published",
];

export default function DashboardPage() {
  const { user } = useAuth();
  const { orgId, brand, loading: orgLoading } = useOrg();
  const { locale } = useLocale();
  const copy = COPY[locale];

  const [items, setItems] = useState<ContentItem[]>([]);
  const [assetCount, setAssetCount] = useState(0);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    (async () => {
      setLoadingData(true);
      try {
        const [contentItems, assets] = await Promise.all([
          listContentItems(orgId, PRIMARY_BRAND_ID),
          listAssets(orgId, PRIMARY_BRAND_ID),
        ]);
        if (cancelled) return;
        setItems(contentItems);
        setAssetCount(assets.length);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load dashboard.",
          );
        }
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  if (orgLoading || loadingData) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-9 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-danger">{error}</p>;
  }

  const counts = STATUS_ORDER.map((status) => ({
    status,
    count: items.filter((i) => i.status === status).length,
  }));
  const recent = items.slice(0, 5);
  const needsOnboarding = !brand;

  return (
    <div className="flex flex-col gap-8">
      <div dir={locale === "ar" ? "rtl" : "ltr"} className="text-start">
        <h1 className="text-2xl font-semibold tracking-tight text-text">
          {copy.greeting(brand?.name ?? user?.displayName ?? "")}
        </h1>
        <p className="mt-1 text-sm text-text-muted">{copy.subtitle}</p>
      </div>

      {needsOnboarding && (
        <Card className="border-accent/40 bg-accent-soft">
          <CardContent className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-contrast">
                <Building2 size={18} />
              </span>
              <div>
                <p className="font-medium text-text">{copy.onboardingTitle}</p>
                <p className="text-sm text-text-muted">{copy.onboardingBody}</p>
              </div>
            </div>
            <Button asChild size="sm" className="shrink-0">
              <Link href="/brand" className="flex items-center gap-1.5">
                {copy.onboardingCta}
                <ArrowRight
                  size={14}
                  className="rtl:rotate-180"
                  aria-hidden="true"
                />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {counts.map(({ status, count }) => (
          <Card key={status}>
            <CardContent className="flex flex-col gap-1">
              <Badge tone={STATUS_TONE[status]} className="self-start">
                {locale === "ar"
                  ? STATUS_LABEL_AR[status]
                  : STATUS_LABEL_EN[status]}
              </Badge>
              <span className="text-3xl font-semibold text-text">{count}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <div className="flex items-center justify-between p-5 pb-0">
            <h2 className="text-base font-semibold text-text">{copy.recent}</h2>
            {items.length > 0 && (
              <Link
                href="/content"
                className="text-sm font-medium text-accent hover:underline"
              >
                {copy.viewAll}
              </Link>
            )}
          </div>
          <CardContent>
            {recent.length === 0 ? (
              <EmptyState
                icon={<Sparkles size={20} />}
                title={copy.emptyTitle}
                description={copy.emptyBody}
                action={
                  <Button size="sm" asChild>
                    <Link href="/content/new">{copy.emptyCta}</Link>
                  </Button>
                }
              />
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {recent.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0">
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
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <div className="p-5 pb-0">
            <h2 className="text-base font-semibold text-text">
              {copy.quickActions}
            </h2>
          </div>
          <CardContent className="flex flex-col gap-2">
            <QuickActionLink
              href="/content/new"
              icon={PenSquare}
              label={copy.newContent}
            />
            <QuickActionLink
              href="/design"
              icon={Sparkles}
              label={copy.newDesign}
            />
            <QuickActionLink
              href="/assets"
              icon={ImageIcon}
              label={copy.uploadAsset}
              hint={`${assetCount}`}
            />
            <QuickActionLink
              href="/brand"
              icon={FileText}
              label={copy.editBrand}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function QuickActionLink({
  href,
  icon: Icon,
  label,
  hint,
}: {
  href: string;
  icon: typeof PenSquare;
  label: string;
  hint?: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-[var(--radius-md)] border border-border px-3 py-2.5 text-sm font-medium text-text transition-colors hover:border-accent hover:bg-accent-soft"
      style={{ transitionDuration: "var(--duration-fast)" }}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-accent-soft text-accent">
        <Icon size={16} />
      </span>
      <span className="flex-1">{label}</span>
      {hint && <span className="text-xs text-text-muted">{hint}</span>}
    </Link>
  );
}
