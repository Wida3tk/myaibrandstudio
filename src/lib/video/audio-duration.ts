/** The AI script writer only estimates each scene's spoken duration — the real TTS clip often runs
 * longer (especially in Arabic), and a scene whose Series.Sequence ends before its own <Audio> clip
 * finishes cuts the narration off mid-word. Reading the real clip's duration lets buildVideoProject
 * extend the scene to actually fit it. */
export function getAudioDurationSeconds(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const url = URL.createObjectURL(file);
    const cleanup = () => URL.revokeObjectURL(url);
    audio.addEventListener("loadedmetadata", () => {
      cleanup();
      resolve(audio.duration);
    });
    audio.addEventListener("error", () => {
      cleanup();
      reject(new Error("Failed to read voiceover audio duration."));
    });
    audio.src = url;
  });
}
