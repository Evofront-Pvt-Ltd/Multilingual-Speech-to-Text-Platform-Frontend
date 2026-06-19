const NATIVE_SCRIPT_PATTERNS: Record<string, RegExp> = {
  hi: /[\u0900-\u097F]/,
  mr: /[\u0900-\u097F]/,
  kn: /[\u0C80-\u0CFF]/,
  ta: /[\u0B80-\u0BFF]/,
  te: /[\u0C00-\u0C7F]/,
  ml: /[\u0D00-\u0D7F]/,
  bn: /[\u0980-\u09FF]/,
  gu: /[\u0A80-\u0AFF]/,
  pa: /[\u0A00-\u0A7F]/,
};

function countNativeChars(text: string, languageCode: string): number {
  const pattern = NATIVE_SCRIPT_PATTERNS[languageCode];
  if (!pattern) return 0;
  return (text.match(new RegExp(pattern.source, 'g')) ?? []).length;
}

const NATIVE_SCRIPT_LANGUAGES = new Set(Object.keys(NATIVE_SCRIPT_PATTERNS));

export function hasNativeScript(text: string, languageCode: string): boolean {
  const pattern = NATIVE_SCRIPT_PATTERNS[languageCode];
  if (!pattern) return true;
  return pattern.test(text);
}

/** Reject Latin-only live preview when an Indian language is selected. */
export function isLatinOnlyLiveText(text: string): boolean {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return false;
  const letters = cleaned.match(/\p{L}/gu) ?? [];
  if (letters.length === 0) return false;
  const latin = cleaned.match(/[A-Za-z]/g) ?? [];
  return latin.length >= letters.length * 0.6;
}

export function filterLiveText(text: string, languageCode: string): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';

  if (languageCode === 'en') return cleaned;

  if (NATIVE_SCRIPT_LANGUAGES.has(languageCode)) {
    if (!hasNativeScript(cleaned, languageCode)) return '';
    if (isLatinOnlyLiveText(cleaned)) return '';
    if (!isValidTranscript(cleaned, languageCode) && cleaned.length < 8) return '';
  }

  return cleaned;
}

export function pickLiveDisplayText(
  speechText: string,
  previewText: string,
  languageCode: string,
): string {
  const speech = filterLiveText(speechText, languageCode);
  const preview = filterLiveText(previewText, languageCode);

  if (languageCode === 'en') {
    return speech.length >= preview.length ? speech : preview;
  }

  if (speech && preview) {
    return speech.length >= preview.length ? speech : preview;
  }
  return speech || preview;
}

export function isValidTranscript(text: string, languageCode: string): boolean {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned || cleaned.length < 2) return false;

  const meaningful = cleaned.replace(/[^\p{L}\p{N}]/gu, '');
  if (meaningful.length < 2) return false;

  if (/^[।|.|\-–—,:;!?]+$/u.test(cleaned.replace(/\s/g, ''))) {
    return false;
  }

  if (NATIVE_SCRIPT_LANGUAGES.has(languageCode)) {
    const pattern = NATIVE_SCRIPT_PATTERNS[languageCode];
    if (!pattern) return false;
    if (countNativeChars(cleaned, languageCode) < 2) return false;
  }

  return true;
}

export function isGarbageTranscript(text: string, languageCode: string): boolean {
  return Boolean(text.trim()) && !isValidTranscript(text, languageCode);
}

/** True when browser live text is good enough to save without running Whisper. */
export function canSaveLiveText(text: string, languageCode: string): boolean {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return false;
  if (languageCode === 'en') return cleaned.length >= 2;
  if (!hasNativeScript(cleaned, languageCode)) return false;
  return countNativeChars(cleaned, languageCode) >= 4;
}
