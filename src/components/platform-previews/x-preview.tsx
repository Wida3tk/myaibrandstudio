import { formattedHashtags, initial, type PreviewProps } from "./types";

export function XPreview({ brandName, content, language }: PreviewProps) {
  return (
    <div
      dir={language === "ar" ? "rtl" : "ltr"}
      lang={language}
      className="mx-auto w-full max-w-sm rounded-lg border border-border bg-bg p-3 text-start"
    >
      <div className="flex gap-2">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-contrast">
          {initial(brandName)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1 text-sm">
            <span className="font-semibold text-text">{brandName}</span>
            <span className="text-text-muted">
              @{brandName.toLowerCase().replace(/\s+/g, "")}
            </span>
          </div>
          <p className="mt-1 text-sm text-text">{content.caption}</p>
          {content.hashtags.length > 0 && (
            <p className="mt-1 text-sm text-accent">
              {formattedHashtags(content.hashtags)}
            </p>
          )}
          <div className="mt-3 flex gap-6 text-xs text-text-muted">
            <span>💬</span>
            <span>↻</span>
            <span>♡</span>
            <span>↗</span>
          </div>
        </div>
      </div>
    </div>
  );
}
