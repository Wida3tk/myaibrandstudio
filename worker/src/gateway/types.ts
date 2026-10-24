export type ContentType =
  "post" | "hook" | "caption" | "script" | "calendar-note";
export type Language = "ar" | "en";

export interface GenerationRequest {
  orgId: string;
  brandId: string;
  contentType: ContentType;
  language: Language;
  brandVoice: string;
  brandAudience: string;
  brandMemoryFacts: string[];
  topic: string;
}

export interface GenerationResult {
  text: string;
  structured: Record<string, unknown>;
  provider: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
}

export interface AIProvider {
  id: string;
  generate(req: GenerationRequest): Promise<GenerationResult>;
}
