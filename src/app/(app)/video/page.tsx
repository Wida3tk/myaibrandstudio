"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Clapperboard,
  Check,
  Download,
  ImageOff,
  ImagePlus,
  Volume2,
  VolumeX,
  Film,
  AlertTriangle,
} from "lucide-react";
import { Player } from "@remotion/player";
import { useAuth } from "@/lib/auth/auth-provider";
import { useOrg } from "@/lib/org/use-org";
import { useLocale } from "@/components/locale-provider";
import { PRIMARY_BRAND_ID } from "@/lib/brand/schema";
import { buildVideoProject } from "@/lib/video/pipeline";
import { createVideoProject } from "@/lib/video/data";
import { uploadToCloudinary } from "@/lib/assets/cloudinary";
import type { VideoProject, VideoScriptBrief } from "@/lib/video/types";
import {
  getRenderJobStatus,
  isRenderServiceAvailable,
  renderJobVideoUrl,
  startRenderJob,
  type RenderJobStatus,
} from "@/lib/video/render-service";
import { VideoBriefDialog } from "@/components/video/brief-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ShortFormVideo } from "@video-renderer/compositions/ShortFormVideo";
import type { ShortFormVideoProps } from "@video-renderer/types";

const FPS = 30;

function toPlayerProps(
  project: Omit<VideoProject, "id">,
  logoUrl: string | null,
): ShortFormVideoProps {
  return {
    title: project.title,
    language: project.language,
    colorPalette: project.colorPalette,
    logoUrl,
    scenes: project.scenes.map((scene) => ({
      order: scene.order,
      durationInFrames: Math.round(scene.durationSeconds * FPS),
      imageUrl: scene.imageUrl,
      onScreenText: scene.onScreenText,
      voiceoverLine: scene.voiceoverLine,
      voiceoverUrl: scene.voiceoverUrl,
    })),
  };
}

export default function VideoStudioPage() {
  const { user } = useAuth();
  const { orgId, brand } = useOrg();
  const { locale } = useLocale();

  const [briefOpen, setBriefOpen] = useState(false);
  const [pipelineStep, setPipelineStep] = useState<string | null>(null);
  const [project, setProject] = useState<Omit<VideoProject, "id"> | null>(null);
  const [savedProjectId, setSavedProjectId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingScene, setUploadingScene] = useState<number | null>(null);

  const [renderServiceAvailable, setRenderServiceAvailable] = useState<
    boolean | null
  >(null);
  const [renderJobId, setRenderJobId] = useState<string | null>(null);
  const [renderStatus, setRenderStatus] = useState<RenderJobStatus | null>(
    null,
  );
  const [renderError, setRenderError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    isRenderServiceAvailable().then(setRenderServiceAvailable);
  }, []);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const logoUrl = brand?.logoUrl || null;
  const playerProps = useMemo(
    () => (project ? toPlayerProps(project, logoUrl) : null),
    [project, logoUrl],
  );
  const durationInFrames = useMemo(
    () =>
      playerProps?.scenes.reduce((sum, s) => sum + s.durationInFrames, 0) ??
      FPS,
    [playerProps],
  );

  async function handleGenerate(brief: VideoScriptBrief) {
    if (!orgId || !user) return;
    setError(null);
    setSavedProjectId(null);
    setRenderJobId(null);
    setRenderStatus(null);
    setRenderError(null);
    setPipelineStep(
      locale === "ar" ? "جارٍ كتابة السيناريو..." : "Writing the script...",
    );
    try {
      const built = await buildVideoProject(
        orgId,
        PRIMARY_BRAND_ID,
        user.uid,
        brief,
      );
      setProject(built);
    } finally {
      setPipelineStep(null);
    }
  }

  async function handleApprove() {
    if (!orgId || !project) return;
    setError(null);
    setSaving(true);
    try {
      const id = await createVideoProject(orgId, PRIMARY_BRAND_ID, project);
      setSavedProjectId(id);
    } catch (err) {
      console.error(
        "Failed to save video project (still usable client-side):",
        err,
      );
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSceneImageUpload(order: number, file: File) {
    setUploadingScene(order);
    try {
      const uploaded = await uploadToCloudinary(file);
      setProject((prev) =>
        prev
          ? {
              ...prev,
              scenes: prev.scenes.map((scene) =>
                scene.order === order
                  ? { ...scene, imageUrl: uploaded.url }
                  : scene,
              ),
            }
          : prev,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload image.");
    } finally {
      setUploadingScene(null);
    }
  }

  async function handleRender() {
    if (!playerProps) return;
    setRenderError(null);
    setRenderStatus(null);
    try {
      const available = await isRenderServiceAvailable();
      setRenderServiceAvailable(available);
      if (!available) return;

      const jobId = await startRenderJob(playerProps);
      setRenderJobId(jobId);
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        try {
          const status = await getRenderJobStatus(jobId);
          setRenderStatus(status);
          if (status.status === "done" || status.status === "error") {
            if (pollRef.current) clearInterval(pollRef.current);
          }
        } catch (err) {
          setRenderError(err instanceof Error ? err.message : String(err));
          if (pollRef.current) clearInterval(pollRef.current);
        }
      }, 1500);
    } catch (err) {
      setRenderError(err instanceof Error ? err.message : String(err));
    }
  }

  const renderedVideoUrl = renderJobId ? renderJobVideoUrl(renderJobId) : null;

  return (
    <div
      dir={locale === "ar" ? "rtl" : "ltr"}
      className="flex flex-col gap-6 text-start"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text">
            {locale === "ar" ? "استوديو الفيديو" : "Video Studio"}
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            {locale === "ar"
              ? "فيديوهات قصيرة من الذكاء الاصطناعي — سيناريو وصور وتعليق صوتي."
              : "Short-form videos from a brief — script, storyboard and voiceover, AI-generated."}
          </p>
        </div>
        <Button type="button" onClick={() => setBriefOpen(true)}>
          <Clapperboard size={16} aria-hidden="true" />
          {locale === "ar"
            ? "إنشاء فيديو بالذكاء الاصطناعي"
            : "Generate a video"}
        </Button>
      </div>

      <VideoBriefDialog
        open={briefOpen}
        onOpenChange={setBriefOpen}
        brand={brand}
        defaultLanguage={locale === "ar" ? "ar" : "en"}
        onGenerate={handleGenerate}
      />

      {pipelineStep && (
        <Card>
          <CardContent className="flex items-center gap-2 text-sm text-text-muted">
            <Skeleton className="h-4 w-4 rounded-full" />
            {pipelineStep}
          </CardContent>
        </Card>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      {project && playerProps && (
        <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
          <Card className="h-fit">
            <CardContent className="flex flex-col gap-3">
              <div>
                <h2 className="text-sm font-medium text-text">
                  {project.title}
                </h2>
                <p className="mt-1 text-xs text-text-muted">
                  {project.logline}
                </p>
              </div>

              <ul className="flex flex-col gap-2">
                {project.scenes.map((scene) => (
                  <li
                    key={scene.order}
                    className="flex items-start gap-2 rounded-[var(--radius-md)] border border-border p-2 text-xs"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                      {scene.order}
                    </span>
                    <div className="flex flex-col gap-1">
                      <span className="text-text">{scene.onScreenText}</span>
                      <div className="flex items-center gap-2 text-text-muted">
                        <span className="inline-flex items-center gap-1">
                          {scene.imageUrl ? (
                            <Check size={12} aria-hidden="true" />
                          ) : (
                            <ImageOff size={12} aria-hidden="true" />
                          )}
                          {scene.imageUrl
                            ? locale === "ar"
                              ? "صورة"
                              : "image"
                            : locale === "ar"
                              ? "تدرج"
                              : "gradient"}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          {scene.voiceoverUrl ? (
                            <Volume2 size={12} aria-hidden="true" />
                          ) : (
                            <VolumeX size={12} aria-hidden="true" />
                          )}
                          {scene.voiceoverUrl
                            ? locale === "ar"
                              ? "صوت"
                              : "voice"
                            : locale === "ar"
                              ? "بدون صوت"
                              : "silent"}
                        </span>
                      </div>
                      {!scene.imageUrl && (
                        <label className="mt-1 inline-flex w-fit cursor-pointer items-center gap-1 rounded-[var(--radius-sm)] border border-border px-2 py-1 text-[11px] text-text-muted hover:border-accent hover:text-accent">
                          <ImagePlus size={12} aria-hidden="true" />
                          {uploadingScene === scene.order
                            ? locale === "ar"
                              ? "جارٍ الرفع..."
                              : "Uploading..."
                            : locale === "ar"
                              ? "رفع صورة حقيقية"
                              : "Upload a real image"}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={uploadingScene === scene.order}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file)
                                void handleSceneImageUpload(scene.order, file);
                              e.target.value = "";
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </li>
                ))}
              </ul>

              <Button
                type="button"
                onClick={handleApprove}
                disabled={saving || Boolean(savedProjectId)}
              >
                <Check size={16} aria-hidden="true" />
                {savedProjectId
                  ? locale === "ar"
                    ? "تم الاعتماد"
                    : "Approved"
                  : saving
                    ? locale === "ar"
                      ? "جارٍ الحفظ..."
                      : "Saving..."
                    : locale === "ar"
                      ? "اعتماد"
                      : "Approve"}
              </Button>

              {renderServiceAvailable === false ? (
                <div className="flex items-start gap-2 rounded-[var(--radius-md)] border border-warning/30 bg-warning-soft p-3 text-xs text-warning">
                  <AlertTriangle
                    size={14}
                    className="mt-0.5 shrink-0"
                    aria-hidden="true"
                  />
                  <span>
                    {locale === "ar"
                      ? "خدمة الرندر المحلية غير متصلة. شغّلها مرة واحدة في الطرفية: "
                      : "Local render service isn't running. Start it once, in a terminal: "}
                    <code className="rounded bg-surface-raised px-1 py-0.5">
                      npm run render-server
                    </code>
                  </span>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleRender}
                  disabled={
                    renderStatus?.status === "bundling" ||
                    renderStatus?.status === "rendering" ||
                    renderStatus?.status === "extracting"
                  }
                >
                  <Film size={16} aria-hidden="true" />
                  {renderStatus &&
                  renderStatus.status !== "done" &&
                  renderStatus.status !== "error"
                    ? locale === "ar"
                      ? `جارٍ الرندر... ${Math.round(renderStatus.progress * 100)}%`
                      : `Rendering... ${Math.round(renderStatus.progress * 100)}%`
                    : locale === "ar"
                      ? "رندر فيديو حقيقي (MP4)"
                      : "Render real video (MP4)"}
                </Button>
              )}

              {renderError && (
                <p className="text-xs text-danger">{renderError}</p>
              )}
              {renderStatus?.status === "error" && renderStatus.error && (
                <p className="text-xs text-danger">{renderStatus.error}</p>
              )}

              {renderStatus?.status === "done" && renderedVideoUrl && (
                <div className="flex flex-col gap-2">
                  <video
                    controls
                    src={renderedVideoUrl}
                    className="w-full rounded-[var(--radius-md)]"
                    style={{ aspectRatio: "1080 / 1920" }}
                  />
                  <p className="text-xs text-text-muted">
                    {renderStatus.hasVideo && renderStatus.hasAudio
                      ? locale === "ar"
                        ? "تم التحقق: يحتوي الملف على صوت وصورة."
                        : "Verified: this file contains both video and audio streams."
                      : locale === "ar"
                        ? "تحذير: لم يتم العثور على مسار صوت في الملف المُصدَّر."
                        : "Warning: no audio stream was found in the exported file."}
                  </p>
                  <a
                    href={renderedVideoUrl}
                    download={`${project.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "video"}.mp4`}
                  >
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full"
                    >
                      <Download size={16} aria-hidden="true" />
                      {locale === "ar" ? "تنزيل MP4" : "Download MP4"}
                    </Button>
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col items-center gap-2 p-4">
              <p className="text-xs text-text-muted">
                {locale === "ar" ? "معاينة مباشرة" : "Live preview"}
              </p>
              <div style={{ width: "100%", maxWidth: 360 }}>
                <Player
                  component={ShortFormVideo}
                  inputProps={playerProps}
                  durationInFrames={durationInFrames}
                  compositionWidth={1080}
                  compositionHeight={1920}
                  fps={FPS}
                  style={{ width: "100%", aspectRatio: "1080 / 1920" }}
                  controls
                  loop
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!project && !pipelineStep && (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-text-muted">
            <Clapperboard size={28} aria-hidden="true" />
            <p className="text-sm">
              {locale === "ar"
                ? "لا يوجد فيديو بعد. اضغط «إنشاء فيديو بالذكاء الاصطناعي» للبدء."
                : "No video yet. Click “Generate a video” to start."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
