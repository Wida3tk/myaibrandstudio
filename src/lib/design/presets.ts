export interface FormatPreset {
  id: string;
  labelEn: string;
  labelAr: string;
  width: number;
  height: number;
}

export const FORMAT_PRESETS: FormatPreset[] = [
  {
    id: "ig-post",
    labelEn: "Instagram post",
    labelAr: "منشور إنستغرام",
    width: 1080,
    height: 1080,
  },
  {
    id: "ig-story",
    labelEn: "Instagram story",
    labelAr: "ستوري إنستغرام",
    width: 1080,
    height: 1920,
  },
  {
    id: "linkedin-post",
    labelEn: "LinkedIn post",
    labelAr: "منشور لينكدإن",
    width: 1200,
    height: 627,
  },
  {
    id: "x-post",
    labelEn: "X post",
    labelAr: "منشور X",
    width: 1600,
    height: 900,
  },
  {
    id: "tiktok",
    labelEn: "TikTok cover",
    labelAr: "غلاف تيك توك",
    width: 1080,
    height: 1920,
  },
  {
    id: "custom-square",
    labelEn: "Square",
    labelAr: "مربع",
    width: 1000,
    height: 1000,
  },
];

export function getPreset(id: string): FormatPreset {
  return FORMAT_PRESETS.find((p) => p.id === id) ?? FORMAT_PRESETS[0];
}
