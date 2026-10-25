"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Circle, HelpCircle } from "lucide-react";
import { useOrg } from "@/lib/org/use-org";
import { useLocale } from "@/components/locale-provider";
import { PRIMARY_BRAND_ID } from "@/lib/brand/schema";
import { listContentItems } from "@/lib/content/data";
import { listAssets } from "@/lib/assets/data";
import { listUsageForMonth } from "@/lib/usage/data";
import { yyyymm } from "@/lib/usage/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type Status = "connected" | "configured" | "not-configured" | "unverifiable";

const STATUS_META: Record<Status, { tone: "success" | "accent" | "neutral" | "warning"; labelEn: string; labelAr: string; icon: typeof CheckCircle2 }> = {
  connected: { tone: "success", labelEn: "Connected", labelAr: "متصل", icon: CheckCircle2 },
  configured: { tone: "accent", labelEn: "Configured, not used yet", labelAr: "مُهيأ، لم يُستخدم بعد", icon: Circle },
  "not-configured": { tone: "neutral", labelEn: "Not configured", labelAr: "غير مُهيأ", icon: Circle },
  unverifiable: { tone: "warning", labelEn: "Configured server-side (unverifiable from the browser)", labelAr: "مُهيأ من جهة الخادم (لا يمكن التحقق من المتصفح)", icon: HelpCircle },
};

function StatusBadge({ status }: { status: Status }) {
  const { locale } = useLocale();
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <Badge tone={meta.tone}>
      <Icon size={12} aria-hidden="true" />
      {locale === "ar" ? meta.labelAr : meta.labelEn}
    </Badge>
  );
}

export default function IntegrationsPage() {
  const { orgId, loading: orgLoading } = useOrg();
  const { locale } = useLocale();

  const [loading, setLoading] = useState(true);
  const [assetCount, setAssetCount] = useState(0);
  const [usageCount, setUsageCount] = useState(0);
  const [instagramPublishCount, setInstagramPublishCount] = useState(0);

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [assets, usage, items] = await Promise.all([
        listAssets(orgId, PRIMARY_BRAND_ID),
        listUsageForMonth(orgId, yyyymm(new Date())),
        listContentItems(orgId, PRIMARY_BRAND_ID),
      ]);
      if (cancelled) return;
      setAssetCount(assets.length);
      setUsageCount(usage.length);
      setInstagramPublishCount(items.filter((i) => i.publishes.instagram).length);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  const hasAiGatewayUrl = Boolean(process.env.NEXT_PUBLIC_AI_GATEWAY_URL);
  const hasCloudinaryConfig = Boolean(
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME && process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
  );

  const aiStatus: Status = !hasAiGatewayUrl ? "not-configured" : usageCount > 0 ? "connected" : "configured";
  const cloudinaryStatus: Status = !hasCloudinaryConfig ? "not-configured" : assetCount > 0 ? "connected" : "configured";
  const instagramStatus: Status = instagramPublishCount > 0 ? "connected" : "unverifiable";

  const integrations = [
    {
      id: "firebase",
      nameEn: "Firebase Auth & Firestore",
      nameAr: "Firebase للمصادقة وقاعدة البيانات",
      descEn: "Sign-in and all app data. You're signed in, so this is live.",
      descAr: "تسجيل الدخول وجميع بيانات التطبيق. أنت مسجّل الدخول، لذا فهو يعمل.",
      status: "connected" as Status,
      evidenceEn: null,
      evidenceAr: null,
    },
    {
      id: "ai-gateway",
      nameEn: "AI Gateway (Cloudflare Worker)",
      nameAr: "بوابة الذكاء الاصطناعي (Cloudflare Worker)",
      descEn: "Groq → Mistral → OpenRouter fallback for content generation.",
      descAr: "التبديل التلقائي بين Groq و Mistral و OpenRouter لإنشاء المحتوى.",
      status: aiStatus,
      evidenceEn: usageCount > 0 ? `${usageCount} generation${usageCount === 1 ? "" : "s"} this month` : null,
      evidenceAr: usageCount > 0 ? `${usageCount} عملية إنشاء هذا الشهر` : null,
    },
    {
      id: "cloudinary",
      nameEn: "Cloudinary",
      nameAr: "Cloudinary",
      descEn: "Unsigned uploads for the asset library and Design Studio exports.",
      descAr: "رفع غير موقّع لمكتبة الأصول وتصديرات استوديو التصميم.",
      status: cloudinaryStatus,
      evidenceEn: assetCount > 0 ? `${assetCount} asset${assetCount === 1 ? "" : "s"} stored` : null,
      evidenceAr: assetCount > 0 ? `${assetCount} أصل مخزّن` : null,
    },
    {
      id: "instagram",
      nameEn: "Instagram publishing",
      nameAr: "النشر على إنستغرام",
      descEn: "Two-step container → publish flow via the Worker. Credentials live server-side only.",
      descAr: "تدفق نشر على خطوتين عبر الـ Worker. بيانات الاعتماد على الخادم فقط.",
      status: instagramStatus,
      evidenceEn: instagramPublishCount > 0 ? `${instagramPublishCount} successful publish${instagramPublishCount === 1 ? "" : "es"}` : null,
      evidenceAr: instagramPublishCount > 0 ? `${instagramPublishCount} عملية نشر ناجحة` : null,
    },
  ];

  if (orgLoading || loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-9 w-48" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  return (
    <div dir={locale === "ar" ? "rtl" : "ltr"} className="flex flex-col gap-6 text-start">
      <div>
        <h1 className="text-2xl font-semibold text-text">
          {locale === "ar" ? "التكاملات" : "Integrations"}
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          {locale === "ar"
            ? "الحالة الحقيقية لكل تكامل — لا ادعاءات."
            : "What's actually configured, based on real evidence — nothing assumed."}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {integrations.map((integration) => (
          <Card key={integration.id}>
            <CardContent className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-text">
                  {locale === "ar" ? integration.nameAr : integration.nameEn}
                </p>
                <p className="mt-1 text-sm text-text-muted">
                  {locale === "ar" ? integration.descAr : integration.descEn}
                </p>
                {(locale === "ar" ? integration.evidenceAr : integration.evidenceEn) && (
                  <p className="mt-1 text-xs text-accent">
                    {locale === "ar" ? integration.evidenceAr : integration.evidenceEn}
                  </p>
                )}
              </div>
              <StatusBadge status={integration.status} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
