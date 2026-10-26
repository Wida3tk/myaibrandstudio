/** Shared by the image and video creative pipelines — both convert a Worker's base64-encoded AI
 * output (image/audio bytes) into a File before handing it to uploadToCloudinary. */
export function base64ToFile(
  base64: string,
  mimeType: string,
  filename: string,
): File {
  const bytes = atob(base64);
  const buffer = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) buffer[i] = bytes.charCodeAt(i);
  return new File([buffer], filename, { type: mimeType });
}
