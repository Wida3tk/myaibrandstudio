import { collection, getDocs } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import { usageEntrySchema, type UsageEntry } from "./schema";

/** Reads usage/{orgId}/{yyyymm} — written only by the Worker (Admin SDK); read-only here. */
export async function listUsageForMonth(
  orgId: string,
  yyyymm: string,
): Promise<UsageEntry[]> {
  const snap = await getDocs(
    collection(getFirebaseDb(), "usage", orgId, yyyymm),
  );
  return snap.docs
    .map((d) => usageEntrySchema.safeParse(d.data()))
    .filter((r) => r.success)
    .map((r) => r.data);
}
