"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/auth-provider";
import { ensureOrgForUser } from "@/lib/org/bootstrap";
import { PRIMARY_BRAND_ID } from "@/lib/brand/schema";
import { getBrandProfile } from "@/lib/brand/data";
import {
  listContentItems,
  nextStatus,
  transitionContentItem,
} from "@/lib/content/data";
import type { ContentItem, ContentStatus } from "@/lib/content/schema";
import { PlatformPreview } from "@/components/platform-previews";

const STATUS_LABEL: Record<ContentStatus, string> = {
  draft: "Draft",
  in_review: "In review",
  approved: "Approved",
};

const STATUS_COLOR: Record<ContentStatus, string> = {
  draft: "text-text-muted",
  in_review: "text-warning",
  approved: "text-success",
};

export default function ContentListPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [orgId, setOrgId] = useState<string | null>(null);
  const [brandName, setBrandName] = useState("Your Brand");
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
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

                    <div className="mt-4 flex gap-2">
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
