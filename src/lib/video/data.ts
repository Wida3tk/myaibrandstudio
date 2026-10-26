import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import { findUndefinedPaths } from "@/lib/creative/data";
import type { VideoProject, VideoScriptBrief } from "./types";

function videoProjectsCollection(orgId: string, brandId: string) {
  return collection(
    getFirebaseDb(),
    "organizations",
    orgId,
    "brands",
    brandId,
    "videoProjects",
  );
}

/** Firestore's addDoc rejects `undefined` field values outright (unlike `null`) — see
 * docs/12-creative-pipeline.md's QA notes for the same bug already hit and fixed in the image
 * pipeline's brief. */
function sanitizeBrief(brief: VideoScriptBrief): VideoScriptBrief {
  return {
    ...brief,
    style: brief.style ?? null,
    audienceOverride: brief.audienceOverride ?? null,
    customInstructions: brief.customInstructions ?? null,
  } as VideoScriptBrief;
}

export async function createVideoProject(
  orgId: string,
  brandId: string,
  input: Omit<VideoProject, "id">,
): Promise<string> {
  const payload = {
    ...input,
    brief: sanitizeBrief(input.brief),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (process.env.NODE_ENV !== "production") {
    const undefinedPaths = findUndefinedPaths(payload);
    if (undefinedPaths.length > 0) {
      console.error("[createVideoProject] undefined at:", undefinedPaths);
    }
  }
  const ref = await addDoc(videoProjectsCollection(orgId, brandId), payload);
  return ref.id;
}

export async function listVideoProjects(
  orgId: string,
  brandId: string,
): Promise<VideoProject[]> {
  const snap = await getDocs(
    query(
      videoProjectsCollection(orgId, brandId),
      orderBy("createdAt", "desc"),
    ),
  );
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      brief: data.brief,
      title: data.title,
      logline: data.logline,
      language: data.language,
      colorPalette: data.colorPalette,
      scenes: data.scenes ?? [],
      createdBy: data.createdBy,
    } satisfies VideoProject;
  });
}
