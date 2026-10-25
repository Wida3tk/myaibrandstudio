"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/auth-provider";
import { ensureOrgForUser } from "@/lib/org/bootstrap";
import { PRIMARY_BRAND_ID } from "@/lib/brand/schema";
import { getBrandProfile } from "@/lib/brand/data";
import {
  attachImageToContentItem,
  listContentItems,
  nextStatus,
  transitionContentItem,
} from "@/lib/content/data";
import type { ContentItem, ContentStatus } from "@/lib/content/schema";
import { PlatformPreview } from "@/components/platform-previews";
import { listAssets } from "@/lib/assets/data";
import type { Asset } from "@/lib/assets/schema";
import { publishToInstagram } from "@/lib/publish/instagram";

const STATUS_LABEL: Record<ContentStatus, string> = {
  draft: "Draft",
  in_review: "In review",
  approved: "Approved",
  published: "Published",
};

const STATUS_COLOR: Record<ContentStatus, string> = {
  draft: "text-text-muted",
  in_review: "text-warning",
  approved: "text-success",
  published: "text-accent",
};

export default function ContentListPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [orgId, setOrgId] = useState<string | null>(null);
  const [brandName, setBrandName] = useState("Your Brand");
  const [items, setItems] = useState<ContentItem[]>([]);
  const [imageAssets, setImageAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [pickingImageFor, setPickingImageFor] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  async function refresh(resolvedOrgId: string) {
    const list = await listContentItems(resolvedOrgId, PRIMARY_BRAND_ID);
    setItems(list);
  }

  useEffect(() => {
    if (!user) return;
    (async () => {
      const resolvedOrgId = await ensureOrgForUser(user);
      setOrgId(resolvedOrgId);
      const brand = await getBrandProfile(resolvedOrgId);
      if (brand?.name) setBrandName(brand.name);
      const assets = await listAssets(resolvedOrgId, PRIMARY_BRAND_ID);
      setImageAssets(assets.filter((a) => a.kind === "image"));
      await refresh(resolvedOrgId);
      setLoading(false);
    })();
  }, [user]);

  async function handleTransition(
    item: ContentItem,
    toStatus: ContentStatus,
    action: string,
  ) {
    if (!orgId || !user) return;
    setError(null);
    setBusyId(item.id);
    try {
      await transitionContentItem(
        orgId,
        PRIMARY_BRAND_ID,
        item,
        toStatus,
        user.uid,
        action,
      );
      await refresh(orgId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleAttachImage(item: ContentItem, imageUrl: string) {
    if (!orgId) return;
    setError(null);
    setBusyId(item.id);
    try {
      await attachImageToContentItem(
        orgId,
        PRIMARY_BRAND_ID,
        item.id,
        imageUrl,
      );
      setPickingImageFor(null);
      await refresh(orgId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to attach image.");
    } finally {
      setBusyId(null);
    }
  }

  async function handlePublishInstagram(item: ContentItem) {
    if (!orgId || !item.imageUrl) return;
    setError(null);
    setBusyId(item.id);
    try {
      await publishToInstagram({
        orgId,
        brandId: PRIMARY_BRAND_ID,
        contentItemId: item.id,
        imageUrl: item.imageUrl,
        caption: item.structuredPayload.caption,
      });
      await refresh(orgId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to publish.");
    } finally {
      setBusyId(null);
    }
  }

  if (authLoading || loading) {
    return <p className="text-text-muted">Loading…</p>;
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-xl font-semibold text-text">Content</h1>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      {items.length === 0 ? (
        <p className="mt-6 text-sm text-text-muted">
          Nothing here yet — generate something on the Generate content page and
          save it as a draft.
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {items.map((item) => {
            const forward = nextStatus(item.status);
            const isExpanded = expanded === item.id;
            const instagramPublish = item.publishes.instagram;
            const canPublishInstagram =
              item.status === "approved" &&
              item.platformTargets.includes("instagram") &&
              item.imageUrl &&
              !instagramPublish;

            return (
              <li
                key={item.id}
                className="rounded-md border border-border bg-surface p-4"
              >
                <button
                  type="button"
                  onClick={() => setExpanded(isExpanded ? null : item.id)}
                  className="flex w-full items-center justify-between text-start"
                >
                  <span className="font-medium text-text">
                    {item.structuredPayload.hook || item.topic}
                  </span>
                  <span
                    className={`text-sm font-medium ${STATUS_COLOR[item.status]}`}
                  >
                    {STATUS_LABEL[item.status]}
                  </span>
                </button>

                {isExpanded && (
                  <div className="mt-3 border-t border-border pt-3">
                    {item.platformTargets.length > 0 ? (
                      <div className="flex flex-wrap gap-6">
                        {item.platformTargets.map((platform) => (
                          <PlatformPreview
                            key={platform}
                            platform={platform}
                            brandName={brandName}
                            content={item.structuredPayload}
                            language={item.language}
                          />
                        ))}
                      </div>
                    ) : (
                      <div
                        dir={item.language === "ar" ? "rtl" : "ltr"}
                        lang={item.language}
                        className="text-start"
                      >
                        <p className="text-text">
                          {item.structuredPayload.caption}
                        </p>
                      </div>
                    )}

                    <div className="mt-4">
                      <p className="text-sm text-text-muted">Image</p>
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- static export, no Image Optimization API
                        <img
                          src={item.imageUrl}
                          alt=""
                          className="mt-2 h-24 w-24 rounded-md border border-border object-cover"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            setPickingImageFor(
                              pickingImageFor === item.id ? null : item.id,
                            )
                          }
                          className="mt-2 rounded-md border border-border px-3 py-1.5 text-sm text-text hover:bg-bg"
                        >
                          Attach image
                        </button>
                      )}
                      {pickingImageFor === item.id && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {imageAssets.length === 0 ? (
                            <p className="text-sm text-text-muted">
                              No images in your Asset Library yet.
                            </p>
                          ) : (
                            imageAssets.map((asset) => (
                              <button
                                key={asset.id}
                                type="button"
                                onClick={() =>
                                  handleAttachImage(item, asset.url)
                                }
                                disabled={busyId === item.id}
                                className="h-16 w-16 overflow-hidden rounded-md border border-border"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element -- static export, no Image Optimization API */}
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

                    <div className="mt-4 flex flex-wrap gap-2">
                      {forward && (
                        <button
                          type="button"
                          disabled={busyId === item.id}
                          onClick={() =>
                            handleTransition(
                              item,
                              forward,
                              forward === "approved" ? "approved" : "submitted",
                            )
                          }
                          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-contrast disabled:opacity-60"
                        >
                          {forward === "in_review"
                            ? "Submit for review"
                            : "Approve"}
                        </button>
                      )}
                      {item.status === "in_review" && (
                        <button
                          type="button"
                          disabled={busyId === item.id}
                          onClick={() =>
                            handleTransition(item, "draft", "changes_requested")
                          }
                          className="rounded-md border border-border px-3 py-1.5 text-sm text-text hover:bg-bg disabled:opacity-60"
                        >
                          Request changes
                        </button>
                      )}
                      {canPublishInstagram && (
                        <button
                          type="button"
                          disabled={busyId === item.id}
                          onClick={() => handlePublishInstagram(item)}
                          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-contrast disabled:opacity-60"
                        >
                          {busyId === item.id
                            ? "Publishing…"
                            : "Publish to Instagram"}
                        </button>
                      )}
                      {instagramPublish?.permalink && (
                        <a
                          href={instagramPublish.permalink}
                          target="_blank"
                          rel="noreferrer"
                          className="self-center text-sm text-accent underline"
                        >
                          View on Instagram
                        </a>
                      )}
                    </div>

                    <ol className="mt-4 flex flex-col gap-1 text-xs text-text-muted">
                      {item.history.map((h, i) => (
                        <li key={i}>
                          {new Date(h.at).toLocaleString()} — {h.action}
                          {h.fromStatus
                            ? ` (${h.fromStatus} → ${h.toStatus})`
                            : ""}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
