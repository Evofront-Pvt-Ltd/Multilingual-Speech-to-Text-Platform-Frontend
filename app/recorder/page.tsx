'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import AudioVisualizer from '@/components/AudioVisualizer';
import EngineStatus from '@/components/EngineStatus';
import LanguageSelect from '@/components/LanguageSelect';
import PipelineSteps from '@/components/PipelineSteps';
import { transcribeAudio, saveTextTranscript, checkHealth, API_BASE } from '@/lib/api';
import { languageLabel } from '@/lib/languages';
import { getSupportedAudioMimeType, waitForRecordingBlob } from '@/lib/recorder';
import {
  clearRecordingSession,
  saveLastTranscript,
  readSourceLanguage,
  saveSourceLanguage,
} from '@/lib/session';
import { mergeLiveCaptures } from '@/lib/merge-live-captures';
import {
  canSaveLiveText,
  filterLiveText,
  pickLiveDisplayText,
} from '@/lib/transcript-validation';
import { useLivePreview } from '@/lib/useLivePreview';
import { useLiveSpeech } from '@/lib/useLiveSpeech';

export default function RecorderPage() {
  const router = useRouter();
  const [sourceLanguage, setSourceLanguage] = useState('en');
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [finalTranscript, setFinalTranscript] = useState<string | null>(null);
  const [processingMessage, setProcessingMessage] = useState('');
  const [processingCapture, setProcessingCapture] = useState('');
  const [pipelineStep, setPipelineStep] = useState(1);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeTypeRef = useRef('audio/webm');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getPreviewBlob = useCallback(
    () =>
      chunksRef.current.length
        ? new Blob(chunksRef.current, { type: mimeTypeRef.current })
        : null,
    [],
  );

  const liveSnapshotRef = useRef('');

  const liveSpeech = useLiveSpeech(sourceLanguage, recording);
  /** For Indian languages, live preview uses browser speech only (no English neural preview). */
  const livePreview = useLivePreview(
    recording && sourceLanguage === 'en',
    sourceLanguage,
    getPreviewBlob,
  );

  useEffect(() => {
    checkHealth().then((ok) => {
      setBackendOnline(ok);
      if (ok) setError(null);
    });
    const saved = readSourceLanguage();
    if (saved) setSourceLanguage(saved);
  }, []);

  useEffect(() => {
    saveSourceLanguage(sourceLanguage);
  }, [sourceLanguage]);

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
    },
    [],
  );

  useEffect(() => {
    if (recording && duration >= 5 && error?.includes('5 seconds')) {
      setError(null);
    }
  }, [recording, duration, error]);

  const startRecording = async () => {
    if (!(await checkHealth())) {
      setError(`Backend not running at ${API_BASE}. Run backend .\\start.ps1 first.`);
      return;
    }

    setError(null);
    setFinalTranscript(null);
    setProcessingCapture('');
    setProcessingMessage('');
    clearRecordingSession();
    livePreview.reset();
    liveSpeech.reset();
    setPipelineStep(2);

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream(mediaStream);
      const mimeType = getSupportedAudioMimeType();
      mimeTypeRef.current = mimeType ?? 'audio/webm';
      const mediaRecorder = mimeType
        ? new MediaRecorder(mediaStream, { mimeType })
        : new MediaRecorder(mediaStream);
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(250);
      setRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
      liveSpeech.start();
    } catch {
      setError('Microphone access is required. Use Chrome or Edge.');
      setPipelineStep(1);
    }
  };

  const currentLiveText = pickLiveDisplayText(
    liveSpeech.displayText,
    livePreview.text,
    sourceLanguage,
  );

  useEffect(() => {
    if (currentLiveText) liveSnapshotRef.current = currentLiveText;
  }, [currentLiveText]);

  const stopRecording = async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || !stream || recorder.state === 'inactive') return;

    if (duration < 5) {
      setError('Speak at least 5 seconds, then press stop.');
      return;
    }

    const preStopSnapshot = mergeLiveCaptures(
      liveSnapshotRef.current,
      liveSpeech.getDisplayText(),
      currentLiveText,
      liveSpeech.getCapturedText(),
    );
    if (preStopSnapshot) {
      setProcessingCapture(preStopSnapshot);
    }

    const browserCapturePromise = liveSpeech.flushAndCapture();
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setProcessing(true);
    setProcessingMessage('Saving transcript…');
    setPipelineStep(3);

    const cleanupRecorder = async () => {
      try {
        await waitForRecordingBlob(recorder, stream, chunksRef.current);
      } finally {
        mediaRecorderRef.current = null;
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
        chunksRef.current = [];
      }
    };

    try {
      const flushed = await browserCapturePromise;
      const liveCapture = mergeLiveCaptures(
        preStopSnapshot,
        flushed,
        liveSpeech.getDisplayText(),
        liveSpeech.getCapturedText(),
        livePreview.getCapturedText(),
      );

      if (liveCapture) {
        setProcessingCapture(liveCapture);
        liveSnapshotRef.current = liveCapture;
      }

      if (!liveCapture.trim()) {
        await cleanupRecorder();
        setProcessing(false);
        setPipelineStep(2);
        setError('No speech captured. Speak clearly in Chrome/Edge, then stop.');
        return;
      }

      if (canSaveLiveText(liveCapture, sourceLanguage)) {
        const result = await saveTextTranscript(sourceLanguage, liveCapture);
        void cleanupRecorder();
        saveLastTranscript(result);
        setFinalTranscript(result.text);
        setPipelineStep(4);
        router.push(`/transcript?id=${result.id}`);
        return;
      }

      setProcessingMessage('Transcribing audio…');
      const blob = await waitForRecordingBlob(recorder, stream, chunksRef.current);
      mediaRecorderRef.current = null;
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
      chunksRef.current = [];

      const result = await transcribeAudio(blob, sourceLanguage, liveCapture);
      saveLastTranscript(result);
      setFinalTranscript(result.text);
      setPipelineStep(4);
      router.push(`/transcript?id=${result.id}`);
    } catch (err) {
      setPipelineStep(2);
      setError(err instanceof Error ? err.message : 'Transcription failed');
    } finally {
      setProcessing(false);
      setProcessingMessage('');
    }
  };

  const liveText =
    finalTranscript ??
    (processing && processingCapture
      ? filterLiveText(processingCapture, sourceLanguage) || processingCapture
      : currentLiveText);

  const livePlaceholder = recording
    ? sourceLanguage === 'en'
      ? 'Listening…'
      : `Speak in ${languageLabel(sourceLanguage)}…`
    : processingMessage || 'Processing…';

  return (
    <div className="studio-page">
      <div className="studio-hero">
        <div>
          <p className="studio-eyebrow">Voice Intelligence Studio</p>
          <h2 className="studio-title">Real-Time Speech Capture</h2>
          <p className="studio-subtitle">
            Speak in {languageLabel(sourceLanguage)} — live text appears in the same
            language, then the final transcript is saved.
          </p>
        </div>
        <EngineStatus />
      </div>

      <PipelineSteps currentStep={pipelineStep} />
      {error && <div className="alert alert-error">{error}</div>}

      {sourceLanguage !== 'en' && !recording && !processing && (
        <div className="alert alert-info">
          Select your language, record 8+ seconds in Chrome/Edge, then stop. Live text
          appears in the same language (Telugu, Kannada, Hindi, etc.).
        </div>
      )}

      <div className="studio-grid">
        <div className="card studio-card">
          <LanguageSelect
            label="Source Language (must match how you speak)"
            value={sourceLanguage}
            onChange={setSourceLanguage}
            disabled={recording || processing}
          />
          <AudioVisualizer stream={stream} active={recording} />
          <div className="recorder-controls studio-recorder">
            <button
              className={`record-btn ${recording ? 'recording' : ''}`}
              onClick={recording ? stopRecording : startRecording}
              disabled={processing}
            >
              <div className="record-dot" />
            </button>
            <p className="recorder-status">
              {processing
                ? processingMessage || 'Transcribing…'
                : recording
                  ? `Recording ${duration}s`
                  : 'Press to record'}
            </p>
          </div>
        </div>

        <div className="card studio-card live-panel">
          <h3 className="card-title">Live Transcript</h3>
          <div className="live-transcript">
            {liveText || (
              <span className="live-placeholder">{livePlaceholder}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
