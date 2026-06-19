'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { previewTranscribe } from './api';
import { filterLiveText } from './transcript-validation';

const PREVIEW_INTERVAL_MS = 4000;
const FIRST_PREVIEW_MS = 3500;
const MIN_BLOB_BYTES = 3000;

export function useLivePreview(
  active: boolean,
  languageCode: string,
  getBlob: () => Blob | null,
) {
  const [text, setText] = useState('');
  const [updating, setUpdating] = useState(false);
  const textRef = useRef('');
  const inFlightRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const getBlobRef = useRef(getBlob);

  getBlobRef.current = getBlob;

  const reset = useCallback(() => {
    textRef.current = '';
    setText('');
    setUpdating(false);
    abortRef.current?.abort();
    abortRef.current = null;
    inFlightRef.current = false;
  }, []);

  const runPreview = useCallback(async () => {
    if (inFlightRef.current) return;

    const blob = getBlobRef.current();
    if (!blob || blob.size < MIN_BLOB_BYTES) return;

    inFlightRef.current = true;
    setUpdating(true);
    abortRef.current?.abort();

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const result = await previewTranscribe(blob, languageCode, controller.signal);
      const next = result.text.trim();
      if (!next) return;

      const display = filterLiveText(next, languageCode);
      if (display) {
        textRef.current = display;
        setText(display);
      }
    } catch {
      // Keep the last successful preview on transient errors.
    } finally {
      inFlightRef.current = false;
      setUpdating(false);
    }
  }, [languageCode]);

  useEffect(() => {
    if (!active) {
      reset();
      return;
    }

    const intervalId = setInterval(runPreview, PREVIEW_INTERVAL_MS);
    const firstId = setTimeout(runPreview, FIRST_PREVIEW_MS);

    return () => {
      clearInterval(intervalId);
      clearTimeout(firstId);
      abortRef.current?.abort();
      inFlightRef.current = false;
    };
  }, [active, languageCode, runPreview, reset]);

  return { text, updating, reset, getCapturedText: () => textRef.current };
}
