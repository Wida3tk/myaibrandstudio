const ALLOWED_TYPE_PREFIXES = ["image/", "video/"];
const MAX_BYTES = 20 * 1024 * 1024; // 20MB — generous for social assets, friendly to a free tier

export function validateAssetFile(file: {
  type: string;
  size: number;
}): string | null {
  if (!ALLOWED_TYPE_PREFIXES.some((prefix) => file.type.startsWith(prefix))) {
    return "Only image or video files are allowed.";
  }
  if (file.size > MAX_BYTES) {
    return "File is too large (max 20MB).";
  }
  return null;
}

export function assetKindFromMimeType(mimeType: string): "image" | "video" {
  return mimeType.startsWith("video/") ? "video" : "image";
}
