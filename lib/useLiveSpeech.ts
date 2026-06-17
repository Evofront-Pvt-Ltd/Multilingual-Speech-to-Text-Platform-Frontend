'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { speechLocale } from './speech-locales';

type SpeechRecognitionCtor = new () => SpeechRecognition;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useLiveSpeech(languageCode: string) {
  const [interimText, setInterimText] = useState('');
  const [finalText, setFinalText] = useState('');
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    setSupported(getSpeechRecognition() !== null);
  }, []);

  const reset = useCallback(() => {
    setInterimText('');
    setFinalText('');
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) return false;

    reset();
    const recognition = new Ctor();
    recognition.lang = speechLocale(languageCode);
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      if (final) {
        setFinalText((prev) => `${prev}${final}`.trim());
      }
      setInterimText(interim);
    };

    recognition.onerror = () => {
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.start();
    recognitionRef.current = recognition;
    setListening(true);
    return true;
  }, [languageCode, reset]);

  useEffect(() => () => stop(), [stop]);

  const displayText = [finalText, interimText].filter(Boolean).join(' ').trim();

  return {
    supported,
    listening,
    displayText,
    finalText,
    start,
    stop,
    reset,
  };
}
