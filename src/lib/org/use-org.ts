"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/auth-provider";
import { ensureOrgForUser } from "@/lib/org/bootstrap";
import { getBrandProfile } from "@/lib/brand/data";
import type { BrandProfileInput } from "@/lib/brand/schema";

export type OrgContext = {
  orgId: string | null;
  brand: BrandProfileInput | null;
  loading: boolean;
};

/** Resolves (and bootstraps if needed) the signed-in user's org + primary brand profile. */
export function useOrg(): OrgContext {
  const { user } = useAuth();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [brand, setBrand] = useState<BrandProfileInput | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) {
        if (!cancelled) setLoading(false);
        return;
      }
      const resolvedOrgId = await ensureOrgForUser(user);
      const profile = await getBrandProfile(resolvedOrgId);
      if (cancelled) return;
      setOrgId(resolvedOrgId);
      setBrand(profile);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return { orgId, brand, loading };
}
