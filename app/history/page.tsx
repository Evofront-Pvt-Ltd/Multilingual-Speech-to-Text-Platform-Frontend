'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import LanguageSelect from '@/components/LanguageSelect';
import NewRecordingLink from '@/components/NewRecordingLink';
import PageHeader from '@/components/PageHeader';
import { formatDate, languageLabel } from '@/lib/languages';
import { getTranscripts, translateTranscript, type Transcript } from '@/lib/api';

export default function HistoryPage() {
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [targetLang, setTargetLang] = useState('en');

  const load = async () => {
    setLoading(true);
    try {
      const items = await getTranscripts();
      setTranscripts(items);
    } catch {
      setError('Unable to reach the VoiceBridge API. Ensure the backend is running on port 3001.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleTranslate = async (id: string) => {
    setTranslatingId(id);
    setError(null);
    try {
      await translateTranscript(id, targetLang);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Translation failed');
    } finally {
      setTranslatingId(null);
    }
  };

  return (
    <>
      <PageHeader
        title="History"
        description="Access your complete archive of transcriptions and translations."
      />

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div className="grid-2">
          <LanguageSelect
            label="Default Target Language"
            value={targetLang}
            onChange={setTargetLang}
          />
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <NewRecordingLink className="btn btn-primary" />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card empty-state">Loading records…</div>
      ) : transcripts.length === 0 ? (
        <div className="card empty-state">
          <p>No transcripts on record. Start by capturing your first recording.</p>
          <div className="actions-row" style={{ justifyContent: 'center' }}>
            <Link href="/recorder" className="btn btn-primary">
              Start Recording
            </Link>
          </div>
        </div>
      ) : (
        <div className="history-list">
          {transcripts.map((item) => (
            <div key={item.id} className="history-item">
              <div className="history-meta">
                <span>{formatDate(item.createdAt)}</span>
                <span>{languageLabel(item.sourceLanguage)}</span>
                {item.targetLanguage && (
                  <span>→ {languageLabel(item.targetLanguage)}</span>
                )}
              </div>
              <div className="history-text">{item.originalText}</div>
              {item.translatedText && (
                <div className="history-translated">{item.translatedText}</div>
              )}
              {!item.translatedText && (
                <div className="actions-row">
                  <Link
                    href={`/transcript?id=${item.id}`}
                    className="btn btn-outline"
                  >
                    View Transcript
                  </Link>
                  <Link
                    href={`/translate?id=${item.id}`}
                    className="btn btn-outline"
                  >
                    Translate
                  </Link>
                  <button
                    className="btn btn-outline"
                    onClick={() => handleTranslate(item.id)}
                    disabled={translatingId === item.id}
                  >
                    {translatingId === item.id
                      ? 'Translating…'
                      : `Quick translate to ${languageLabel(targetLang)}`}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
