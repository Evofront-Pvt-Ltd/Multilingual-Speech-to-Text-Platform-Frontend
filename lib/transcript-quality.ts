export interface TranscriptQualityResult {
  valid: boolean;
  reason?: string;
  userMessage?: string;
}

/** Detect Whisper hallucinations (dots, repetition, non-speech output). */
export function validateTranscriptQuality(text: string): TranscriptQualityResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      valid: false,
      reason: 'empty',
      userMessage:
        'No speech was detected. Record for at least 3 seconds in a quiet environment.',
    };
  }

  if (/^[\s.。．۔،٫…·•\-_]+$/u.test(trimmed)) {
    return {
      valid: false,
      reason: 'punctuation_only',
      userMessage:
        'The speech engine could not understand this recording. Select the correct source language, speak clearly for 5+ seconds, and try again.',
    };
  }

  const letters = trimmed.match(/[\p{L}\p{M}]/gu) ?? [];
  if (letters.length < Math.max(3, trimmed.length * 0.25)) {
    return {
      valid: false,
      reason: 'low_letter_ratio',
      userMessage:
        'Transcription quality was too low. Use Chrome/Edge, check your microphone, and record again with the correct language selected.',
    };
  }

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length >= 8) {
    const sample = words.slice(0, Math.min(words.length, 24));
    const unique = new Set(sample.map((w) => w.toLowerCase()));
    if (unique.size <= 2) {
      return {
        valid: false,
        reason: 'repetition',
        userMessage:
          'The engine produced repeated noise instead of speech. Please record again — speak naturally in the selected language.',
      };
    }
  }

  return { valid: true };
}

export function isLowQualityTranscript(text: string): boolean {
  return !validateTranscriptQuality(text).valid;
}
