'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import EngineStatus from '@/components/EngineStatus';
import { checkHealth, getHealth, getTranscripts, type Transcript } from '@/lib/api';

export default function DashboardPage() {
  const [healthy, setHealthy] = useState<boolean | null>(null);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [loading, setLoading] = useState(true);

  const [engineReady, setEngineReady] = useState(false);

  useEffect(() => {
    async function load() {
      const [isHealthy, items, health] = await Promise.all([
        checkHealth(),
        getTranscripts().catch(() => []),
        getHealth(),
      ]);
      setHealthy(isHealthy);
      setTranscripts(items);
      setEngineReady(health?.engine?.ready ?? false);
      setLoading(false);
    }
    load();
  }, []);

  const translated = transcripts.filter((t) => t.translatedText).length;

  return (
    <div className="studio-page">
      <div className="studio-hero">
        <div>
          <p className="studio-eyebrow">Command Center</p>
          <h2 className="studio-title">VoiceBridge Dashboard</h2>
          <p className="studio-subtitle">
            Real-time multilingual speech-to-text and translation platform.
          </p>
        </div>
        <EngineStatus />
      </div>

      <div className="grid-3" style={{ marginBottom: '1.75rem' }}>
        <div className="stat-card premium-stat">
          <div className="label">Platform Status</div>
          <div className="value" style={{ fontSize: '1.125rem' }}>
            {healthy === null ? (
              '—'
            ) : healthy ? (
              <span className="status-badge status-ok">Operational</span>
            ) : (
              <span className="status-badge status-error">Unavailable</span>
            )}
          </div>
        </div>
        <div className="stat-card premium-stat">
          <div className="label">Neural Engine</div>
          <div className="value" style={{ fontSize: '1.125rem' }}>
            {engineReady ? (
              <span className="status-badge status-ok">Live</span>
            ) : (
              <span className="status-badge status-info">Loading</span>
            )}
          </div>
        </div>
        <div className="stat-card premium-stat">
          <div className="label">Total Transcripts</div>
          <div className="value">{loading ? '—' : transcripts.length}</div>
        </div>
        <div className="stat-card premium-stat">
          <div className="label">Translations</div>
          <div className="value">{loading ? '—' : translated}</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card studio-card">
          <h3 className="card-title">Quick Start</h3>
          <ol className="steps-list">
            <li>Open <Link href="/recorder" className="link-inline">Voice Studio</Link> and pick your language</li>
            <li>Speak — watch words appear live in real time</li>
            <li>Stop recording — neural engine finalizes the transcript</li>
            <li>Translate to any supported language instantly</li>
          </ol>
          <div className="actions-row">
            <Link href="/recorder" className="btn btn-primary btn-lg">
              Open Voice Studio
            </Link>
          </div>
        </div>

        <div className="card studio-card">
          <h3 className="card-title">Supported Languages</h3>
          <p className="body-text" style={{ marginBottom: '1.25rem' }}>
            English, Hindi, Kannada, Tamil, Telugu, Malayalam, Marathi,
            Bengali, Gujarati, and Punjabi.
          </p>
          <div className="studio-features">
            <div className="feature-chip">Live preview</div>
            <div className="feature-chip">Whisper AI</div>
            <div className="feature-chip">Google Translate</div>
          </div>
        </div>
      </div>
    </div>
  );
}
