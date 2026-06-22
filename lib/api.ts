const DEFAULT_API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

let runtimeApiBase: string | null = null;

/** Override API base at runtime (embed widget passes data-api-url). */
export function setApiBase(url: string) {
  runtimeApiBase = url.replace(/\/$/, '');
}

export function getApiBase(): string {
  return runtimeApiBase ?? DEFAULT_API_BASE;
}

/** @deprecated Use getApiBase() — kept for existing imports */
export const API_BASE = DEFAULT_API_BASE;

export const BACKEND_UNREACHABLE_MESSAGE =
  'VoiceBridge API is offline. Run .\\start-all.ps1 inside the Frontend or Backend folder.';

export function formatApiError(error: unknown): string {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return 'Request timed out. If this is the first run, wait for the Whisper model to finish downloading.';
  }
  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    return BACKEND_UNREACHABLE_MESSAGE;
  }
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
}

export interface Language {
  code: string;
  name: string;
  nativeName: string;
}

export interface Transcript {
  id: string;
  sourceLanguage: string;
  targetLanguage?: string;
  originalText: string;
  translatedText?: string;
  audioFilename?: string;
  transcriptionMode?: 'whisper' | 'demo' | 'live';
  createdAt: string;
  updatedAt: string;
}

export interface TranscribeResult {
  id: string;
  text: string;
  sourceLanguage: string;
  mode: 'whisper' | 'demo' | 'live';
  createdAt: string;
}

export interface TranslateResult {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  mode: 'google' | 'fallback' | 'passthrough';
  transcriptId?: string;
}

export interface HealthStatus {
  status: string;
  service: string;
  timestamp: string;
  version: string;
  engine?: {
    speechToText: 'idle' | 'loading' | 'ready' | 'error';
    model: string;
    ready: boolean;
    error: string | null;
  };
}

function isNetworkError(error: unknown): boolean {
  return error instanceof TypeError;
}

async function parseResponseError(
  res: Response,
  fallback: string,
): Promise<never> {
  const err = await res.json().catch(() => ({}));
  const message = Array.isArray(err.message)
    ? err.message.join(', ')
    : err.message;
  throw new Error(message ?? fallback);
}

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(`${getApiBase()}${path}`, init);
  } catch (error) {
    if (isNetworkError(error)) {
      throw new Error(BACKEND_UNREACHABLE_MESSAGE);
    }
    throw error;
  }
}

export async function getHealth(): Promise<HealthStatus | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  try {
    const res = await fetch(`${getApiBase()}/health`, {
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function checkHealth(): Promise<boolean> {
  const health = await getHealth();
  return health?.status === 'ok';
}

export async function getLanguages(): Promise<Language[]> {
  const res = await apiFetch('/transcripts');
  if (!res.ok) await parseResponseError(res, 'Failed to fetch languages');
  const data = await res.json();
  return data.languages;
}

export async function getTranscripts(): Promise<Transcript[]> {
  const res = await apiFetch('/transcripts');
  if (!res.ok) await parseResponseError(res, 'Failed to fetch transcripts');
  const data = await res.json();
  return data.transcripts;
}

export async function getTranscript(id: string): Promise<Transcript> {
  const res = await apiFetch(`/transcripts/${id}`);
  if (!res.ok) await parseResponseError(res, 'Transcript not found');
  return res.json();
}

export async function saveTextTranscript(
  language: string,
  text: string,
): Promise<TranscribeResult> {
  const res = await apiFetch('/transcribe/save-text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language, text: text.trim() }),
  });

  if (!res.ok) {
    await parseResponseError(res, 'Failed to save transcript');
  }
  return res.json();
}

export async function transcribeAudio(
  audio: Blob,
  language: string,
  liveHint?: string,
): Promise<TranscribeResult> {
  const form = new FormData();
  form.append('audio', audio, 'recording.webm');
  form.append('language', language);
  if (liveHint?.trim()) {
    form.append('liveHint', liveHint.trim());
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5 * 60 * 1000);

  try {
    const res = await apiFetch('/transcribe', {
      method: 'POST',
      body: form,
      signal: controller.signal,
    });

    if (!res.ok) {
      await parseResponseError(res, 'Transcription failed');
    }
    return res.json();
  } catch (error) {
    throw new Error(formatApiError(error));
  } finally {
    clearTimeout(timeout);
  }
}

export interface PreviewResult {
  text: string;
  sourceLanguage: string;
  mode: 'preview';
}

export async function previewTranscribe(
  audio: Blob,
  language: string,
  signal?: AbortSignal,
): Promise<PreviewResult> {
  const form = new FormData();
  form.append('audio', audio, 'recording.webm');
  form.append('language', language);

  const res = await apiFetch('/transcribe/preview', {
    method: 'POST',
    body: form,
    signal,
  });

  if (!res.ok) {
    await parseResponseError(res, 'Live preview failed');
  }

  return res.json();
}

export async function translateText(
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
  transcriptId?: string,
): Promise<TranslateResult> {
  const res = await apiFetch('/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, sourceLanguage, targetLanguage, transcriptId }),
  });

  if (!res.ok) {
    await parseResponseError(res, 'Translation failed');
  }
  return res.json();
}

export async function translateTranscript(
  transcriptId: string,
  targetLanguage: string,
): Promise<TranslateResult> {
  const res = await apiFetch('/translate/transcript', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcriptId, targetLanguage }),
  });

  if (!res.ok) {
    await parseResponseError(res, 'Translation failed');
  }
  return res.json();
}
