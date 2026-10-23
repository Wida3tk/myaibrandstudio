import {
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import { getFirebaseDb } from "@/lib/firebase/client";

/**
 * Returns the user's org, creating a brand-new one (naming them owner) the first time they
 * sign in. Writes happen sequentially, not in a batch — see the matching note in
 * firestore.rules: the members/{uid} create rule reads the organizations/{orgId} doc to check
 * ownerUid, which only works once that write has actually committed.
 */
export async function ensureOrgForUser(user: User): Promise<string> {
  const db = getFirebaseDb();
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  const existingOrgId = userSnap.data()?.defaultOrgId as string | undefined;
  if (existingOrgId) {
    return existingOrgId;
  }

  const orgRef = doc(collection(db, "organizations"));
  await setDoc(orgRef, {
    name: `${user.displayName ?? user.email ?? "My"}'s Workspace`,
    ownerUid: user.uid,
    plan: "free",
    createdAt: serverTimestamp(),
  });

  await setDoc(doc(db, "organizations", orgRef.id, "members", user.uid), {
    role: "owner",
    invitedAt: serverTimestamp(),
    joinedAt: serverTimestamp(),
  });

  await setDoc(userRef, {
    displayName: user.displayName ?? null,
    email: user.email,
    defaultOrgId: orgRef.id,
    createdAt: serverTimestamp(),
  });

  return orgRef.id;
}
