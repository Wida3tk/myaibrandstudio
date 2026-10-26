import type { Canvas, FabricObject, Textbox } from "fabric";
import type { CanvasObjectSummary, EditOp } from "@/lib/creative/generate";

function roleOf(obj: FabricObject): string | undefined {
  return (obj as FabricObject & { role?: string }).role;
}

/** Only role-tagged objects (i.e. ones the AI layout composer created) are summarized — a
 * manually added object with no role simply can't be targeted by a revision instruction. */
export function summarizeCanvas(canvas: Canvas): CanvasObjectSummary[] {
  const summaries: CanvasObjectSummary[] = [];
  for (const obj of canvas.getObjects()) {
    const role = roleOf(obj);
    if (!role) continue;
    const type = obj.type as CanvasObjectSummary["type"];
    if (type !== "textbox" && type !== "rect" && type !== "image") continue;
    summaries.push({
      role,
      type,
      text: type === "textbox" ? (obj as Textbox).text : undefined,
      fontSize: type === "textbox" ? (obj as Textbox).fontSize : undefined,
      fill: typeof obj.fill === "string" ? obj.fill : undefined,
      left: obj.left ?? 0,
      top: obj.top ?? 0,
      width: obj.getScaledWidth(),
      height: obj.getScaledHeight(),
    });
  }
  return summaries;
}

const ALLOWED_PROP_KEYS = new Set([
  "text",
  "fill",
  "fontSize",
  "fontWeight",
  "left",
  "top",
  "width",
  "height",
  "textAlign",
  "opacity",
  "visible",
  "scaleX",
  "scaleY",
]);

/** Applies AI-translated edit ops to the matching role-tagged objects — unknown roles/props are
 * silently dropped (defense in depth on top of the Worker's own zod .strict() allowlist). */
export function applyEditOps(canvas: Canvas, ops: EditOp[]): string[] {
  const appliedRoles: string[] = [];
  for (const op of ops) {
    if (op.action !== "set") continue;
    const targets = canvas.getObjects().filter((o) => roleOf(o) === op.role);
    if (targets.length === 0) continue;
    const safeProps = Object.fromEntries(
      Object.entries(op.props).filter(([key]) => ALLOWED_PROP_KEYS.has(key)),
    );
    if (Object.keys(safeProps).length === 0) continue;
    for (const target of targets) {
      target.set(safeProps);
      target.setCoords();
    }
    appliedRoles.push(op.role);
  }
  canvas.requestRenderAll();
  return appliedRoles;
}
