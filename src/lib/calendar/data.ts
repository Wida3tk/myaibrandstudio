import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import type { Platform } from "@/lib/content/schema";
import type { CalendarEntry } from "./schema";

function calendarCollection(orgId: string, brandId: string) {
  return collection(
    getFirebaseDb(),
    "organizations",
    orgId,
    "brands",
    brandId,
    "calendarEntries",
  );
}

export async function createCalendarEntry(
  orgId: string,
  brandId: string,
  input: { contentItemId: string; platform: Platform; scheduledFor: string },
): Promise<string> {
  const ref = await addDoc(calendarCollection(orgId, brandId), {
    contentItemId: input.contentItemId,
    platform: input.platform,
    scheduledFor: input.scheduledFor,
    publishStatus: "scheduled",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function listCalendarEntries(
  orgId: string,
  brandId: string,
): Promise<CalendarEntry[]> {
  const snap = await getDocs(
    query(calendarCollection(orgId, brandId), orderBy("scheduledFor", "asc")),
  );
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      contentItemId: data.contentItemId,
      platform: data.platform,
      scheduledFor: data.scheduledFor,
      publishStatus: data.publishStatus ?? "scheduled",
    } satisfies CalendarEntry;
  });
}

export async function deleteCalendarEntry(
  orgId: string,
  brandId: string,
  entryId: string,
): Promise<void> {
  await deleteDoc(
    doc(
      getFirebaseDb(),
      "organizations",
      orgId,
      "brands",
      brandId,
      "calendarEntries",
      entryId,
    ),
  );
}
