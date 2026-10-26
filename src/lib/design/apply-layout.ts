import type { FabricImage, FabricObject, StaticCanvas } from "fabric";
import type { ComposedObjectSpec } from "./compose";

/** Extra per-object property the design page must pass to canvas.toObject() (not toJSON() —
 * that method takes no arguments) so roles survive undo/redo and save/reload — see compose.ts's
 * module doc. */
export const LAYOUT_PROPERTIES_TO_INCLUDE = ["role"];

/** Fabric v7 defaults every object's origin to its CENTER, not its top-left corner (a breaking
 * change from older Fabric versions) — so `left`/`top` alone would place an object's center at
 * that point, not its corner. compose.ts's math assumes top-left placement throughout, so every
 * object this module creates must pin its origin explicitly. */
const TOP_LEFT_ORIGIN = { originX: "left", originY: "top" } as const;

/** Fabric's own toObject() unconditionally includes several properties (e.g. a Textbox's `path`,
 * a Gradient's `gradientTransform`) as literal `undefined` when unset — harmless for
 * JSON.stringify (used for the undo/redo history) but fatal for Firestore's addDoc/updateDoc,
 * which reject any undefined value anywhere in the payload. Run canvas.toObject()'s result
 * through this before writing it to Firestore. */
export function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedDeep(item)) as T;
  }
  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) result[key] = stripUndefinedDeep(v);
    }
    return result as T;
  }
  return value;
}

function tagRole<T extends FabricObject>(object: T, role: string): T {
  object.set("role", role);
  return object;
}

async function fitImage(
  image: FabricImage,
  fabric: typeof import("fabric"),
  box: { left: number; top: number; width: number; height: number },
  fit: "cover" | "contain",
) {
  const natW = image.width || box.width;
  const natH = image.height || box.height;
  const scale =
    fit === "cover"
      ? Math.max(box.width / natW, box.height / natH)
      : Math.min(box.width / natW, box.height / natH);
  const scaledW = natW * scale;
  const scaledH = natH * scale;
  image.set({
    scaleX: scale,
    scaleY: scale,
    left: box.left + (box.width - scaledW) / 2,
    top: box.top + (box.height - scaledH) / 2,
  });
  if (fit === "cover") {
    image.clipPath = new fabric.Rect({
      ...TOP_LEFT_ORIGIN,
      left: box.left,
      top: box.top,
      width: box.width,
      height: box.height,
      absolutePositioned: true,
    });
  }
}

/** Applies composed layout specs onto an already-cleared canvas, in order (later = on top). */
export async function applyComposedSpecs(
  canvas: StaticCanvas,
  fabric: typeof import("fabric"),
  specs: ComposedObjectSpec[],
): Promise<void> {
  for (const spec of specs) {
    if (spec.type === "rect") {
      canvas.add(
        tagRole(
          new fabric.Rect({
            ...TOP_LEFT_ORIGIN,
            left: spec.left,
            top: spec.top,
            width: spec.width,
            height: spec.height,
            fill: spec.fill,
            rx: spec.rx ?? 0,
            ry: spec.rx ?? 0,
            opacity: spec.opacity ?? 1,
          }),
          spec.role,
        ),
      );
    } else if (spec.type === "gradient") {
      const [from, to] = spec.colorStops;
      const coords =
        spec.angle === "vertical"
          ? { x1: 0, y1: 0, x2: 0, y2: 1 }
          : { x1: 0, y1: 0, x2: 1, y2: 1 };
      const gradient = new fabric.Gradient({
        type: "linear",
        gradientUnits: "percentage",
        coords,
        colorStops: [
          { offset: 0, color: from },
          { offset: 1, color: to },
        ],
      });
      canvas.add(
        tagRole(
          new fabric.Rect({
            ...TOP_LEFT_ORIGIN,
            left: spec.left,
            top: spec.top,
            width: spec.width,
            height: spec.height,
            fill: gradient,
          }),
          spec.role,
        ),
      );
    } else if (spec.type === "textbox") {
      canvas.add(
        tagRole(
          new fabric.Textbox(spec.text, {
            ...TOP_LEFT_ORIGIN,
            left: spec.left,
            top: spec.top,
            width: spec.width,
            fontSize: spec.fontSize,
            fill: spec.fill,
            fontWeight: spec.fontWeight ?? "400",
            textAlign: spec.textAlign ?? "left",
            direction: spec.direction ?? "ltr",
            fontFamily: spec.fontFamily ?? "Geist, sans-serif",
            // Fabric stores whatever is passed here as an own property, including `undefined` —
            // and Firestore's addDoc rejects any undefined value nested in the saved fabricJson,
            // so this key must be omitted entirely rather than set to undefined.
            ...(spec.backgroundColor
              ? { backgroundColor: spec.backgroundColor }
              : {}),
            lineHeight: spec.lineHeight ?? 1.16,
          }),
          spec.role,
        ),
      );
    } else {
      try {
        const image = await fabric.FabricImage.fromURL(spec.src, {
          crossOrigin: "anonymous",
          ...TOP_LEFT_ORIGIN,
        });
        await fitImage(image, fabric, spec, spec.fit);
        canvas.add(tagRole(image, spec.role));
      } catch {
        // A single broken image URL (e.g. a revoked data URL) shouldn't blank the whole
        // composition — skip it and leave the rest of the layout intact.
      }
    }
  }
  canvas.requestRenderAll();
}
