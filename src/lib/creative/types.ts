import type { Language } from "@/lib/ai/types";

/** Mirrors FORMAT_PRESETS ids in src/lib/design/presets.ts. */
export type PlatformId =
  | "ig-post"
  | "ig-story"
  | "linkedin-post"
  | "x-post"
  | "tiktok"
  | "custom-square";

export interface CreativeBrief {
  objective: string;
  platform: PlatformId;
  language: Language;
  style?: string;
  audienceOverride?: string;
  requiredText?: string;
  customInstructions?: string;
}

export interface TypographyHierarchy {
  headline: string;
  body: string;
  cta: string;
}

export interface CreativeSpec {
  campaignConcept: string;
  headline: string;
  supportingCopy: string;
  cta: string;
  visualDirection: string;
  colorPalette: string[];
  imagePrompts: string[];
  layoutComposition: string;
  typographyHierarchy: TypographyHierarchy;
  platformDimensions: { width: number; height: number };
  brandConstraints: string[];
}

export type LayoutVariant = "editorial" | "bold" | "minimal";

export const LAYOUT_VARIANTS: LayoutVariant[] = ["editorial", "bold", "minimal"];

export interface DesignVariation {
  id: string;
  layoutVariant: LayoutVariant;
  /** Fabric.js canvas.toJSON() output for this variation. */
  fabricJson: Record<string, unknown>;
  previewDataUrl: string;
}

export interface Campaign {
  id: string;
  brief: CreativeBrief;
  spec: CreativeSpec;
  backgroundImageUrl: string | null;
  variations: DesignVariation[];
  selectedVariationId: string | null;
  createdBy: string;
}
