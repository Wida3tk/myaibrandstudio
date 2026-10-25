"use client";

import { useEffect, useRef, useState } from "react";
import { Upload, ImageIcon, Video, Search as SearchIcon } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-provider";
import { useOrg } from "@/lib/org/use-org";
import { useLocale } from "@/components/locale-provider";
import { PRIMARY_BRAND_ID } from "@/lib/brand/schema";
import { createAsset, listAssets } from "@/lib/assets/data";
import { uploadToCloudinary } from "@/lib/assets/cloudinary";
import { assetKindFromMimeType, validateAssetFile } from "@/lib/assets/validate";
import type { Asset } from "@/lib/assets/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

const FILTERS = ["all", "image", "video"] as const;

export default function AssetsPage() {
  const { user } = useAuth();
  const { orgId, loading: orgLoading } = useOrg();
  const { locale } = useLocale();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<(typeof FILTERS)[number]>("all");

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    listAssets(orgId, PRIMARY_BRAND_ID)
      .then((list) => {
        if (!cancelled) setAssets(list);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load assets.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
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
        kind: assetKindFromMimeType(file.type),
      });
      setAssets(await listAssets(orgId, PRIMARY_BRAND_ID));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  const filtered = assets.filter((a) => {
    if (kindFilter !== "all" && a.kind !== kindFilter) return false;
    if (query && !a.tags.some((t) => t.toLowerCase().includes(query.toLowerCase())) && !a.publicId.toLowerCase().includes(query.toLowerCase())) {
      return false;
    }
    return true;
  });

  if (orgLoading || loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-9 w-48" />
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div dir={locale === "ar" ? "rtl" : "ltr"} className="flex flex-col gap-6 text-start">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text">
            {locale === "ar" ? "مكتبة الأصول" : "Asset Library"}
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            {locale === "ar"
              ? `${assets.length} أصل`
              : `${assets.length} asset${assets.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <Button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          <Upload size={16} aria-hidden="true" />
          {uploading
            ? locale === "ar" ? "جارٍ الرفع..." : "Uploading..."
            : locale === "ar" ? "رفع" : "Upload"}
        </Button>
        <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={handleFileChange} className="hidden" />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {assets.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative max-w-xs flex-1">
            <SearchIcon size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-text-muted" aria-hidden="true" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={locale === "ar" ? "بحث بالوسوم" : "Search by tag"}
              className="ps-9"
            />
          </div>
          <div className="flex gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setKindFilter(f)}
                className={`rounded-[var(--radius-full)] border px-3 py-1 text-sm transition-colors ${
                  kindFilter === f
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-border text-text-muted hover:border-border-strong"
                }`}
                style={{ transitionDuration: "var(--duration-fast)" }}
              >
                {f === "all"
                  ? locale === "ar" ? "الكل" : "All"
                  : f === "image"
                    ? locale === "ar" ? "صور" : "Images"
                    : locale === "ar" ? "فيديو" : "Videos"}
              </button>
            ))}
          </div>
        </div>
      )}

      {assets.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={<ImageIcon size={20} />}
              title={locale === "ar" ? "لا توجد أصول بعد" : "No assets yet"}
              description={
                locale === "ar"
                  ? "ارفع صورة أو فيديو لبدء المكتبة."
                  : "Upload an image or video to start the library."
              }
              action={
                <Button type="button" size="sm" onClick={() => fileInputRef.current?.click()}>
                  {locale === "ar" ? "رفع" : "Upload"}
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState title={locale === "ar" ? "لا توجد نتائج" : "No matches"} />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((asset) => (
            <Card key={asset.id} className="overflow-hidden">
              {asset.kind === "video" ? (
                <video src={asset.url} controls className="h-32 w-full object-cover" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- static export, no Image Optimization API available
                <img src={asset.url} alt="" className="h-32 w-full object-cover" />
              )}
              <div className="flex items-center gap-1.5 p-2 text-xs text-text-muted">
                {asset.kind === "video" ? <Video size={12} /> : <ImageIcon size={12} />}
                {asset.kind === "video"
                  ? locale === "ar" ? "فيديو" : "Video"
                  : locale === "ar" ? "صورة" : "Image"}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
