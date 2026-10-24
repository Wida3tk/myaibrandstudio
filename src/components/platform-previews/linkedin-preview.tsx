import { formattedHashtags, initial, type PreviewProps } from "./types";

export function LinkedInPreview({
  brandName,
  content,
  language,
}: PreviewProps) {
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
        <div>
          <p className="text-sm font-semibold text-text">{brandName}</p>
          <p className="text-xs text-text-muted">Brand Page · 1st</p>
        </div>
      </div>

      <p className="mt-3 text-sm font-medium text-text">{content.hook}</p>
      <p className="mt-2 text-sm text-text">{content.caption}</p>
      {content.hashtags.length > 0 && (
        <p className="mt-2 text-sm text-accent">
          {formattedHashtags(content.hashtags)}
        </p>
      )}

      <div className="mt-3 flex gap-6 border-t border-border pt-2 text-xs text-text-muted">
        <span>👍 Like</span>
        <span>💬 Comment</span>
        <span>↗ Share</span>
      </div>
    </div>
  );
}
