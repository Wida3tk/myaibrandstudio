"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth/auth-provider";
import { ensureOrgForUser } from "@/lib/org/bootstrap";
import { PRIMARY_BRAND_ID } from "@/lib/brand/schema";
import { getBrandProfile } from "@/lib/brand/data";
import { generateContent, type GenerateContentOutput } from "@/lib/ai/generate";
import type { ContentType, Language } from "@/lib/ai/types";
import { createDraftContentItem } from "@/lib/content/data";
import { PLATFORMS, type Platform } from "@/lib/content/schema";
import {
  PLATFORM_LABEL,
  PlatformPreview,
} from "@/components/platform-previews";

const CONTENT_TYPES: ContentType[] = [
  "post",
  "hook",
  "caption",
  "script",
  "calendar-note",
];

export default function NewContentPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [orgId, setOrgId] = useState<string | null>(null);
  const [brandName, setBrandName] = useState("Your Brand");
  const [contentType, setContentType] = useState<ContentType>("post");
  const [language, setLanguage] = useState<Language>("en");
  const [topic, setTopic] = useState("");
  const [platforms, setPlatforms] = useState<Platform[]>(["instagram"]);
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateContentOutput | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const resolvedOrgId = await ensureOrgForUser(user);
      setOrgId(resolvedOrgId);
      const brand = await getBrandProfile(resolvedOrgId);
      if (brand?.name) setBrandName(brand.name);
    })();
  }, [user]);

  function togglePlatform(platform: Platform) {
    setPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform],
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!orgId) return;
    setError(null);
    setResult(null);
    setSaved(false);
    setSubmitting(true);
    try {
      const output = await generateContent({
        orgId,
        brandId: PRIMARY_BRAND_ID,
        contentType,
        language,
        topic,
      });
      setResult(output);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveDraft() {
    if (!orgId || !user || !result) return;
    setError(null);
    setSaving(true);
    try {
      await createDraftContentItem(orgId, PRIMARY_BRAND_ID, user.uid, {
        type: contentType,
        language,
        topic,
        structuredPayload: result.structured,
        platformTargets: platforms,
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save draft.");
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || !orgId) {
    return <p className="text-text-muted">Loading…</p>;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-xl font-semibold text-text">Generate content</h1>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm text-text-muted">
          Content type
          <select
            value={contentType}
            onChange={(e) => setContentType(e.target.value as ContentType)}
            className="rounded-md border border-border bg-bg px-3 py-2 text-text"
          >
            {CONTENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-text-muted">
          Language
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            className="rounded-md border border-border bg-bg px-3 py-2 text-text"
          >
            <option value="en">English</option>
            <option value="ar">العربية</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-text-muted">
          Topic
          <input
            required
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="rounded-md border border-border bg-bg px-3 py-2 text-text"
          />
        </label>

        <fieldset className="flex flex-col gap-1 text-sm text-text-muted">
          <legend className="mb-1">Preview for</legend>
          <div className="flex flex-wrap gap-3">
            {PLATFORMS.map((platform) => (
              <label key={platform} className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={platforms.includes(platform)}
                  onChange={() => togglePlatform(platform)}
                />
                {PLATFORM_LABEL[platform]}
              </label>
            ))}
          </div>
        </fieldset>

        {error && <p className="text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="self-start rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-contrast disabled:opacity-60"
        >
          {submitting ? "Generating…" : "Generate"}
        </button>
      </form>

      {result && (
        <>
          <div className="mt-6 flex flex-wrap gap-6">
            {(platforms.length > 0
              ? platforms
              : (["instagram"] as Platform[])
            ).map((platform) => (
              <PlatformPreview
                key={platform}
                platform={platform}
                brandName={brandName}
                content={result.structured}
                language={language}
              />
            ))}
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={saving || saved}
              className="rounded-md border border-border px-4 py-2 text-sm text-text hover:bg-surface disabled:opacity-60"
            >
              {saved ? "Saved" : saving ? "Saving…" : "Save as draft"}
            </button>
            {saved && (
              <a href="/content" className="text-sm text-accent underline">
                View in Content
              </a>
            )}
          </div>
        </>
      )}
    </div>
  );
}
