'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import LanguageSelect from '@/components/LanguageSelect';
import NewRecordingLink from '@/components/NewRecordingLink';
import PageHeader from '@/components/PageHeader';
import {
  BACKEND_UNREACHABLE_MESSAGE,
  getTranscript,
  translateText,
  type TranslateResult,
} from '@/lib/api';
import { languageLabel } from '@/lib/languages';
import {
  defaultTargetLanguage,
  readLastTranscript,
  readTranslateSource,
  saveTranslateSource,
} from '@/lib/session';
import { useBackendHealth } from '@/lib/useBackendHealth';

interface TranslateSource {
  id?: string;
  text: string;
  sourceLanguage: string;
}

function modeLabel(mode: TranslateResult['mode']) {
  if (mode === 'google') return 'Live Translation';
  if (mode === 'fallback') return 'Backup Engine';
  return 'Same Language';
}

function TranslateContent() {
  const searchParams = useSearchParams();
  const transcriptId = searchParams.get('id');
  const autoTranslate = searchParams.get('auto') === '1';
  const { online, checking } = useBackendHealth();

  const [source, setSource] = useState<TranslateSource>({
    text: '',
    sourceLanguage: 'en',
  });
  const [targetLanguage, setTargetLanguage] = useState('hi');
  const [result, setResult] = useState<TranslateResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const translateInFlight = useRef(false);
  const autoTranslateAttempted = useRef(false);

  const handleTranslate = useCallback(async () => {
    if (!source.text.trim()) {
      setError('No transcript text to translate. Record audio or paste text first.');
      return;
    }

    if (!online) {
      setError(BACKEND_UNREACHABLE_MESSAGE);
      return;
    }

    if (translateInFlight.current) return;
    translateInFlight.current = true;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await translateText(
        source.text,
        source.sourceLanguage,
        targetLanguage,
        source.id?.startsWith('live-') ? undefined : source.id,
      );
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Translation failed');
    } finally {
      translateInFlight.current = false;
      setLoading(false);
    }
  }, [online, source, targetLanguage]);

  useEffect(() => {
    let cancelled = false;

    async function loadSource() {
      setInitializing(true);
      setError(null);

      const loadFromSession = () => {
        const fromTranslate = readTranslateSource();
        if (fromTranslate?.text.trim()) {
          setSource(fromTranslate);
          setTargetLanguage(defaultTargetLanguage(fromTranslate.sourceLanguage));
          return true;
        }

        const fromRecording = readLastTranscript();
        if (fromRecording?.text.trim()) {
          const nextSource = {
            id: fromRecording.id,
            text: fromRecording.text,
            sourceLanguage: fromRecording.sourceLanguage,
          };
          setSource(nextSource);
          setTargetLanguage(defaultTargetLanguage(fromRecording.sourceLanguage));
          saveTranslateSource(nextSource);
          return true;
        }

        return false;
      };

      if (transcriptId && !transcriptId.startsWith('live-')) {
        try {
          const record = await getTranscript(transcriptId);
          if (cancelled) return;
          const nextSource = {
            id: record.id,
            text: record.originalText,
            sourceLanguage: record.sourceLanguage,
          };
          setSource(nextSource);
          setTargetLanguage(defaultTargetLanguage(record.sourceLanguage));
          saveTranslateSource(nextSource);

          if (record.translatedText && record.targetLanguage) {
            setResult({
              text: record.translatedText,
              sourceLanguage: record.sourceLanguage,
              targetLanguage: record.targetLanguage,
              mode: 'google',
              transcriptId: record.id,
            });
          }
          return;
        } catch {
          if (cancelled) return;
          if (loadFromSession()) return;
          setError('Could not load transcript for translation.');
        }
      } else if (loadFromSession()) {
        // Session-backed source (including live-preview transcripts).
      }
    }

    loadSource().finally(() => {
      if (!cancelled) setInitializing(false);
    });

    return () => {
      cancelled = true;
    };
  }, [transcriptId]);

  useEffect(() => {
    if (
      !autoTranslate ||
      initializing ||
      checking ||
      !online ||
      !source.text.trim() ||
      loading ||
      result
    ) {
      return;
    }

    if (autoTranslateAttempted.current) return;
    autoTranslateAttempted.current = true;
    void handleTranslate();
  }, [
    autoTranslate,
    initializing,
    checking,
    online,
    source.text,
    loading,
    result,
    handleTranslate,
  ]);

  useEffect(() => {
    if (!autoTranslate || result || loading) return;
    if (online && error === BACKEND_UNREACHABLE_MESSAGE) {
      autoTranslateAttempted.current = false;
      setError(null);
    }
  }, [autoTranslate, online, error, result, loading]);

  return (
    <>
      <PageHeader
        title="Translation"
        description="Review your transcript, then select the target language and translate."
      />

      {!checking && !online && (
        <div className="alert alert-error">
          {BACKEND_UNREACHABLE_MESSAGE}
          {autoTranslate && source.text.trim() && !result && (
            <span> Translation will start automatically when the backend is online.</span>
          )}
        </div>
      )}

      {error && online && <div className="alert alert-error">{error}</div>}

      {initializing ? (
        <div className="card empty-state">
          <span className="status-badge status-info">Loading transcript…</span>
        </div>
      ) : (
        <div className="grid-2">
          <div className="card">
            <LanguageSelect
              label="Source Language"
              value={source.sourceLanguage}
              onChange={(code) =>
                setSource((s) => ({ ...s, sourceLanguage: code }))
              }
            />

            <div className="form-group">
              <label>Source Text</label>
              <textarea
                className="textarea"
                value={source.text}
                onChange={(e) =>
                  setSource((s) => ({ ...s, text: e.target.value }))
                }
                placeholder="Your recorded transcript will appear here automatically…"
              />
            </div>

            <LanguageSelect
              label="Target Language"
              value={targetLanguage}
              onChange={setTargetLanguage}
              exclude={source.sourceLanguage}
            />

            <button
              className="btn btn-primary btn-lg"
              onClick={handleTranslate}
              disabled={loading || !source.text.trim() || !online}
            >
              {loading ? 'Translating…' : !online ? 'Backend offline' : 'Translate'}
            </button>
          </div>

          <div className="card">
            <h3 className="card-title">Translation Output</h3>

            {!result && !loading && (
              <div className="empty-state">
                <p>
                  {!online
                    ? 'Waiting for the VoiceBridge API. Start the backend, then translation will proceed.'
                    : source.text.trim()
                      ? 'Select a target language and click Translate.'
                      : 'Record audio first, then open this panel to translate your transcript.'}
                </p>
              </div>
            )}

            {loading && (
              <div className="empty-state">
                <span className="status-badge status-info">Translating…</span>
              </div>
            )}

            {result && (
              <>
                <div className="history-meta">
                  <span>
                    {languageLabel(result.sourceLanguage)} →{' '}
                    {languageLabel(result.targetLanguage)}
                  </span>
                  <span
                    className={`status-badge ${result.mode === 'google' ? 'status-ok' : 'status-info'}`}
                  >
                    {modeLabel(result.mode)}
                  </span>
                </div>
                <div className="transcript-box translated">{result.text}</div>
                <div className="actions-row">
                  <Link href="/history" className="btn btn-outline">
                    View in History
                  </Link>
                  <NewRecordingLink className="btn btn-outline" />
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default function TranslatePage() {
  return (
    <Suspense
      fallback={
        <div className="card empty-state">
          <span className="status-badge status-info">Loading…</span>
        </div>
      }
    >
      <TranslateContent />
    </Suspense>
  );
}
