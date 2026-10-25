"use client";

import { Bold, Italic, AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import type { Canvas, Textbox } from "fabric";
import { useLocale } from "@/components/locale-provider";
import { FieldGroup, Label, Select } from "@/components/ui/input";

const FONT_OPTIONS = [
  "Geist, sans-serif",
  "Georgia, serif",
  "'Courier New', monospace",
  "'Noto Sans Arabic', sans-serif",
];

export function TextPropertiesPanel({
  canvas,
  textbox,
  onChange,
}: {
  canvas: Canvas;
  textbox: Textbox;
  onChange: () => void;
}) {
  const { locale } = useLocale();

  function set(patch: Record<string, unknown>) {
    textbox.set(patch);
    canvas.requestRenderAll();
    canvas.fire("object:modified", { target: textbox });
    onChange();
  }

  const isBold = textbox.fontWeight === "700" || textbox.fontWeight === "bold";
  const isItalic = textbox.fontStyle === "italic";

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-3">
      <FieldGroup>
        <Label>{locale === "ar" ? "الخط" : "Font"}</Label>
        <Select
          value={textbox.fontFamily ?? FONT_OPTIONS[0]}
          onChange={(e) => set({ fontFamily: e.target.value })}
        >
          {FONT_OPTIONS.map((f) => (
            <option key={f} value={f}>
              {f.split(",")[0].replace(/'/g, "")}
            </option>
          ))}
        </Select>
      </FieldGroup>

      <FieldGroup>
        <Label>{locale === "ar" ? "حجم الخط" : "Font size"}</Label>
        <input
          type="range"
          min={12}
          max={160}
          value={textbox.fontSize ?? 32}
          onChange={(e) => set({ fontSize: Number(e.target.value) })}
        />
      </FieldGroup>

      <FieldGroup>
        <Label>{locale === "ar" ? "اللون" : "Color"}</Label>
        <input
          type="color"
          value={String(textbox.fill ?? "#1e2440")}
          onChange={(e) => set({ fill: e.target.value })}
          className="h-9 w-full rounded-[var(--radius-md)] border border-border bg-bg"
        />
      </FieldGroup>

      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-pressed={isBold}
          aria-label={locale === "ar" ? "عريض" : "Bold"}
          onClick={() => set({ fontWeight: isBold ? "400" : "700" })}
          className={`flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border ${isBold ? "border-accent bg-accent-soft text-accent" : "border-border text-text-muted"}`}
        >
          <Bold size={14} />
        </button>
        <button
          type="button"
          aria-pressed={isItalic}
          aria-label={locale === "ar" ? "مائل" : "Italic"}
          onClick={() => set({ fontStyle: isItalic ? "normal" : "italic" })}
          className={`flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border ${isItalic ? "border-accent bg-accent-soft text-accent" : "border-border text-text-muted"}`}
        >
          <Italic size={14} />
        </button>
        <div className="mx-1 h-5 w-px bg-border" />
        {(["left", "center", "right"] as const).map((align) => {
          const Icon =
            align === "left"
              ? AlignLeft
              : align === "center"
                ? AlignCenter
                : AlignRight;
          return (
            <button
              key={align}
              type="button"
              aria-pressed={textbox.textAlign === align}
              aria-label={align}
              onClick={() => set({ textAlign: align })}
              className={`flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border ${textbox.textAlign === align ? "border-accent bg-accent-soft text-accent" : "border-border text-text-muted"}`}
            >
              <Icon size={14} />
            </button>
          );
        })}
      </div>

      <label className="flex items-center gap-2 text-sm text-text-muted">
        <input
          type="checkbox"
          checked={textbox.direction === "rtl"}
          onChange={(e) =>
            set({
              direction: e.target.checked ? "rtl" : "ltr",
              textAlign: e.target.checked ? "right" : "left",
            })
          }
        />
        {locale === "ar"
          ? "نص عربي (من اليمين لليسار)"
          : "Arabic text (right-to-left)"}
      </label>
    </div>
  );
}
