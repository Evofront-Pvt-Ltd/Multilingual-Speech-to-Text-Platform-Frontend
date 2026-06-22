'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { transcribeAudio, type TranscribeResult } from '@/lib/api';
import {
  getSupportedAudioMimeType,
  waitForRecordingBlob,
} from '@/lib/recorder';
import {
  clearRecordingSession,
  readSourceLanguage,
  saveLastTranscript,
  saveSourceLanguage,
} from '@/lib/session';
import { useLiveSpeech } from '@/lib/useLiveSpeech';
import { isLowQualityTranscript } from '@/lib/transcript-quality';

export interface UseVoiceRecorderOptions {
  defaultLanguage?: string;
  onTranscriptComplete?: (result: TranscribeResult) => void;
  onError?: (message: string) => void;
  saveSession?: boolean;
}

export function useVoiceRecorder(options: UseVoiceRecorderOptions = {}) {
  const {
    defaultLanguage = 'en',
    onTranscriptComplete,
    onError,
    saveSession = true,
  } = options;

  const [sourceLanguage, setSourceLanguage] = useState(defaultLanguage);
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [finalTranscript, setFinalTranscript] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const liveSpeech = useLiveSpeech(sourceLanguage, recording);

  useEffect(() => {
    const saved = readSourceLanguage();
    if (saved) setSourceLanguage(saved);
  }, []);

  useEffect(() => {
    saveSourceLanguage(sourceLanguage);
  }, [sourceLanguage]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => () => stopTimer(), [stopTimer]);

  const reset = useCallback(() => {
    setError(null);
    setFinalTranscript(null);
    setDuration(0);
    liveSpeech.reset();
    clearRecordingSession();
  }, [liveSpeech]);

  const submitRecording = useCallback(
    async (blob: Blob, liveHint?: string) => {
      if (blob.size < 100) {
        setProcessing(false);
        setError('Recording is too short. Speak for at least 3 seconds.');
        return null;
      }

      setError(null);

      try {
        const result = await transcribeAudio(blob, sourceLanguage, liveHint);
        const mergedText =
          liveHint?.trim() && !result.text.trim()
            ? liveHint.trim()
            : result.text;
        const payload = { ...result, text: mergedText };
        if (saveSession) saveLastTranscript(payload);
        setFinalTranscript(mergedText);
        onTranscriptComplete?.(payload);
        return payload;
      } catch (err) {
        const hint = liveHint?.trim();
        if (hint && !isLowQualityTranscript(hint)) {
          const payload: TranscribeResult = {
            id: `live-${Date.now()}`,
            text: hint,
            sourceLanguage,
            mode: 'live',
            createdAt: new Date().toISOString(),
          };
          if (saveSession) saveLastTranscript(payload);
          setFinalTranscript(hint);
          onTranscriptComplete?.(payload);
          return payload;
        }

        const message = err instanceof Error ? err.message : 'Transcription failed';
        setError(message);
        onError?.(message);
        return null;
      } finally {
        setProcessing(false);
      }
    },
    [onError, onTranscriptComplete, saveSession, sourceLanguage],
  );

  const startRecording = useCallback(async () => {
    setError(null);
    setFinalTranscript(null);
    clearRecordingSession();

    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        'Microphone recording is not supported. Use Chrome or Edge on localhost.',
      );
      return;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      setStream(mediaStream);

      const mimeType = getSupportedAudioMimeType();
      const mediaRecorder = mimeType
        ? new MediaRecorder(mediaStream, { mimeType })
        : new MediaRecorder(mediaStream);

      chunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(250);
      setRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);

      if (!liveSpeech.start()) {
        setError(
          'Live preview unavailable in this browser. Your speech will still be transcribed when you stop.',
        );
      }
    } catch {
      setError('Microphone access is required. Enable permissions and try again.');
    }
  }, [liveSpeech]);

  const stopRecording = useCallback(async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || !stream || recorder.state === 'inactive') return null;

    setRecording(false);
    stopTimer();
    setProcessing(true);

    const liveCapture = await liveSpeech.flushAndCapture();

    try {
      const blob = await waitForRecordingBlob(
        recorder,
        stream,
        chunksRef.current,
      );
      mediaRecorderRef.current = null;
      setStream(null);
      chunksRef.current = [];
      return submitRecording(blob, liveCapture);
    } catch (err) {
      setProcessing(false);
      setError(
        err instanceof Error ? err.message : 'Failed to finalize recording',
      );
      return null;
    }
  }, [liveSpeech, stopTimer, stream, submitRecording]);

  const liveText = finalTranscript ?? liveSpeech.displayText;

  return {
    sourceLanguage,
    setSourceLanguage,
    recording,
    processing,
    error,
    duration,
    finalTranscript,
    liveText,
    stream,
    liveSpeechSupported: liveSpeech.supported,
    liveSpeechListening: liveSpeech.listening,
    liveSpeechError: liveSpeech.speechError,
    startRecording,
    stopRecording,
    reset,
  };
}

export function formatRecordingDuration(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
