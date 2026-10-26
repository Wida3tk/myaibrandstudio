// Real voiceover generation. Primary: Groq TTS (console.groq.com/docs/text-to-speech) — reuses
// the SAME GROQ_API_KEY already configured for text generation, no new signup, and is the only
// provider research found that is simultaneously free, no-card, bilingual Arabic+English, and
// callable with plain fetch() from a Workers runtime (see docs/14-video-pipeline-setup.md).
// Fallback: Cloudflare Workers AI `melotts` — same already-verified free/no-training account as
// the Flux image model, but English-only (no Arabic voice), so it only ever covers English scripts.
//
// NOT independently verified against a live account from this sandbox (no API keys available) —
// implemented strictly against each provider's documented request/response shape. Two specific
// details need confirming before relying on this in production:
//   1. The exact valid `voice` names for Groq's canopylabs/orpheus-* models (not found in the
//      research pass — placeholders below, verify at console.groq.com/docs/text-to-speech).
//   2. Groq's GroqCloud Services Agreement's commercial-use terms for free-tier audio output
//      (the public groq.com Terms of Use explicitly say they do NOT cover API usage) — confirm
//      before shipping Groq-voiced videos commercially.

export interface VoiceoverResult {
  base64: string;
  mimeType: string;
  provider: "groq" | "cloudflare-workers-ai";
}

export class VoiceoverProviderUnavailableError extends Error {}

const GROQ_MODEL: Record<"ar" | "en", string> = {
  ar: "canopylabs/orpheus-arabic-saudi",
  en: "canopylabs/orpheus-v1-english",
};

// Placeholder voice names — Groq's docs for these specific models didn't surface a confirmed
// voice list during research. Verify at console.groq.com/docs/text-to-speech before relying on
// this; an invalid voice name will make generateVoiceover throw (and voiceover falls back to
// silence client-side), not silently produce wrong audio.
const GROQ_VOICE: Record<"ar" | "en", string> = {
  ar: "layla",
  en: "austin",
};

async function arrayBufferToBase64(buffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++)
    binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function generateGroqVoiceover(
  apiKey: string,
  text: string,
  language: "ar" | "en",
): Promise<VoiceoverResult> {
  const res = await fetch("https://api.groq.com/openai/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL[language],
      input: text,
      voice: GROQ_VOICE[language],
      response_format: "wav",
    }),
  });

  if (!res.ok) {
    throw new Error(
      `Groq TTS request failed: ${res.status} ${await res.text()}`,
    );
  }

  const base64 = await arrayBufferToBase64(await res.arrayBuffer());
  return { base64, mimeType: "audio/wav", provider: "groq" };
}

interface CloudflareAIAudioResponse {
  success: boolean;
  errors?: { message: string }[];
  result?: { audio?: string };
}

async function generateMeloTTSVoiceover(
  env: { CF_ACCOUNT_ID: string; CF_API_TOKEN: string },
  text: string,
): Promise<VoiceoverResult> {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/ai/run/@cf/myshell-ai/melotts`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.CF_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt: text, lang: "en" }),
    },
  );

  if (!res.ok) {
    throw new Error(
      `Workers AI TTS request failed: ${res.status} ${await res.text()}`,
    );
  }

  const data = (await res.json()) as CloudflareAIAudioResponse;
  if (!data.success || !data.result?.audio) {
    throw new Error(
      `Workers AI TTS request unsuccessful: ${data.errors?.map((e) => e.message).join("; ") ?? "no audio in response"}`,
    );
  }

  return {
    base64: data.result.audio,
    mimeType: "audio/mpeg",
    provider: "cloudflare-workers-ai",
  };
}

/** Groq first (bilingual) -> Cloudflare melotts (English-only fallback) -> throws
 * VoiceoverProviderUnavailableError when nothing is configured or both fail, so callers can
 * render without a voiceover track rather than fake one. */
export async function generateVoiceover(
  env: { GROQ_API_KEY: string; CF_ACCOUNT_ID: string; CF_API_TOKEN: string },
  text: string,
  language: "ar" | "en",
): Promise<VoiceoverResult> {
  const attempts: string[] = [];

  if (env.GROQ_API_KEY) {
    try {
      return await generateGroqVoiceover(env.GROQ_API_KEY, text, language);
    } catch (error) {
      attempts.push(`groq: ${String(error)}`);
    }
  }

  if (language === "en" && env.CF_ACCOUNT_ID && env.CF_API_TOKEN) {
    try {
      return await generateMeloTTSVoiceover(env, text);
    } catch (error) {
      attempts.push(`cloudflare-workers-ai: ${String(error)}`);
    }
  }

  throw new VoiceoverProviderUnavailableError(
    attempts.length > 0
      ? `All voiceover providers failed: ${attempts.join("; ")}`
      : "No voiceover provider is configured.",
  );
}
