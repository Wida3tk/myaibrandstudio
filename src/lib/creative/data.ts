import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import type { Campaign, CreativeBrief, CreativeSpec, DesignVariation } from "./types";

function campaignsCollection(orgId: string, brandId: string) {
  return collection(
    getFirebaseDb(),
    "organizations",
    orgId,
    "brands",
    brandId,
    "campaigns",
  );
}

/** Firestore's addDoc/setDoc reject `undefined` field values outright (unlike `null`) — the
 * brief's optional fields (style, audienceOverride, ...) come through as `undefined` when the
 * user leaves them blank, so they must be normalized before writing. */
function sanitizeBrief(brief: CreativeBrief): CreativeBrief {
  return {
    ...brief,
    style: brief.style ?? null,
    audienceOverride: brief.audienceOverride ?? null,
    requiredText: brief.requiredText ?? null,
    customInstructions: brief.customInstructions ?? null,
  } as CreativeBrief;
}

function campaignRef(orgId: string, brandId: string, campaignId: string) {
  return doc(
    getFirebaseDb(),
    "organizations",
    orgId,
    "brands",
    brandId,
    "campaigns",
    campaignId,
  );
}

export async function createCampaign(
  orgId: string,
  brandId: string,
  uid: string,
  input: {
    brief: CreativeBrief;
    spec: CreativeSpec;
    backgroundImageUrl: string | null;
    variations: DesignVariation[];
  },
): Promise<string> {
  const payload = {
    brief: sanitizeBrief(input.brief),
    spec: input.spec,
    backgroundImageUrl: input.backgroundImageUrl,
    variations: input.variations,
    selectedVariationId: null,
    createdBy: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (process.env.NODE_ENV !== "production") {
    const undefinedPaths = findUndefinedPaths(payload);
    if (undefinedPaths.length > 0) {
      console.error("[createCampaign] undefined at:", undefinedPaths);
    }
  }
  const ref = await addDoc(campaignsCollection(orgId, brandId), payload);
  return ref.id;
}

function findUndefinedPaths(value: unknown, path = ""): string[] {
  if (value === undefined) return [path || "(root)"];
  if (value === null || typeof value !== "object") return [];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, v]) =>
    findUndefinedPaths(v, path ? `${path}.${key}` : key),
  );
}

export async function listCampaigns(
  orgId: string,
  brandId: string,
): Promise<Campaign[]> {
  const snap = await getDocs(
    query(campaignsCollection(orgId, brandId), orderBy("createdAt", "desc")),
  );
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      brief: data.brief,
      spec: data.spec,
      backgroundImageUrl: data.backgroundImageUrl ?? null,
      variations: data.variations ?? [],
      selectedVariationId: data.selectedVariationId ?? null,
      createdBy: data.createdBy,
    } satisfies Campaign;
  });
}

export async function selectCampaignVariation(
  orgId: string,
  brandId: string,
  campaignId: string,
  variationId: string,
): Promise<void> {
  await updateDoc(campaignRef(orgId, brandId, campaignId), {
    selectedVariationId: variationId,
    updatedAt: serverTimestamp(),
  });
}

/** Overwrites one variation's fabricJson/previewDataUrl after an AI revision or manual edit. */
export async function updateCampaignVariation(
  orgId: string,
  brandId: string,
  campaignId: string,
  variations: DesignVariation[],
): Promise<void> {
  await updateDoc(campaignRef(orgId, brandId, campaignId), {
    variations,
    updatedAt: serverTimestamp(),
  });
}
