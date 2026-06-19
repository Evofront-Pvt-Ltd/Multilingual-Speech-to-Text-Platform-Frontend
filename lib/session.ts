import type { TranscribeResult } from './api';

export const SESSION_KEYS = {
  lastTranscript: 'voicebridge:lastTranscript',
  translateSource: 'voicebridge:translateSource',
  sourceLanguage: 'voicebridge:sourceLanguage',
} as const;

export function saveLastTranscript(result: TranscribeResult): void {
  sessionStorage.setItem(
    SESSION_KEYS.lastTranscript,
    JSON.stringify(result),
  );
}

export function readLastTranscript(): TranscribeResult | null {
  const raw = sessionStorage.getItem(SESSION_KEYS.lastTranscript);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TranscribeResult;
  } catch {
    return null;
  }
}

export function clearRecordingSession(): void {
  sessionStorage.removeItem(SESSION_KEYS.lastTranscript);
  sessionStorage.removeItem(SESSION_KEYS.translateSource);
}

export function saveTranslateSource(data: {
  id?: string;
  text: string;
  sourceLanguage: string;
}): void {
  sessionStorage.setItem(SESSION_KEYS.translateSource, JSON.stringify(data));
}

export function readTranslateSource(): {
  id?: string;
  text: string;
  sourceLanguage: string;
} | null {
  const raw = sessionStorage.getItem(SESSION_KEYS.translateSource);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as {
      id?: string;
      text: string;
      sourceLanguage: string;
    };
  } catch {
    return null;
  }
}

export function defaultTargetLanguage(sourceCode: string): string {
  return sourceCode === 'en' ? 'hi' : 'en';
}

export function saveSourceLanguage(code: string): void {
  localStorage.setItem(SESSION_KEYS.sourceLanguage, code);
}

export function readSourceLanguage(): string | null {
  return localStorage.getItem(SESSION_KEYS.sourceLanguage);
}
