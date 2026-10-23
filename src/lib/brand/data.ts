import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import { PRIMARY_BRAND_ID, type BrandProfileInput } from "./schema";

function brandRef(orgId: string) {
  return doc(
    getFirebaseDb(),
    "organizations",
    orgId,
    "brands",
    PRIMARY_BRAND_ID,
  );
}

export async function getBrandProfile(
  orgId: string,
): Promise<BrandProfileInput | null> {
  const snap = await getDoc(brandRef(orgId));
  if (!snap.exists()) {
    return null;
  }
  const data = snap.data() as {
    name?: string;
    voice?: { tone?: string };
    audience?: { description?: string };
    objectives?: string[];
    memory?: { facts?: string[] };
  };
  return {
    name: data.name ?? "",
    voiceTone: data.voice?.tone ?? "",
    audienceDescription: data.audience?.description ?? "",
    objectives: data.objectives ?? [],
    memoryFacts: data.memory?.facts ?? [],
  };
}

export async function saveBrandProfile(
  orgId: string,
  input: BrandProfileInput,
  isNew: boolean,
): Promise<void> {
  await setDoc(
    brandRef(orgId),
    {
      name: input.name,
      voice: { tone: input.voiceTone },
      audience: { description: input.audienceDescription },
      objectives: input.objectives,
      memory: { facts: input.memoryFacts, lastUpdatedAt: serverTimestamp() },
      updatedAt: serverTimestamp(),
      ...(isNew ? { createdAt: serverTimestamp() } : {}),
    },
    { merge: true },
  );
}
