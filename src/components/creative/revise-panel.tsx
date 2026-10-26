"use client";

import { useState } from "react";
import { MessageSquare, Send } from "lucide-react";
import { useLocale } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";

const EXAMPLES_EN = [
  "Make the headline larger",
  "Move the logo to the upper right",
  "Use my brand colors",
];
const EXAMPLES_AR = [
  "اجعل العنوان أكبر",
  "انقل الشعار إلى الأعلى يمينًا",
  "استخدم ألوان العلامة التجارية",
];

export function RevisePanel({
  onRevise,
}: {
  onRevise: (instruction: string) => Promise<string[]>;
}) {
  const { locale } = useLocale();
  const [instruction, setInstruction] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleSubmit() {
    if (!instruction.trim()) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const applied = await onRevise(instruction.trim());
      setFeedback(
        applied.length > 0
          ? locale === "ar"
            ? `تم تعديل: ${applied.join("، ")}`
            : `Updated: ${applied.join(", ")}`
          : locale === "ar"
            ? "لم يتم تحديد أي عنصر لهذا الطلب."
            : "Nothing matched that instruction.",
      );
      setInstruction("");
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Revision failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 border-t border-border pt-3">
      <div className="flex items-center gap-1.5 text-sm font-medium text-text">
        <MessageSquare size={14} aria-hidden="true" />
        {locale === "ar" ? "تعديل بالذكاء الاصطناعي" : "Revise with AI"}
      </div>
      <Textarea
        rows={2}
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
        placeholder={(locale === "ar" ? EXAMPLES_AR : EXAMPLES_EN)[0]}
      />
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={handleSubmit}
        disabled={submitting || !instruction.trim()}
      >
        <Send size={14} aria-hidden="true" />
        {submitting
          ? locale === "ar"
            ? "جارٍ التطبيق..."
            : "Applying..."
          : locale === "ar"
            ? "تطبيق"
            : "Apply"}
      </Button>
      {feedback && <p className="text-xs text-text-muted">{feedback}</p>}
    </div>
  );
}
