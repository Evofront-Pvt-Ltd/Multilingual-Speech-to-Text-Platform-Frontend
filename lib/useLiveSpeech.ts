'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { speechLocale } from './speech-locales';
import { filterLiveText, hasNativeScript } from './transcript-validation';

type SpeechRecognitionCtor = new () => SpeechRecognition;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useLiveSpeech(languageCode: string, active: boolean) {
  const [interimText, setInterimText] = useState('');
  const [finalText, setFinalText] = useState('');
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const activeRef = useRef(active);
  const flushingRef = useRef(false);
  const capturedRef = useRef({ final: '', interim: '' });
  const displayRef = useRef('');

  activeRef.current = active;

  const syncDisplayRef = useCallback(() => {
    const raw = [capturedRef.current.final, capturedRef.current.interim]
      .filter(Boolean)
      .join(' ')
      .trim();
    displayRef.current = filterLiveText(raw, languageCode) || raw;
  }, [languageCode]);

  const getCapturedText = useCallback(() => {
    const { final, interim } = capturedRef.current;
    return [final, interim].filter(Boolean).join(' ').trim();
  }, []);

  const getDisplayText = useCallback(() => displayRef.current, []);

  useEffect(() => {
    setSupported(getSpeechRecognition() !== null);
  }, []);

  const reset = useCallback(() => {
    capturedRef.current = { final: '', interim: '' };
    displayRef.current = '';
    setInterimText('');
    setFinalText('');
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
  }, []);

  const flushAndCapture = useCallback(async (): Promise<string> => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      return getCapturedText();
    }

    flushingRef.current = true;

    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        flushingRef.current = false;
        resolve(getCapturedText() || getDisplayText());
      };

      recognition.onend = finish;
      recognition.stop();
      recognitionRef.current = null;
      setListening(false);
      window.setTimeout(finish, 1500);
    });
  }, [getCapturedText, getDisplayText]);

  const acceptChunk = useCallback(
    (chunk: string) => {
      if (!chunk.trim()) return false;
      if (languageCode === 'en') return true;
      return hasNativeScript(chunk, languageCode);
    },
    [languageCode],
  );

  const start = useCallback(() => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) return false;

    stop();
    reset();

    const recognition = new Ctor();
    recognition.lang = speechLocale(languageCode);
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let newFinal = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (!acceptChunk(transcript)) continue;
        if (event.results[i].isFinal) {
          newFinal += transcript;
        } else {
          interim += transcript;
        }
      }

      if (newFinal) {
        capturedRef.current.final = `${capturedRef.current.final} ${newFinal}`.trim();
        setFinalText(capturedRef.current.final);
      }
      capturedRef.current.interim = interim;
      setInterimText(interim);
      syncDisplayRef();
    };

    recognition.onerror = () => {
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
      if (!activeRef.current || recognitionRef.current !== recognition) return;

      try {
        recognition.start();
        setListening(true);
      } catch {
        recognitionRef.current = null;
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
    setListening(true);
    return true;
  }, [acceptChunk, languageCode, reset, stop, syncDisplayRef]);

  useEffect(() => {
    if (!active && !flushingRef.current) stop();
  }, [active, stop]);

  useEffect(() => () => stop(), [stop]);

  const displayText = filterLiveText(
    [finalText, interimText].filter(Boolean).join(' ').trim(),
    languageCode,
  );

  useEffect(() => {
    if (displayText) displayRef.current = displayText;
  }, [displayText]);

  return {
    supported,
    listening,
    displayText,
    finalText,
    getCapturedText,
    getDisplayText,
    flushAndCapture,
    start,
    stop,
    reset,
  };
}
