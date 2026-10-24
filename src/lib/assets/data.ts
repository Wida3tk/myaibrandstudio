import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import type { Asset } from "./schema";

// docs/03-data-model.md describes assets as { storagePath, kind, tags[], createdBy, createdAt }.
// Storage is Cloudinary, not Firebase Storage (see docs/01-architecture-plan.md §8b — Storage
// needs Blaze same as Functions did), so "storagePath" becomes a Cloudinary delivery URL + the
// publicId needed to manage the asset later (e.g. deletion via the Cloudinary API).

function assetsCollection(orgId: string, brandId: string) {
  return collection(
    getFirebaseDb(),
    "organizations",
    orgId,
    "brands",
    brandId,
    "assets",
  );
}

export async function createAsset(
  orgId: string,
  brandId: string,
  uid: string,
  input: { url: string; publicId: string; kind: "image" | "video" },
): Promise<void> {
  await addDoc(assetsCollection(orgId, brandId), {
    url: input.url,
    publicId: input.publicId,
    kind: input.kind,
    tags: [],
    createdBy: uid,
    createdAt: serverTimestamp(),
  });
}

export async function listAssets(
  orgId: string,
  brandId: string,
): Promise<Asset[]> {
  const snap = await getDocs(
    query(assetsCollection(orgId, brandId), orderBy("createdAt", "desc")),
  );
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      url: data.url,
      publicId: data.publicId,
      kind: data.kind,
      tags: data.tags ?? [],
      createdBy: data.createdBy,
    } satisfies Asset;
  });
}
