'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import NewRecordingLink from '@/components/NewRecordingLink';
import { getTranscript } from '@/lib/api';
import { languageLabel } from '@/lib/languages';
import {
  defaultTargetLanguage,
  readLastTranscript,
  saveTranslateSource,
} from '@/lib/session';
import type { TranscribeResult } from '@/lib/api';

const LEGACY_DEMO_SNIPPETS = [
  'VoiceBridge AI demonstration transcript',
  'वॉइसब्रिज एआई का प्रदर्शन',
  'ವಾಯ್ಸ್‌ಬ್ರಿಡ್ಜ್ ಎಐ ಪ್ರದರ್ಶನ',
];

function isLegacyDemo(text: string, mode?: string): boolean {
  return (
    mode === 'demo' ||
    LEGACY_DEMO_SNIPPETS.some((snippet) => text.includes(snippet))
  );
}

function TranscriptContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const transcriptId = searchParams.get('id');

  const [transcript, setTranscript] = useState<TranscribeResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadTranscript() {
      setLoading(true);
      setError(null);

      if (transcriptId) {
        try {
          const record = await getTranscript(transcriptId);
          if (cancelled) return;
          setTranscript({
            id: record.id,
            text: record.originalText,
            sourceLanguage: record.sourceLanguage,
            mode: record.transcriptionMode ?? 'whisper',
            createdAt: record.createdAt,
          });
          return;
        } catch {
          if (cancelled) return;
          setError('Could not load this transcript from the server.');
        }
      }

      const cached = readLastTranscript();
      if (!cancelled) setTranscript(cached);
    }

    loadTranscript().finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [transcriptId]);

  if (loading) {
    return (
      <div className="card empty-state">
        <span className="status-badge status-info">Loading transcript…</span>
      </div>
    );
  }

  if (!transcript) {
    return (
      <div className="studio-page">
        <div className="studio-hero">
          <div>
            <p className="studio-eyebrow">Transcript Viewer</p>
            <h2 className="studio-title">No Transcript Yet</h2>
            <p className="studio-subtitle">
              Record your voice in the studio to generate a neural transcript.
            </p>
          </div>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="card empty-state">
          <Link href="/recorder" className="btn btn-primary btn-lg">
            Open Voice Studio
          </Link>
        </div>
      </div>
    );
  }

  const legacyDemo = isLegacyDemo(transcript.text, transcript.mode);

  const goToTranslate = () => {
    saveTranslateSource({
      id: transcript.id,
      text: transcript.text,
      sourceLanguage: transcript.sourceLanguage,
    });
    router.push(`/translate?id=${transcript.id}`);
  };

  return (
    <div className="studio-page">
      <div className="studio-hero">
        <div>
          <p className="studio-eyebrow">Transcript Viewer</p>
          <h2 className="studio-title">Your Speech — Converted to Text</h2>
          <p className="studio-subtitle">
            Neural engine output in {languageLabel(transcript.sourceLanguage)}.
          </p>
        </div>
        <span className="status-badge status-ok">Neural Engine</span>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {legacyDemo && (
        <div className="alert alert-error">
          This is an old placeholder transcript from before the neural engine was enabled.
          Please make a <Link href="/recorder" className="link-inline">new recording</Link> to capture your actual speech.
        </div>
      )}

      <div className="card studio-card transcript-result">
        <div className="history-meta">
          <span>{languageLabel(transcript.sourceLanguage)}</span>
          <span>Ref {transcript.id.slice(0, 8).toUpperCase()}</span>
          <span>{new Date(transcript.createdAt).toLocaleString()}</span>
        </div>

        <div className="transcript-box premium">{transcript.text}</div>

        <div className="actions-row">
          <button className="btn btn-primary btn-lg" onClick={goToTranslate}>
            Translate → {languageLabel(defaultTargetLanguage(transcript.sourceLanguage))}
          </button>
          <Link href="/history" className="btn btn-outline">
            History
          </Link>
          <NewRecordingLink className="btn btn-outline" />
        </div>
      </div>
    </div>
  );
}

export default function TranscriptPage() {
  return (
    <Suspense
      fallback={
        <div className="card empty-state">
          <span className="status-badge status-info">Loading transcript…</span>
        </div>
      }
    >
      <TranscriptContent />
    </Suspense>
  );
}
