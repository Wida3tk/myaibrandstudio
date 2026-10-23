"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth/auth-provider";
import { ensureOrgForUser } from "@/lib/org/bootstrap";
import { PRIMARY_BRAND_ID } from "@/lib/brand/schema";
import {
  generateContent,
  type GeneratedContent,
  type GenerateContentOutput,
} from "@/lib/ai/generate";
import type { ContentType, Language } from "@/lib/ai/types";

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
  const [contentType, setContentType] = useState<ContentType>("post");
  const [language, setLanguage] = useState<Language>("en");
  const [topic, setTopic] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateContentOutput | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    ensureOrgForUser(user).then(setOrgId);
  }, [user]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!orgId) return;
    setError(null);
    setResult(null);
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
        <GeneratedContentPreview
          content={result.structured}
          language={language}
        />
      )}
    </div>
  );
}

function GeneratedContentPreview({
  content,
  language,
}: {
  content: GeneratedContent;
  language: Language;
}) {
  return (
    <section
      dir={language === "ar" ? "rtl" : "ltr"}
      lang={language}
      className="mt-6 rounded-md border border-border bg-surface p-4 text-start"
    >
      <h2 className="font-semibold text-text">{content.hook}</h2>
      <p className="mt-2 text-text">{content.caption}</p>
      {content.hashtags.length > 0 && (
        <p className="mt-2 text-sm text-text-muted">
          {content.hashtags.map((tag) => `#${tag}`).join(" ")}
        </p>
      )}
      {content.callToAction && (
        <p className="mt-2 text-sm font-medium text-accent">
          {content.callToAction}
        </p>
      )}
    </section>
  );
}
