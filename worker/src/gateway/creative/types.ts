export type Language = "ar" | "en";

/** Mirrors the design-page format preset ids in src/lib/design/presets.ts. */
export type PlatformId =
  | "ig-post"
  | "ig-story"
  | "linkedin-post"
  | "x-post"
  | "tiktok"
  | "custom-square";

export interface CreativeBriefRequest {
  orgId: string;
  brandId: string;
  objective: string;
  platform: PlatformId;
  language: Language;
  width: number;
  height: number;
  style?: string;
  audienceOverride?: string;
  requiredText?: string;
  customInstructions?: string;
  brandName: string;
  brandVoice: string;
  brandAudience: string;
  brandMemoryFacts: string[];
  brandPrimaryColor: string;
  brandHasLogo: boolean;
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

export interface CreativeGenerationResult {
  spec: CreativeSpec;
  provider: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
}
