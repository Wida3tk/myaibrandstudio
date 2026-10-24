import type { GeneratedContent } from "@/lib/ai/generate";
import type { Language } from "@/lib/ai/types";

export interface PreviewProps {
  brandName: string;
  content: GeneratedContent;
  language: Language;
}

export function formattedHashtags(hashtags: string[]): string {
  return hashtags.map((tag) => `#${tag.replace(/^#/, "")}`).join(" ");
}

export function initial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}
