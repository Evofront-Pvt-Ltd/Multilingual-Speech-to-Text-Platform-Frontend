'use client';

import { useRouter } from 'next/navigation';
import AudioVisualizer from '@/components/AudioVisualizer';
import EngineStatus from '@/components/EngineStatus';
import LanguageSelect from '@/components/LanguageSelect';
import PipelineSteps from '@/components/PipelineSteps';
import type { TranscribeResult } from '@/lib/api';
import { languageLabel } from '@/lib/languages';
import {
  formatRecordingDuration,
  useVoiceRecorder,
} from '@/lib/useVoiceRecorder';
import { saveTranslateSource } from '@/lib/session';
import { useEffect, useState } from 'react';

interface VoiceRecorderCoreProps {
  variant?: 'full' | 'compact';
  defaultLanguage?: string;
  navigateOnComplete?: boolean;
  navigateToTranslate?: boolean;
  onTranscriptComplete?: (result: TranscribeResult) => void;
  showEngineStatus?: boolean;
  showPipeline?: boolean;
}

export default function VoiceRecorderCore({
  variant = 'full',
  defaultLanguage = 'en',
  navigateOnComplete = false,
  navigateToTranslate = false,
  onTranscriptComplete,
  showEngineStatus = true,
  showPipeline = true,
}: VoiceRecorderCoreProps) {
  const router = useRouter();
  const [pipelineStep, setPipelineStep] = useState(1);
  const [copied, setCopied] = useState(false);

  const handleComplete = (result: TranscribeResult) => {
    setPipelineStep(4);
    saveTranslateSource({
      id: result.id,
      text: result.text,
      sourceLanguage: result.sourceLanguage,
    });
    onTranscriptComplete?.(result);
    if (navigateOnComplete) {
      if (navigateToTranslate) {
        const isEphemeralId = result.id.startsWith('live-');
        router.push(
          isEphemeralId
            ? '/translate?auto=1'
            : `/translate?id=${result.id}&auto=1`,
        );
      } else if (!result.id.startsWith('live-')) {
        router.push(`/transcript?id=${result.id}`);
      } else {
        router.push('/transcript');
      }
    }
  };

  const recorder = useVoiceRecorder({
    defaultLanguage,
    onTranscriptComplete: handleComplete,
  });

  const {
    sourceLanguage,
    setSourceLanguage,
    recording,
    processing,
    error,
    duration,
    finalTranscript,
    liveText,
    stream,
    liveSpeechSupported,
    liveSpeechListening,
    liveSpeechError,
    startRecording,
    stopRecording,
    reset,
  } = recorder;

  useEffect(() => {
    if (recording) setPipelineStep(2);
    else if (processing) setPipelineStep(3);
    else if (!finalTranscript && pipelineStep === 3) setPipelineStep(2);
  }, [recording, processing, finalTranscript, pipelineStep]);

  const handleRecordToggle = () => {
    if (recording) {
      void stopRecording();
      return;
    }
    void startRecording();
  };

  const copyTranscript = async () => {
    if (!finalTranscript) return;
    await navigator.clipboard.writeText(finalTranscript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const showLivePanel = recording || processing || Boolean(liveText);
  const isCompact = variant === 'compact';

  if (isCompact) {
    return (
      <div className="voice-recorder-compact">
        {error && <div className="alert alert-error voice-widget-alert">{error}</div>}

        <LanguageSelect
          label="Source Language"
          value={sourceLanguage}
          onChange={setSourceLanguage}
          disabled={recording || processing}
        />

        <AudioVisualizer stream={stream} active={recording} compact />

        <div className="voice-widget-controls">
          <button
            type="button"
            className={`record-btn voice-record-btn ${recording ? 'recording' : ''}`}
            onClick={handleRecordToggle}
            disabled={processing}
            aria-label={recording ? 'Stop recording' : 'Start recording'}
          >
            <div className="record-dot" />
          </button>

          <div className="recorder-meta">
            <p className="recorder-status">
              {processing
                ? 'Neural engine transcribing…'
                : recording
                  ? `Live ${formatRecordingDuration(duration)}`
                  : 'Tap to record'}
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
              {!recording && !processing && liveSpeechSupported && (
                <span className="status-badge status-ok">Ready</span>
              )}
            </div>
          </div>
        </div>

        <div className="voice-widget-transcript">
          <div className="live-panel-header">
            <h3 className="card-title">Live Transcript</h3>
            {recording && liveSpeechSupported && (
              <span className="status-badge status-ok">Streaming</span>
            )}
          </div>

          {showLivePanel ? (
            <div className={`live-transcript voice-live-transcript ${recording ? 'typing' : ''}`}>
              {liveText || (
                <span className="live-placeholder">
                  {recording
                    ? 'Start speaking…'
                    : 'Processing with neural engine…'}
                </span>
              )}
              {recording && liveText && <span className="live-cursor" />}
            </div>
          ) : (
            <div className="live-transcript voice-live-transcript empty">
              <span className="live-placeholder">
                Your speech appears here while you record.
              </span>
            </div>
          )}
        </div>

        {finalTranscript && !processing && (
          <div className="voice-widget-result">
            <div className="voice-widget-result-actions">
              <button type="button" className="btn btn-outline btn-sm" onClick={copyTranscript}>
                {copied ? 'Copied!' : 'Copy text'}
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => {
                  reset();
                  setPipelineStep(1);
                }}
              >
                New recording
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

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
        {showEngineStatus && <EngineStatus />}
      </div>

      {showPipeline && <PipelineSteps currentStep={pipelineStep} />}

      {error && <div className="alert alert-error">{error}</div>}

      {recording && liveSpeechSupported && !liveSpeechListening && !liveText && duration >= 3 && (
        <div className="alert alert-info">
          Connecting live speech preview… speak clearly in {languageLabel(sourceLanguage)}.
        </div>
      )}

      {liveSpeechError && (
        <div className="alert alert-info">{liveSpeechError}</div>
      )}

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
              type="button"
              className={`record-btn ${recording ? 'recording' : ''}`}
              onClick={handleRecordToggle}
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
                    ? `Live capture ${formatRecordingDuration(duration)}`
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
                {!recording && !processing && liveSpeechSupported && (
                  <span className="status-badge status-ok">Real-time ready</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="card studio-card live-panel">
          <div className="live-panel-header">
            <h3 className="card-title">Live Transcript</h3>
            {recording && liveSpeechSupported && (
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
