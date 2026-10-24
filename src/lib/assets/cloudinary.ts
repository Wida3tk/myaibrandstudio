// Unsigned client-side upload — no server/Worker involved, no secret key (an unsigned preset is
// meant to be public, like the Firebase web config). See docs/09-cloudinary-setup.md.
// https://cloudinary.com/documentation/client_side_uploading

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  resourceType: "image" | "video" | "raw" | "auto";
}

function requiredEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy .env.example to .env.local and fill in your Cloudinary cloud name/preset (see docs/09-cloudinary-setup.md).`,
    );
  }
  return value;
}

export async function uploadToCloudinary(
  file: File,
): Promise<CloudinaryUploadResult> {
  const cloudName = requiredEnv(
    "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME",
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  );
  const uploadPreset = requiredEnv(
    "NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET",
    process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
  );

  const body = new FormData();
  body.append("file", file);
  body.append("upload_preset", uploadPreset);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
    { method: "POST", body },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cloudinary upload failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as {
    secure_url: string;
    public_id: string;
    resource_type: "image" | "video" | "raw" | "auto";
  };

  return {
    url: data.secure_url,
    publicId: data.public_id,
    resourceType: data.resource_type,
  };
}
