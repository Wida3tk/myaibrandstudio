"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth/auth-provider";
import { ensureOrgForUser } from "@/lib/org/bootstrap";
import { getBrandProfile, saveBrandProfile } from "@/lib/brand/data";
import { brandProfileSchema, type BrandProfileInput } from "@/lib/brand/schema";

const EMPTY: BrandProfileInput = {
  name: "",
  voiceTone: "",
  audienceDescription: "",
  objectives: [],
  memoryFacts: [],
};

export default function BrandPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();

  const [orgId, setOrgId] = useState<string | null>(null);
  const [form, setForm] = useState<BrandProfileInput>(EMPTY);
  const [objectivesText, setObjectivesText] = useState("");
  const [newFact, setNewFact] = useState("");
  const [isNew, setIsNew] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      const resolvedOrgId = await ensureOrgForUser(user);
      const profile = await getBrandProfile(resolvedOrgId);
      if (cancelled) return;
      setOrgId(resolvedOrgId);
      if (profile) {
        setForm(profile);
        setObjectivesText(profile.objectives.join("\n"));
        setIsNew(false);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!orgId) return;
    setError(null);

    const parsed = brandProfileSchema.safeParse({
      ...form,
      objectives: objectivesText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input.");
      return;
    }

    setSaving(true);
    try {
      await saveBrandProfile(orgId, parsed.data, isNew);
      setForm(parsed.data);
      setIsNew(false);
      setSavedAt(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  function addFact() {
    const fact = newFact.trim();
    if (!fact) return;
    setForm((f) => ({ ...f, memoryFacts: [...f.memoryFacts, fact] }));
    setNewFact("");
  }

  function removeFact(index: number) {
    setForm((f) => ({
      ...f,
      memoryFacts: f.memoryFacts.filter((_, i) => i !== index),
    }));
  }

  if (authLoading || loading) {
    return <p className="text-text-muted">Loading…</p>;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text">
          {isNew ? "Create your brand profile" : "Brand profile"}
        </h1>
        <button
          type="button"
          onClick={() => signOut()}
          className="text-sm text-text-muted underline"
        >
          Sign out
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm text-text-muted">
          Brand name
          <input
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="rounded-md border border-border bg-bg px-3 py-2 text-text"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-text-muted">
          Voice / tone
          <textarea
            rows={2}
            value={form.voiceTone}
            onChange={(e) =>
              setForm((f) => ({ ...f, voiceTone: e.target.value }))
            }
            className="rounded-md border border-border bg-bg px-3 py-2 text-text"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-text-muted">
          Audience
          <textarea
            rows={2}
            value={form.audienceDescription}
            onChange={(e) =>
              setForm((f) => ({ ...f, audienceDescription: e.target.value }))
            }
            className="rounded-md border border-border bg-bg px-3 py-2 text-text"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-text-muted">
          Objectives (one per line)
          <textarea
            rows={3}
            value={objectivesText}
            onChange={(e) => setObjectivesText(e.target.value)}
            className="rounded-md border border-border bg-bg px-3 py-2 text-text"
          />
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-sm text-text-muted">Brand memory facts</span>
          <ul className="flex flex-col gap-1">
            {form.memoryFacts.map((fact, i) => (
              <li
                key={`${fact}-${i}`}
                className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text"
              >
                <span>{fact}</span>
                <button
                  type="button"
                  onClick={() => removeFact(i)}
                  aria-label={`Remove fact: ${fact}`}
                  className="text-text-muted hover:text-danger"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <input
              value={newFact}
              onChange={(e) => setNewFact(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addFact();
                }
              }}
              placeholder="e.g. Never use emoji in captions"
              className="flex-1 rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
            />
            <button
              type="button"
              onClick={addFact}
              className="rounded-md border border-border px-3 py-2 text-sm text-text hover:bg-surface"
            >
              Add
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
        {savedAt && !error && <p className="text-sm text-success">Saved.</p>}

        <button
          type="submit"
          disabled={saving}
          className="self-start rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-contrast disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </form>
    </div>
  );
}
