"use client";

import Link from "next/link";
import { Plus, FileText, Palette, Image as ImageIcon } from "lucide-react";
import { useLocale } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";

const ACTIONS = [
  {
    href: "/content/new",
    icon: FileText,
    labelEn: "AI content",
    labelAr: "محتوى بالذكاء الاصطناعي",
    descEn: "Generate a new post, hook or caption",
    descAr: "إنشاء منشور أو خطّاف أو تعليق جديد",
  },
  {
    href: "/design",
    icon: Palette,
    labelEn: "Design",
    labelAr: "تصميم",
    descEn: "Start a new visual in the design studio",
    descAr: "ابدأ تصميمًا جديدًا في استوديو التصميم",
  },
  {
    href: "/assets",
    icon: ImageIcon,
    labelEn: "Upload asset",
    labelAr: "رفع أصل",
    descEn: "Add an image or video to your library",
    descAr: "أضف صورة أو فيديو إلى مكتبتك",
  },
];

export function QuickCreate() {
  const { locale } = useLocale();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus size={16} aria-hidden="true" />
          {locale === "ar" ? "إنشاء" : "Create"}
        </Button>
      </DialogTrigger>
      <DialogContent
        title={
          locale === "ar" ? "ماذا تريد إنشاءه؟" : "What do you want to create?"
        }
      >
        <div className="flex flex-col gap-2">
          {ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                onClick={() => setOpen(false)}
                className="flex items-start gap-3 rounded-[var(--radius-md)] border border-border p-3 transition-colors hover:border-accent hover:bg-accent-soft"
                style={{ transitionDuration: "var(--duration-fast)" }}
              >
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-accent-soft text-accent">
                  <Icon size={18} />
                </span>
                <span>
                  <span className="block text-sm font-medium text-text">
                    {locale === "ar" ? action.labelAr : action.labelEn}
                  </span>
                  <span className="block text-xs text-text-muted">
                    {locale === "ar" ? action.descAr : action.descEn}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
