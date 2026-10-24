import { formattedHashtags, initial, type PreviewProps } from "./types";

export function InstagramPreview({
  brandName,
  content,
  language,
}: PreviewProps) {
  return (
    <div
      dir={language === "ar" ? "rtl" : "ltr"}
      lang={language}
      className="mx-auto w-full max-w-sm overflow-hidden rounded-lg border border-border bg-bg text-start"
    >
      <div className="flex items-center gap-2 p-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-contrast">
          {initial(brandName)}
        </span>
        <span className="text-sm font-semibold text-text">{brandName}</span>
      </div>

      <div className="flex aspect-square items-center justify-center bg-surface p-6">
        <p className="text-center font-semibold text-text">{content.hook}</p>
      </div>

      <div className="flex gap-4 px-3 pt-3 text-text-muted">
        <span>♡</span>
        <span>💬</span>
        <span>↗</span>
      </div>

      <div className="p-3 text-sm">
        <span className="font-semibold text-text">{brandName}</span>{" "}
        <span className="text-text">{content.caption}</span>
        {content.hashtags.length > 0 && (
          <p className="mt-1 text-accent">
            {formattedHashtags(content.hashtags)}
          </p>
        )}
      </div>
    </div>
  );
}
