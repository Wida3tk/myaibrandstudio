import type { CreativeSpec, LayoutVariant } from "@/lib/creative/types";

/**
 * The automatic layout composer: turns a validated AI creative spec into a finished, concrete
 * composition — no manual positioning. Three variant builders below produce genuinely different
 * compositions (not a palette swap): which elements exist, where they sit, and how dominant the
 * background image is all change per variant. Every spec carries a `role` tag so the AI revision
 * panel (src/lib/design/revise.ts) can target "the headline" / "the logo" without knowing pixel
 * coordinates, and so undo/redo + save/reload keep working through the existing Fabric JSON stack
 * (the design page must pass ["role"] as propertiesToInclude to toJSON/toObject for these to survive).
 */

export type ComposedObjectSpec =
  | {
      role: string;
      type: "rect";
      left: number;
      top: number;
      width: number;
      height: number;
      fill: string;
      rx?: number;
      opacity?: number;
    }
  | {
      role: string;
      type: "gradient";
      left: number;
      top: number;
      width: number;
      height: number;
      colorStops: [string, string];
      angle: "vertical" | "diagonal";
    }
  | {
      role: string;
      type: "textbox";
      left: number;
      top: number;
      width: number;
      text: string;
      fontSize: number;
      fill: string;
      fontWeight?: string;
      textAlign?: "left" | "center" | "right";
      fontFamily?: string;
      direction?: "ltr" | "rtl";
      backgroundColor?: string;
      lineHeight?: number;
    }
  | {
      role: string;
      type: "image";
      left: number;
      top: number;
      width: number;
      height: number;
      src: string;
      /** cover = scale to fill the box (overflow is fine — the canvas clips it); contain = scale to fit, preserving aspect ratio, never cropped or distorted. */
      fit: "cover" | "contain";
    };

export interface ComposeInput {
  spec: CreativeSpec;
  width: number;
  height: number;
  language: "ar" | "en";
  backgroundImageUrl: string | null;
  logoUrl: string;
}

const RTL_FONT = "'Noto Sans Arabic', sans-serif";
const LTR_SERIF = "Georgia, serif";
const LTR_SANS = "Geist, sans-serif";

function textDirection(language: "ar" | "en") {
  return language === "ar"
    ? { direction: "rtl" as const, textAlign: "right" as const }
    : { direction: "ltr" as const, textAlign: "left" as const };
}

function paletteOrDefault(spec: CreativeSpec): string[] {
  return spec.colorPalette.length >= 2
    ? spec.colorPalette
    : ["#1E2440", "#6750D8"];
}

/** Scales a font size off the canvas's smaller dimension, not just width — a LinkedIn post
 * (1200x627) is much shorter than it is wide, and sizing purely off width would make headlines
 * overflow their vertical slot on wide/short formats. */
function scaledFont(width: number, height: number, fraction: number): number {
  return Math.round(Math.min(width, height) * fraction);
}

function buildEditorial({
  spec,
  width,
  height,
  language,
  backgroundImageUrl,
  logoUrl,
}: ComposeInput): ComposedObjectSpec[] {
  const margin = width * 0.08;
  const [primary, secondary] = paletteOrDefault(spec);
  const { direction, textAlign } = textDirection(language);
  const specs: ComposedObjectSpec[] = [];

  specs.push(
    backgroundImageUrl
      ? {
          role: "background",
          type: "image",
          left: 0,
          top: 0,
          width,
          height,
          src: backgroundImageUrl,
          fit: "cover",
        }
      : {
          role: "background",
          type: "gradient",
          left: 0,
          top: 0,
          width,
          height,
          colorStops: [primary, secondary],
          angle: "diagonal",
        },
  );

  // Dark overlay over the lower third so white text stays readable over any photo.
  specs.push({
    role: "overlay",
    type: "gradient",
    left: 0,
    top: height * 0.55,
    width,
    height: height * 0.45,
    colorStops: ["#00000000", "#000000B3"],
    angle: "vertical",
  });

  if (logoUrl) {
    const logoBox = width * 0.12;
    specs.push({
      role: "logo",
      type: "image",
      left: margin,
      top: margin,
      width: logoBox,
      height: logoBox,
      src: logoUrl,
      fit: "contain",
    });
  }

  specs.push({
    role: "headline",
    type: "textbox",
    left: margin,
    top: height * 0.68,
    width: width - margin * 2,
    text: spec.headline,
    fontSize: scaledFont(width, height, 0.075),
    fill: "#F8F6F2",
    fontWeight: "600",
    fontFamily: LTR_SERIF,
    textAlign,
    direction,
    lineHeight: 1.12,
  });

  specs.push({
    role: "body",
    type: "textbox",
    left: margin,
    top: height * 0.84,
    width: width - margin * 2,
    text: spec.supportingCopy,
    fontSize: scaledFont(width, height, 0.028),
    fill: "#E5E2DC",
    fontFamily: direction === "rtl" ? RTL_FONT : LTR_SANS,
    textAlign,
    direction,
  });

  specs.push({
    role: "cta",
    type: "textbox",
    left: margin,
    top: height * 0.925,
    width: width - margin * 2,
    text: `${spec.cta} →`,
    fontSize: scaledFont(width, height, 0.028),
    fill: secondary,
    fontWeight: "700",
    fontFamily: direction === "rtl" ? RTL_FONT : LTR_SANS,
    textAlign,
    direction,
  });

  return specs;
}

function buildBold({
  spec,
  width,
  height,
  language,
  backgroundImageUrl,
  logoUrl,
}: ComposeInput): ComposedObjectSpec[] {
  const margin = width * 0.07;
  const [primary, secondary] = paletteOrDefault(spec);
  const { direction, textAlign } = textDirection(language);
  const imageHeight = height * 0.58;
  const specs: ComposedObjectSpec[] = [];

  specs.push(
    backgroundImageUrl
      ? {
          role: "background",
          type: "image",
          left: 0,
          top: 0,
          width,
          height: imageHeight,
          src: backgroundImageUrl,
          fit: "cover",
        }
      : {
          role: "background",
          type: "gradient",
          left: 0,
          top: 0,
          width,
          height: imageHeight,
          colorStops: [primary, secondary],
          angle: "diagonal",
        },
  );

  specs.push({
    role: "color-block",
    type: "rect",
    left: 0,
    top: imageHeight,
    width,
    height: height - imageHeight,
    fill: primary,
  });

  if (logoUrl) {
    const logoBox = width * 0.13;
    specs.push({
      role: "logo",
      type: "image",
      left: width - margin - logoBox,
      top: margin,
      width: logoBox,
      height: logoBox,
      src: logoUrl,
      fit: "contain",
    });
  }

  const boldHeadlineFontSize = scaledFont(width, height, 0.1);
  specs.push({
    role: "headline",
    type: "textbox",
    left: margin,
    top: imageHeight + height * 0.04,
    width: width - margin * 2,
    text: spec.headline,
    fontSize: boldHeadlineFontSize,
    fill: "#FFFFFF",
    fontWeight: "800",
    fontFamily: direction === "rtl" ? RTL_FONT : LTR_SANS,
    textAlign,
    direction,
    lineHeight: 1.05,
  });

  specs.push({
    role: "body",
    type: "textbox",
    left: margin,
    top: imageHeight + height * 0.04 + boldHeadlineFontSize * 2.3,
    width: width - margin * 2,
    text: spec.supportingCopy,
    fontSize: scaledFont(width, height, 0.032),
    fill: "#FFFFFFCC",
    fontFamily: direction === "rtl" ? RTL_FONT : LTR_SANS,
    textAlign,
    direction,
  });

  specs.push({
    role: "cta",
    type: "textbox",
    left: margin,
    top: height * 0.92,
    width: width * 0.4,
    text: `  ${spec.cta}  `,
    fontSize: scaledFont(width, height, 0.032),
    fill: primary,
    fontWeight: "800",
    backgroundColor: "#FFFFFF",
    fontFamily: direction === "rtl" ? RTL_FONT : LTR_SANS,
    textAlign: "center",
    direction,
  });

  return specs;
}

function buildMinimal({
  spec,
  width,
  height,
  language,
  backgroundImageUrl,
  logoUrl,
}: ComposeInput): ComposedObjectSpec[] {
  const margin = width * 0.1;
  const [primary, secondary] = paletteOrDefault(spec);
  const { direction, textAlign } = textDirection(language);
  const rtl = direction === "rtl";
  // Mirror the whole composition for RTL so the image card stays on the reading-start side.
  const cardLeft = rtl ? margin : width * 0.52;
  const cardWidth = width * 0.4;
  const textLeft = rtl ? width * 0.45 : margin;
  const textWidth = width - margin - width * 0.52 + margin * 0.2;
  const specs: ComposedObjectSpec[] = [];

  specs.push({
    role: "background",
    type: "rect",
    left: 0,
    top: 0,
    width,
    height,
    fill: "#FBFAF7",
  });

  specs.push(
    backgroundImageUrl
      ? {
          role: "background-accent",
          type: "image",
          left: cardLeft,
          top: height * 0.12,
          width: cardWidth,
          height: height * 0.76,
          src: backgroundImageUrl,
          fit: "contain",
        }
      : {
          role: "background-accent",
          type: "gradient",
          left: cardLeft,
          top: height * 0.12,
          width: cardWidth,
          height: height * 0.76,
          colorStops: [primary, secondary],
          angle: "diagonal",
        },
  );

  specs.push({
    role: "headline",
    type: "textbox",
    left: textLeft,
    top: height * 0.3,
    width: textWidth,
    text: spec.headline,
    fontSize: scaledFont(width, height, 0.052),
    fill: "#1E2440",
    fontWeight: "500",
    fontFamily: direction === "rtl" ? RTL_FONT : LTR_SANS,
    textAlign,
    direction,
    lineHeight: 1.2,
  });

  specs.push({
    role: "body",
    type: "textbox",
    left: textLeft,
    top: height * 0.52,
    width: textWidth,
    text: spec.supportingCopy,
    fontSize: scaledFont(width, height, 0.026),
    fill: "#5B5F78",
    fontFamily: direction === "rtl" ? RTL_FONT : LTR_SANS,
    textAlign,
    direction,
  });

  specs.push({
    role: "cta",
    type: "textbox",
    left: textLeft,
    top: height * 0.68,
    width: textWidth,
    text: rtl ? `← ${spec.cta}` : `${spec.cta} →`,
    fontSize: scaledFont(width, height, 0.026),
    fill: primary,
    fontWeight: "600",
    fontFamily: direction === "rtl" ? RTL_FONT : LTR_SANS,
    textAlign,
    direction,
  });

  if (logoUrl) {
    const logoBox = width * 0.1;
    specs.push({
      role: "logo",
      type: "image",
      left: width / 2 - logoBox / 2,
      top: height * 0.92,
      width: logoBox,
      height: logoBox * 0.5,
      src: logoUrl,
      fit: "contain",
    });
  }

  return specs;
}

const BUILDERS: Record<
  LayoutVariant,
  (input: ComposeInput) => ComposedObjectSpec[]
> = {
  editorial: buildEditorial,
  bold: buildBold,
  minimal: buildMinimal,
};

export function composeLayout(
  variant: LayoutVariant,
  input: ComposeInput,
): ComposedObjectSpec[] {
  return BUILDERS[variant](input);
}
