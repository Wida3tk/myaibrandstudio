export interface TextOverlayOptions {
  text: string;
  fontSize: number;
  color: string;
  position: "top" | "center" | "bottom";
  direction: "ltr" | "rtl";
  fontFamily?: string;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Required to export the canvas (toBlob/toDataURL) without "tainting" it, since the image
    // comes from a different origin (Cloudinary). Cloudinary serves public assets with
    // permissive CORS headers, so this works for the images this app uploads.
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

/** Pure and unit-testable: greedily wraps words onto lines no wider than maxWidth. */
export function wrapText(
  measureWidth: (text: string) => number,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && measureWidth(candidate) > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function composeImageWithText(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  options: TextOverlayOptions,
): void {
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  if (!options.text.trim()) return;

  const fontSize = options.fontSize;
  ctx.font = `bold ${fontSize}px ${options.fontFamily ?? "sans-serif"}`;
  ctx.direction = options.direction;
  ctx.textAlign = options.direction === "rtl" ? "right" : "left";
  ctx.textBaseline = "middle";

  const padding = fontSize * 0.6;
  const lines = wrapText(
    (s) => ctx.measureText(s).width,
    options.text,
    canvas.width - padding * 2,
  );
  const lineHeight = fontSize * 1.3;
  const blockHeight = lines.length * lineHeight;

  let startY: number;
  if (options.position === "top") {
    startY = padding + lineHeight / 2;
  } else if (options.position === "bottom") {
    startY = canvas.height - padding - blockHeight + lineHeight / 2;
  } else {
    startY = (canvas.height - blockHeight) / 2 + lineHeight / 2;
  }

  ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
  ctx.fillRect(
    0,
    startY - lineHeight / 2 - padding / 2,
    canvas.width,
    blockHeight + padding,
  );

  ctx.fillStyle = options.color;
  const x = options.direction === "rtl" ? canvas.width - padding : padding;
  lines.forEach((line, i) => {
    ctx.fillText(line, x, startY + i * lineHeight);
  });
}

export function canvasToFile(
  canvas: HTMLCanvasElement,
  filename: string,
): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Failed to export the image."));
        return;
      }
      resolve(new File([blob], filename, { type: "image/png" }));
    }, "image/png");
  });
}
