"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-provider";

export function HeaderAuthLink() {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  return (
    <Link
      href={user ? "/brand" : "/login"}
      className="rounded-md border border-border px-3 py-1.5 text-sm text-text hover:bg-surface"
    >
      {user ? "Brand profile" : "Sign in"}
    </Link>
  );
}
