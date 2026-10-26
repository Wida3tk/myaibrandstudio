import { uploadToCloudinary } from "@/lib/assets/cloudinary";
import { createAsset } from "@/lib/assets/data";
import { composeLayout } from "@/lib/design/compose";
import {
  applyComposedSpecs,
  LAYOUT_PROPERTIES_TO_INCLUDE,
  stripUndefinedDeep,
} from "@/lib/design/apply-layout";
import {
  LAYOUT_VARIANTS,
  type CreativeBrief,
  type CreativeSpec,
  type DesignVariation,
} from "./types";
import { generateBackgroundImage, generateCreativeSpec } from "./generate";

function base64ToFile(
  base64: string,
  mimeType: string,
  filename: string,
): File {
  const bytes = atob(base64);
  const buffer = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) buffer[i] = bytes.charCodeAt(i);
  return new File([buffer], filename, { type: mimeType });
}

export interface PipelineResult {
  spec: CreativeSpec;
  backgroundImageUrl: string | null;
  imageProviderAvailable: boolean;
}

/** Steps 2+3: brief -> validated creative spec -> (if available) one real generated background
 * image, uploaded through the same Cloudinary asset pipeline the Design Studio already uses —
 * never a second, parallel storage path. */
export async function runCreativeDirector(
  orgId: string,
  brandId: string,
  uid: string,
  brief: CreativeBrief,
  dimensions: { width: number; height: number },
): Promise<PipelineResult> {
  const { spec } = await generateCreativeSpec(
    orgId,
    brandId,
    brief,
    dimensions,
  );

  const imagePrompt = spec.imagePrompts[0];
  if (!imagePrompt) {
    return { spec, backgroundImageUrl: null, imageProviderAvailable: false };
  }

  const image = await generateBackgroundImage(orgId, brandId, imagePrompt);
  if (!image.available || !image.base64 || !image.mimeType) {
    return { spec, backgroundImageUrl: null, imageProviderAvailable: false };
  }

  const file = base64ToFile(
    image.base64,
    image.mimeType,
    `creative-bg-${Date.now()}.jpg`,
  );
  const uploaded = await uploadToCloudinary(file);
  await createAsset(orgId, brandId, uid, {
    url: uploaded.url,
    publicId: uploaded.publicId,
    kind: "image",
  });

  return {
    spec,
    backgroundImageUrl: uploaded.url,
    imageProviderAvailable: true,
  };
}

/** Step 4+5: renders all 3 layout variants off-screen and returns them as selectable thumbnails —
 * none of this touches the interactive canvas until the user picks one. */
export async function buildDesignVariations(
  spec: CreativeSpec,
  dimensions: { width: number; height: number },
  language: "ar" | "en",
  backgroundImageUrl: string | null,
  logoUrl: string,
): Promise<DesignVariation[]> {
  const fabric = await import("fabric");
  const variations: DesignVariation[] = [];

  for (const variant of LAYOUT_VARIANTS) {
    const canvasEl = document.createElement("canvas");
    const canvas = new fabric.StaticCanvas(canvasEl, {
      width: dimensions.width,
      height: dimensions.height,
    });
    const specs = composeLayout(variant, {
      spec,
      width: dimensions.width,
      height: dimensions.height,
      language,
      backgroundImageUrl,
      logoUrl,
    });
    await applyComposedSpecs(canvas, fabric, specs);

    variations.push({
      id: `${variant}-${Date.now()}`,
      layoutVariant: variant,
      fabricJson: stripUndefinedDeep(
        canvas.toObject(LAYOUT_PROPERTIES_TO_INCLUDE),
      ),
      previewDataUrl: canvas.toDataURL({ format: "png", multiplier: 1 }),
    });
    await canvas.dispose();
  }

  return variations;
}
