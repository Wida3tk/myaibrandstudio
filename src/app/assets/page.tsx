"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/auth-provider";
import { ensureOrgForUser } from "@/lib/org/bootstrap";
import { PRIMARY_BRAND_ID } from "@/lib/brand/schema";
import { createAsset, listAssets } from "@/lib/assets/data";
import { uploadToCloudinary } from "@/lib/assets/cloudinary";
import {
  assetKindFromMimeType,
  validateAssetFile,
} from "@/lib/assets/validate";
import type { Asset } from "@/lib/assets/schema";

export default function AssetsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [orgId, setOrgId] = useState<string | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  async function refresh(resolvedOrgId: string) {
    setAssets(await listAssets(resolvedOrgId, PRIMARY_BRAND_ID));
  }

  useEffect(() => {
    if (!user) return;
    (async () => {
      const resolvedOrgId = await ensureOrgForUser(user);
      setOrgId(resolvedOrgId);
      await refresh(resolvedOrgId);
      setLoading(false);
    })();
  }, [user]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
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
      await refresh(orgId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  if (authLoading || loading) {
    return <p className="text-text-muted">Loading…</p>;
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text">Assets</h1>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-contrast disabled:opacity-60"
        >
          {uploading ? "Uploading…" : "Upload"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      {assets.length === 0 ? (
        <p className="mt-6 text-sm text-text-muted">
          No assets yet — upload an image or video to start the library.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className="overflow-hidden rounded-md border border-border bg-surface"
            >
              {asset.kind === "video" ? (
                <video
                  src={asset.url}
                  controls
                  className="h-32 w-full object-cover"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- static export, no Image Optimization API available
                <img
                  src={asset.url}
                  alt=""
                  className="h-32 w-full object-cover"
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
