'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import AudioVisualizer from '@/components/AudioVisualizer';
import EngineStatus from '@/components/EngineStatus';
import LanguageSelect from '@/components/LanguageSelect';
import PipelineSteps from '@/components/PipelineSteps';
import { transcribeAudio } from '@/lib/api';
import { languageLabel } from '@/lib/languages';
import {
  getSupportedAudioMimeType,
  waitForRecordingBlob,
} from '@/lib/recorder';
import { clearRecordingSession, saveLastTranscript } from '@/lib/session';
import { useLiveSpeech } from '@/lib/useLiveSpeech';

export default function RecorderPage() {
  const router = useRouter();
  const [sourceLanguage, setSourceLanguage] = useState('en');
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [finalTranscript, setFinalTranscript] = useState<string | null>(null);
  const [pipelineStep, setPipelineStep] = useState(1);

  const [stream, setStream] = useState<MediaStream | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const liveSpeech = useLiveSpeech(sourceLanguage);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => () => stopTimer(), [stopTimer]);

  const startRecording = async () => {
    setError(null);
    setFinalTranscript(null);
    clearRecordingSession();
    setPipelineStep(2);

    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        'Microphone recording is not supported. Use Chrome or Edge on localhost.',
      );
      setPipelineStep(1);
      return;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
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

      liveSpeech.start();
    } catch {
      setError('Microphone access is required. Enable permissions and try again.');
      setPipelineStep(1);
    }
  };

  const stopRecording = async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || !stream || recorder.state === 'inactive') return;

    liveSpeech.stop();
    setRecording(false);
    stopTimer();
    setProcessing(true);
    setPipelineStep(3);

    try {
      const blob = await waitForRecordingBlob(
        recorder,
        stream,
        chunksRef.current,
      );
      mediaRecorderRef.current = null;
      setStream(null);
      chunksRef.current = [];
      await submitRecording(blob);
    } catch (err) {
      setProcessing(false);
      setPipelineStep(2);
      setError(
        err instanceof Error ? err.message : 'Failed to finalize recording',
      );
    }
  };

  const submitRecording = async (blob: Blob) => {
    if (blob.size < 100) {
      setProcessing(false);
      setPipelineStep(2);
      setError('Recording is too short. Speak for at least 3 seconds.');
      return;
    }

    setError(null);

    try {
      const result = await transcribeAudio(blob, sourceLanguage);
      saveLastTranscript(result);
      setFinalTranscript(result.text);
      setPipelineStep(4);
      router.push(`/transcript?id=${result.id}`);
    } catch (err) {
      setPipelineStep(2);
      setError(err instanceof Error ? err.message : 'Transcription failed');
    } finally {
      setProcessing(false);
    }
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const liveText = finalTranscript ?? liveSpeech.displayText;
  const showLivePanel = recording || processing || Boolean(liveText);

  return (
    <div className="studio-page">
      <div className="studio-hero">
        <div>
          <p className="studio-eyebrow">Voice Intelligence Studio</p>
          <h2 className="studio-title">Real-Time Speech Capture</h2>
          <p className="studio-subtitle">
            Speak in {languageLabel(sourceLanguage)} — words appear live as you talk,
            then our neural engine produces the final transcript.
          </p>
        </div>
        <EngineStatus />
      </div>

      <PipelineSteps currentStep={pipelineStep} />

      {error && <div className="alert alert-error">{error}</div>}

      <div className="studio-grid">
        <div className="card studio-card">
          <LanguageSelect
            label="Source Language"
            value={sourceLanguage}
            onChange={(code) => {
              setSourceLanguage(code);
              if (!recording && !processing) setPipelineStep(1);
            }}
            disabled={recording || processing}
          />

          <AudioVisualizer stream={stream} active={recording} />

          <div className="recorder-controls studio-recorder">
            <button
              className={`record-btn ${recording ? 'recording' : ''}`}
              onClick={recording ? stopRecording : startRecording}
              disabled={processing}
              aria-label={recording ? 'Stop recording' : 'Start recording'}
            >
              <div className="record-dot" />
            </button>

            <div className="recorder-meta">
              <p className="recorder-status">
                {processing
                  ? 'Neural engine transcribing your recording…'
                  : recording
                    ? `Live capture ${formatDuration(duration)}`
                    : 'Press to start live recording'}
              </p>
              <div className="recorder-badges">
                {recording && (
                  <span className="status-badge live-badge">
                    <span className="live-pulse" /> LIVE
                  </span>
                )}
                {processing && (
                  <span className="status-badge status-info">Processing</span>
                )}
                {!recording && !processing && liveSpeech.supported && (
                  <span className="status-badge status-ok">Real-time ready</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="card studio-card live-panel">
          <div className="live-panel-header">
            <h3 className="card-title">Live Transcript</h3>
            {recording && liveSpeech.supported && (
              <span className="status-badge status-ok">Streaming</span>
            )}
          </div>

          {showLivePanel ? (
            <div className={`live-transcript ${recording ? 'typing' : ''}`}>
              {liveText || (
                <span className="live-placeholder">
                  {recording
                    ? 'Start speaking — your words will appear here in real time…'
                    : 'Processing with neural speech engine…'}
                </span>
              )}
              {recording && liveText && <span className="live-cursor" />}
            </div>
          ) : (
            <div className="live-transcript empty">
              <span className="live-placeholder">
                Your speech appears here instantly while you record. After you stop,
                the neural engine refines the final transcript.
              </span>
            </div>
          )}

          <div className="studio-features">
            <div className="feature-chip">Live preview</div>
            <div className="feature-chip">Whisper AI</div>
            <div className="feature-chip">10 languages</div>
          </div>
        </div>
      </div>
    </div>
  );
}
