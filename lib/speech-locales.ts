/** BCP-47 locales for browser Web Speech API (real-time preview). */
export const SPEECH_LOCALES: Record<string, string> = {
  en: 'en-US',
  hi: 'hi-IN',
  kn: 'kn-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  ml: 'ml-IN',
  mr: 'mr-IN',
  bn: 'bn-IN',
  gu: 'gu-IN',
  pa: 'pa-IN',
};

export function speechLocale(code: string): string {
  return SPEECH_LOCALES[code] ?? 'en-US';
}
