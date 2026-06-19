export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export function formatApiError(error: unknown): string {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return 'Request timed out. If this is the first run, wait for the Whisper model to finish downloading.';
  }
  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    return `Cannot reach VoiceBridge backend at ${API_BASE}. Start the backend first (port 3001) — do not run frontend on port 3001.`;
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
  transcriptionMode?: 'whisper' | 'demo';
  createdAt: string;
  updatedAt: string;
}

export interface TranscribeResult {
  id: string;
  text: string;
  sourceLanguage: string;
  mode: 'whisper' | 'demo';
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

export async function getHealth(): Promise<HealthStatus | null> {
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function checkHealth(): Promise<boolean> {
  const health = await getHealth();
  return health?.status === 'ok';
}

export async function getLanguages(): Promise<Language[]> {
  const res = await fetch(`${API_BASE}/transcripts`);
  if (!res.ok) throw new Error('Failed to fetch languages');
  const data = await res.json();
  return data.languages;
}

export async function getTranscripts(): Promise<Transcript[]> {
  const res = await fetch(`${API_BASE}/transcripts`);
  if (!res.ok) throw new Error('Failed to fetch transcripts');
  const data = await res.json();
  return data.transcripts;
}

export async function getTranscript(id: string): Promise<Transcript> {
  const res = await fetch(`${API_BASE}/transcripts/${id}`);
  if (!res.ok) throw new Error('Transcript not found');
  return res.json();
}

export async function saveTextTranscript(
  language: string,
  text: string,
): Promise<TranscribeResult> {
  const res = await fetch(`${API_BASE}/transcribe/save-text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language, text: text.trim() }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = Array.isArray(err.message)
      ? err.message.join(', ')
      : err.message;
    throw new Error(message ?? 'Failed to save transcript');
  }
  return res.json();
}

export async function transcribeAudio(
  audio: Blob,
  language: string,
  browserText?: string,
): Promise<TranscribeResult> {
  const form = new FormData();
  form.append('audio', audio, 'recording.webm');
  form.append('language', language);
  if (browserText?.trim()) {
    form.append('browserText', browserText.trim());
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5 * 60 * 1000);

  try {
    const res = await fetch(`${API_BASE}/transcribe`, {
      method: 'POST',
      body: form,
      signal: controller.signal,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const message = Array.isArray(err.message)
        ? err.message.join(', ')
        : err.message;
      throw new Error(message ?? 'Transcription failed');
    }
    return res.json();
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(formatApiError(error));
    }
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

  const res = await fetch(`${API_BASE}/transcribe/preview`, {
    method: 'POST',
    body: form,
    signal,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = Array.isArray(err.message)
      ? err.message.join(', ')
      : err.message;
    throw new Error(message ?? 'Live preview failed');
  }

  return res.json();
}

export async function translateText(
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
  transcriptId?: string,
): Promise<TranslateResult> {
  const res = await fetch(`${API_BASE}/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, sourceLanguage, targetLanguage, transcriptId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? 'Translation failed');
  }
  return res.json();
}

export async function translateTranscript(
  transcriptId: string,
  targetLanguage: string,
): Promise<TranslateResult> {
  const res = await fetch(`${API_BASE}/translate/transcript`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcriptId, targetLanguage }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? 'Translation failed');
  }
  return res.json();
}
