"use client";

import { AppShell } from "@/components/app-shell/shell";
import { useRequireAuth } from "@/lib/auth/use-require-auth";
import { Skeleton } from "@/components/ui/skeleton";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useRequireAuth();

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg p-6">
        <div className="flex w-full max-w-5xl flex-col gap-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
