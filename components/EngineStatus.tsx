'use client';

import { useEffect, useState } from 'react';
import { getHealth, type HealthStatus } from '@/lib/api';

export default function EngineStatus() {
  const [health, setHealth] = useState<HealthStatus | null>(null);

  useEffect(() => {
    let mounted = true;

    async function poll() {
      const data = await getHealth();
      if (mounted) setHealth(data);
    }

    poll();
    const interval = setInterval(poll, 8000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (!health) {
    return (
      <div className="engine-status">
        <span className="engine-dot loading" />
        <span>Checking engine…</span>
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
        <strong>{ready ? 'Neural Engine Live' : loading ? 'Engine Loading…' : 'Engine Starting'}</strong>
        <span>{ready ? 'Real-time STT active' : 'First run downloads AI model'}</span>
      </div>
    </div>
  );
}
