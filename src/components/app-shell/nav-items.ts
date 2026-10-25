import {
  LayoutDashboard,
  FileText,
  Palette,
  Image as ImageIcon,
  Building2,
  CalendarDays,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  labelEn: string;
  labelAr: string;
  icon: LucideIcon;
};

// Extended by later milestones (calendar, analytics, integrations) as those routes land.
export const NAV_ITEMS: NavItem[] = [
  { href: "/", labelEn: "Dashboard", labelAr: "لوحة التحكم", icon: LayoutDashboard },
  { href: "/content", labelEn: "Content", labelAr: "المحتوى", icon: FileText },
  { href: "/calendar", labelEn: "Calendar", labelAr: "التقويم", icon: CalendarDays },
  { href: "/design", labelEn: "Design studio", labelAr: "استوديو التصميم", icon: Palette },
  { href: "/assets", labelEn: "Assets", labelAr: "الأصول", icon: ImageIcon },
  { href: "/brand", labelEn: "Brand hub", labelAr: "مركز العلامة", icon: Building2 },
];
