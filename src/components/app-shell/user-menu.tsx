"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-provider";
import { useLocale } from "@/components/locale-provider";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const { locale } = useLocale();
  if (!user) return null;

  const label = user.displayName ?? user.email ?? "Account";

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={locale === "ar" ? "قائمة الحساب" : "Account menu"}
        className="rounded-full focus-visible:outline-none"
      >
        <Avatar label={label} />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel className="truncate">{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleSignOut} className="text-danger">
          <LogOut size={16} aria-hidden="true" />
          {locale === "ar" ? "تسجيل الخروج" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
