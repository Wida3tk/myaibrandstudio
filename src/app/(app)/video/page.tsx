"use client";

import { useMemo, useState } from "react";
import {
  Clapperboard,
  Check,
  Download,
  ImageOff,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Player } from "@remotion/player";
import { useAuth } from "@/lib/auth/auth-provider";
import { useOrg } from "@/lib/org/use-org";
import { useLocale } from "@/components/locale-provider";
import { PRIMARY_BRAND_ID } from "@/lib/brand/schema";
import { buildVideoProject } from "@/lib/video/pipeline";
import { createVideoProject } from "@/lib/video/data";
import type { VideoProject, VideoScriptBrief } from "@/lib/video/types";
import { VideoBriefDialog } from "@/components/video/brief-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ShortFormVideo } from "@video-renderer/compositions/ShortFormVideo";
import type { ShortFormVideoProps } from "@video-renderer/types";

const FPS = 30;

function toPlayerProps(project: Omit<VideoProject, "id">): ShortFormVideoProps {
  return {
    title: project.title,
    language: project.language,
    colorPalette: project.colorPalette,
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

  const playerProps = useMemo(
    () => (project ? toPlayerProps(project) : null),
    [project],
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

  function handleDownloadProject() {
    if (!playerProps) return;
    const blob = new Blob([JSON.stringify(playerProps, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${project?.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "video"}-props.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

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

              <Button
                type="button"
                variant="secondary"
                onClick={handleDownloadProject}
              >
                <Download size={16} aria-hidden="true" />
                {locale === "ar"
                  ? "تنزيل مشروع الفيديو (JSON)"
                  : "Download project (JSON)"}
              </Button>

              <p className="text-xs text-text-muted">
                {locale === "ar"
                  ? "الرندر الفعلي يعمل محليًا: "
                  : "Actual rendering runs locally: "}
                <code className="rounded bg-surface-raised px-1 py-0.5">
                  npm run render-video -- project.json out.mp4
                </code>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center justify-center p-4">
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
