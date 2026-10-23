import { httpsCallable } from "firebase/functions";
import { getFirebaseFunctions } from "@/lib/firebase/client";
import type { ContentType, Language } from "./types";

export interface GenerateContentInput {
  orgId: string;
  brandId: string;
  contentType: ContentType;
  language: Language;
  topic: string;
}

export interface GeneratedContent {
  hook: string;
  caption: string;
  hashtags: string[];
  callToAction: string;
}

export interface GenerateContentOutput {
  structured: GeneratedContent;
  provider: string;
}

export async function generateContent(
  input: GenerateContentInput,
): Promise<GenerateContentOutput> {
  const callable = httpsCallable<GenerateContentInput, GenerateContentOutput>(
    getFirebaseFunctions(),
    "generateContent",
  );
  const result = await callable(input);
  return result.data;
}
