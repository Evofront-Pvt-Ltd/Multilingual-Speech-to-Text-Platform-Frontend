'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import LanguageSelect from '@/components/LanguageSelect';
import NewRecordingLink from '@/components/NewRecordingLink';
import PageHeader from '@/components/PageHeader';
import { getTranscript, translateText, type TranslateResult } from '@/lib/api';
import { languageLabel } from '@/lib/languages';
import {
  defaultTargetLanguage,
  readLastTranscript,
  readTranslateSource,
  saveTranslateSource,
} from '@/lib/session';

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

  const [source, setSource] = useState<TranslateSource>({
    text: '',
    sourceLanguage: 'en',
  });
  const [targetLanguage, setTargetLanguage] = useState('hi');
  const [result, setResult] = useState<TranslateResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSource() {
      setInitializing(true);
      setError(null);

      if (transcriptId) {
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
          setError('Could not load transcript for translation.');
        }
      }

      const fromTranslate = readTranslateSource();
      if (fromTranslate?.text.trim()) {
        if (cancelled) return;
        setSource(fromTranslate);
        setTargetLanguage(defaultTargetLanguage(fromTranslate.sourceLanguage));
        return;
      }

      const fromRecording = readLastTranscript();
      if (fromRecording?.text.trim()) {
        if (cancelled) return;
        const nextSource = {
          id: fromRecording.id,
          text: fromRecording.text,
          sourceLanguage: fromRecording.sourceLanguage,
        };
        setSource(nextSource);
        setTargetLanguage(defaultTargetLanguage(fromRecording.sourceLanguage));
        saveTranslateSource(nextSource);
      }
    }

    loadSource().finally(() => {
      if (!cancelled) setInitializing(false);
    });

    return () => {
      cancelled = true;
    };
  }, [transcriptId]);

  const handleTranslate = async () => {
    if (!source.text.trim()) {
      setError('No transcript text to translate. Record audio or paste text first.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await translateText(
        source.text,
        source.sourceLanguage,
        targetLanguage,
        source.id,
      );
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Translation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Translation"
        description="Convert transcripts between supported languages with precision target language selection."
      />

      {error && <div className="alert alert-error">{error}</div>}

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
              disabled={loading || !source.text.trim()}
            >
              {loading ? 'Translating…' : 'Translate'}
            </button>
          </div>

          <div className="card">
            <h3 className="card-title">Translation Output</h3>

            {!result && !loading && (
              <div className="empty-state">
                <p>
                  {source.text.trim()
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
