'use client';

import { useBackendHealth } from '@/lib/useBackendHealth';
import { getApiBase } from '@/lib/api';

export default function EngineStatus() {
  const { health, online, checking } = useBackendHealth();

  if (checking && !health) {
    return (
      <div className="engine-status">
        <span className="engine-dot loading" />
        <span>Checking engine…</span>
      </div>
    );
  }

  if (!online || !health) {
    return (
      <div className="engine-status">
        <span className="engine-dot offline" />
        <div className="engine-status-text">
          <strong>Backend Offline</strong>
          <span>Start API on {getApiBase()}</span>
        </div>
      </div>
    );
  }

  const engine = health.engine;
  const ready = engine?.ready;
  const loading = engine?.speechToText === 'loading';

  return (
    <div className="engine-status">
      <span
        className={`engine-dot ${ready ? 'ready' : loading ? 'loading' : 'offline'}`}
      />
      <div className="engine-status-text">
        <strong>
          {ready
            ? 'Neural Engine Live'
            : loading
              ? 'Engine Loading…'
              : 'Engine Starting'}
        </strong>
        <span>
          {ready
            ? 'Real-time STT active'
            : 'First run downloads AI model'}
        </span>
      </div>
    </div>
  );
}
