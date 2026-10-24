import type { Platform } from "@/lib/content/schema";
import { InstagramPreview } from "./instagram-preview";
import { XPreview } from "./x-preview";
import { LinkedInPreview } from "./linkedin-preview";
import { TikTokPreview } from "./tiktok-preview";
import type { PreviewProps } from "./types";

export const PLATFORM_LABEL: Record<Platform, string> = {
  instagram: "Instagram",
  x: "X",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
};

const PREVIEW_COMPONENT: Record<
  Platform,
  (props: PreviewProps) => React.JSX.Element
> = {
  instagram: InstagramPreview,
  x: XPreview,
  linkedin: LinkedInPreview,
  tiktok: TikTokPreview,
};

export function PlatformPreview({
  platform,
  ...props
}: PreviewProps & { platform: Platform }) {
  const Component = PREVIEW_COMPONENT[platform];
  return <Component {...props} />;
}
