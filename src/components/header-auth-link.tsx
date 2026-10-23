"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-provider";

export function HeaderAuthLink() {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="rounded-md border border-border px-3 py-1.5 text-sm text-text hover:bg-surface"
      >
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/content/new"
        className="rounded-md border border-border px-3 py-1.5 text-sm text-text hover:bg-surface"
      >
        Generate content
      </Link>
      <Link
        href="/brand"
        className="rounded-md border border-border px-3 py-1.5 text-sm text-text hover:bg-surface"
      >
        Brand profile
      </Link>
    </div>
  );
}
