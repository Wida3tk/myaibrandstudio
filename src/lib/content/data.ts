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
import type { GeneratedContent } from "@/lib/ai/generate";
import type { ContentType, Language } from "@/lib/ai/types";
import type {
  ContentItem,
  ContentStatus,
  HistoryEntry,
  Platform,
} from "./schema";

function contentItemsCollection(orgId: string, brandId: string) {
  return collection(
    getFirebaseDb(),
    "organizations",
    orgId,
    "brands",
    brandId,
    "contentItems",
  );
}

export async function createDraftContentItem(
  orgId: string,
  brandId: string,
  uid: string,
  input: {
    type: ContentType;
    language: Language;
    topic: string;
    structuredPayload: GeneratedContent;
    platformTargets: Platform[];
  },
): Promise<string> {
  const historyEntry: HistoryEntry = {
    uid,
    action: "created",
    fromStatus: null,
    toStatus: "draft",
    at: new Date().toISOString(),
  };

  const ref = await addDoc(contentItemsCollection(orgId, brandId), {
    type: input.type,
    language: input.language,
    topic: input.topic,
    structuredPayload: input.structuredPayload,
    platformTargets: input.platformTargets,
    status: "draft",
    history: [historyEntry],
    createdBy: uid,
    imageUrl: null,
    publishes: {},
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return ref.id;
}

export async function listContentItems(
  orgId: string,
  brandId: string,
): Promise<ContentItem[]> {
  const snap = await getDocs(
    query(contentItemsCollection(orgId, brandId), orderBy("createdAt", "desc")),
  );
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      type: data.type,
      language: data.language,
      topic: data.topic,
      structuredPayload: data.structuredPayload,
      status: data.status,
      history: data.history ?? [],
      createdBy: data.createdBy,
      platformTargets: data.platformTargets ?? [],
      imageUrl: data.imageUrl ?? null,
      publishes: data.publishes ?? {},
    } satisfies ContentItem;
  });
}

const NEXT_STATUS: Record<ContentStatus, ContentStatus | null> = {
  draft: "in_review",
  in_review: "approved",
  approved: null, // "published" is set only by a real publish call, never a manual transition
  published: null,
};

export function nextStatus(current: ContentStatus): ContentStatus | null {
  return NEXT_STATUS[current];
}

export async function transitionContentItem(
  orgId: string,
  brandId: string,
  item: ContentItem,
  toStatus: ContentStatus,
  uid: string,
  action: string,
): Promise<void> {
  const historyEntry: HistoryEntry = {
    uid,
    action,
    fromStatus: item.status,
    toStatus,
    at: new Date().toISOString(),
  };

  await updateDoc(
    doc(
      getFirebaseDb(),
      "organizations",
      orgId,
      "brands",
      brandId,
      "contentItems",
      item.id,
    ),
    {
      status: toStatus,
      history: [...item.history, historyEntry],
      updatedAt: serverTimestamp(),
    },
  );
}

export async function attachImageToContentItem(
  orgId: string,
  brandId: string,
  itemId: string,
  imageUrl: string,
): Promise<void> {
  await updateDoc(
    doc(
      getFirebaseDb(),
      "organizations",
      orgId,
      "brands",
      brandId,
      "contentItems",
      itemId,
    ),
    { imageUrl, updatedAt: serverTimestamp() },
  );
}

/** Edits the generated text in place — not a status transition, so no history entry. */
export async function updateContentItemPayload(
  orgId: string,
  brandId: string,
  itemId: string,
  structuredPayload: GeneratedContent,
): Promise<void> {
  await updateDoc(
    doc(
      getFirebaseDb(),
      "organizations",
      orgId,
      "brands",
      brandId,
      "contentItems",
      itemId,
    ),
    { structuredPayload, updatedAt: serverTimestamp() },
  );
}
