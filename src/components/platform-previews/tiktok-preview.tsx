import { formattedHashtags, initial, type PreviewProps } from "./types";

export function TikTokPreview({ brandName, content, language }: PreviewProps) {
  return (
    <div
      dir={language === "ar" ? "rtl" : "ltr"}
      lang={language}
      className="relative mx-auto aspect-[9/16] w-full max-w-[220px] overflow-hidden rounded-lg bg-black text-start"
    >
      {/* Always a dark video frame — this represents the video canvas itself, not themed UI
          chrome, so it intentionally doesn't use the light/dark tokens. */}
      <div className="absolute end-2 top-1/2 flex -translate-y-1/2 flex-col items-center gap-4 text-white">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-contrast">
          {initial(brandName)}
        </span>
        <span>♡</span>
        <span>💬</span>
        <span>↗</span>
      </div>

      <div className="absolute inset-x-0 bottom-0 ms-3 me-14 pb-4 text-white">
        <p className="text-sm font-semibold">
          @{brandName.toLowerCase().replace(/\s+/g, "")}
        </p>
        <p className="mt-1 text-sm">{content.caption}</p>
        {content.hashtags.length > 0 && (
          <p className="mt-1 text-sm opacity-90">
            {formattedHashtags(content.hashtags)}
          </p>
        )}
      </div>
    </div>
  );
}
