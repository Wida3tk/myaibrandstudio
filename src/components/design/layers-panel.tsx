"use client";

import { Eye, EyeOff, ChevronUp, ChevronDown, Trash2 } from "lucide-react";
import type { Canvas, FabricObject } from "fabric";
import { useLocale } from "@/components/locale-provider";

function describeObject(obj: FabricObject): string {
  if (obj.type === "textbox" && "text" in obj) {
    const text = (obj as unknown as { text: string }).text;
    return text.slice(0, 24) || "Text";
  }
  if (obj.type === "image") return "Image";
  if (obj.type === "rect") return "Rectangle";
  return obj.type ?? "Object";
}

export function LayersPanel({
  canvas,
  version,
  activeObject,
  onChange,
}: {
  canvas: Canvas;
  version: number;
  activeObject: FabricObject | null;
  onChange: () => void;
}) {
  const { locale } = useLocale();
  // version intentionally forces this list to recompute after canvas mutations.
  void version;
  const objects = [...canvas.getObjects()].reverse();

  if (objects.length === 0) {
    return (
      <p className="text-sm text-text-muted">
        {locale === "ar" ? "لا توجد عناصر بعد" : "No objects yet"}
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-1">
      {objects.map((obj, i) => {
        const selected = obj === activeObject;
        return (
          <li
            key={i}
            className={`flex items-center gap-1.5 rounded-[var(--radius-sm)] px-2 py-1.5 text-sm ${
              selected ? "bg-accent-soft text-accent" : "text-text hover:bg-surface-raised"
            }`}
          >
            <button
              type="button"
              className="flex-1 truncate text-start"
              onClick={() => {
                canvas.setActiveObject(obj);
                canvas.requestRenderAll();
                onChange();
              }}
            >
              {describeObject(obj)}
            </button>
            <button
              type="button"
              aria-label={locale === "ar" ? "إظهار/إخفاء" : "Toggle visibility"}
              onClick={() => {
                obj.set({ visible: !obj.visible });
                canvas.requestRenderAll();
                onChange();
              }}
              className="text-text-muted hover:text-text"
            >
              {obj.visible === false ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
            <button
              type="button"
              aria-label={locale === "ar" ? "طبقة للأمام" : "Bring forward"}
              onClick={() => {
                canvas.bringObjectForward(obj);
                canvas.requestRenderAll();
                onChange();
              }}
              className="text-text-muted hover:text-text"
            >
              <ChevronUp size={14} />
            </button>
            <button
              type="button"
              aria-label={locale === "ar" ? "طبقة للخلف" : "Send backward"}
              onClick={() => {
                canvas.sendObjectBackwards(obj);
                canvas.requestRenderAll();
                onChange();
              }}
              className="text-text-muted hover:text-text"
            >
              <ChevronDown size={14} />
            </button>
            <button
              type="button"
              aria-label={locale === "ar" ? "حذف" : "Delete"}
              onClick={() => {
                canvas.remove(obj);
                canvas.requestRenderAll();
                onChange();
              }}
              className="text-text-muted hover:text-danger"
            >
              <Trash2 size={14} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
