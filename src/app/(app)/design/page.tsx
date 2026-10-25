"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/auth-provider";
import { ensureOrgForUser } from "@/lib/org/bootstrap";
import { PRIMARY_BRAND_ID } from "@/lib/brand/schema";
import { createAsset, listAssets } from "@/lib/assets/data";
import { uploadToCloudinary } from "@/lib/assets/cloudinary";
import { validateAssetFile } from "@/lib/assets/validate";
import type { Asset } from "@/lib/assets/schema";
import {
  canvasToFile,
  composeImageWithText,
  loadImage,
  type TextOverlayOptions,
} from "@/lib/design/compose";
import type { Language } from "@/lib/ai/types";

export default function DesignPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const [orgId, setOrgId] = useState<string | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [text, setText] = useState("");
  const [fontSize, setFontSize] = useState(48);
  const [color, setColor] = useState("#ffffff");
  const [position, setPosition] =
    useState<TextOverlayOptions["position"]>("bottom");
  const [language, setLanguage] = useState<Language>("en");

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
      const list = (await listAssets(resolvedOrgId, PRIMARY_BRAND_ID)).filter(
        (a) => a.kind === "image",
      );
      setAssets(list);
      if (list.length > 0) setSelectedUrl(list[0].url);
      setLoading(false);
    })();
  }, [user]);

  useEffect(() => {
    if (!selectedUrl) return;
    let cancelled = false;
    loadImage(selectedUrl)
      .then((img) => {
        if (cancelled) return;
        imageRef.current = img;
        render();
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load image for editing.");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- render() reads latest state each call
  }, [selectedUrl]);

  function render() {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) return;
    composeImageWithText(canvas, image, {
      text,
      fontSize,
      color,
      position,
      direction: language === "ar" ? "rtl" : "ltr",
    });
  }

  useEffect(() => {
    render();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- render() reads latest state each call
  }, [text, fontSize, color, position, language]);

  function editOption<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setSaved(false);
    };
  }

  const handleTextChange = editOption(setText);
  const handleFontSizeChange = editOption(setFontSize);
  const handleColorChange = editOption(setColor);
  const handlePositionChange = editOption(setPosition);
  const handleLanguageChange = editOption(setLanguage);

  async function handleUploadNew(e: React.ChangeEvent<HTMLInputElement>) {
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
        kind: "image",
      });
      const list = (await listAssets(orgId, PRIMARY_BRAND_ID)).filter(
        (a) => a.kind === "image",
      );
      setAssets(list);
      setSelectedUrl(uploaded.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  function handleDownload() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "design.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  async function handleSaveToAssets() {
    const canvas = canvasRef.current;
    if (!canvas || !orgId || !user) return;
    setError(null);
    setSaving(true);
    try {
      const file = await canvasToFile(canvas, `design-${Date.now()}.png`);
      const uploaded = await uploadToCloudinary(file);
      await createAsset(orgId, PRIMARY_BRAND_ID, user.uid, {
        url: uploaded.url,
        publicId: uploaded.publicId,
        kind: "image",
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || loading) {
    return <p className="text-text-muted">Loading…</p>;
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-xl font-semibold text-text">Design</h1>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      <div className="mt-6 grid gap-6 md:grid-cols-[1fr_280px]">
        <div>
          {selectedUrl ? (
            <canvas
              ref={canvasRef}
              className="w-full rounded-md border border-border"
            />
          ) : (
            <p className="text-sm text-text-muted">
              Upload an image to start designing.
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="rounded-md border border-border px-3 py-1.5 text-sm text-text hover:bg-surface disabled:opacity-60"
            >
              {uploading ? "Uploading…" : "Upload image"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleUploadNew}
              className="hidden"
            />
            {selectedUrl && (
              <>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="rounded-md border border-border px-3 py-1.5 text-sm text-text hover:bg-surface"
                >
                  Download
                </button>
                <button
                  type="button"
                  onClick={handleSaveToAssets}
                  disabled={saving || saved}
                  className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-contrast disabled:opacity-60"
                >
                  {saved ? "Saved" : saving ? "Saving…" : "Save to Assets"}
                </button>
              </>
            )}
          </div>

          {assets.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-text-muted">Or pick from Assets</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {assets.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => setSelectedUrl(asset.url)}
                    className={`h-16 w-16 overflow-hidden rounded-md border ${
                      selectedUrl === asset.url
                        ? "border-accent"
                        : "border-border"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- static export, no Image Optimization API */}
                    <img
                      src={asset.url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm text-text-muted">
            Text
            <textarea
              value={text}
              onChange={(e) => handleTextChange(e.target.value)}
              rows={3}
              className="rounded-md border border-border bg-bg px-3 py-2 text-text"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-text-muted">
            Language
            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value as Language)}
              className="rounded-md border border-border bg-bg px-3 py-2 text-text"
            >
              <option value="en">English</option>
              <option value="ar">العربية</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm text-text-muted">
            Position
            <select
              value={position}
              onChange={(e) =>
                handlePositionChange(
                  e.target.value as TextOverlayOptions["position"],
                )
              }
              className="rounded-md border border-border bg-bg px-3 py-2 text-text"
            >
              <option value="top">Top</option>
              <option value="center">Center</option>
              <option value="bottom">Bottom</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm text-text-muted">
            Font size
            <input
              type="range"
              min={24}
              max={96}
              value={fontSize}
              onChange={(e) => handleFontSizeChange(Number(e.target.value))}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-text-muted">
            Text color
            <input
              type="color"
              value={color}
              onChange={(e) => handleColorChange(e.target.value)}
              className="h-9 w-full rounded-md border border-border bg-bg"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
