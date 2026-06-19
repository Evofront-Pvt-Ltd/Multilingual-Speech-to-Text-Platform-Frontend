'use client';

import { useEffect, useState } from 'react';
import { API_BASE, getHealth, type HealthStatus } from '@/lib/api';

export default function EngineStatus() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function poll() {
      const data = await getHealth();
      if (!mounted) return;
      setHealth(data);
      setOffline(!data);
    }

    poll();
    const interval = setInterval(poll, 3000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (!health && !offline) {
    return (
      <div className="engine-status">
        <span className="engine-dot loading" />
        <span>Checking engine…</span>
      </div>
    );
  }

  if (offline || !health) {
    return (
      <div className="engine-status">
        <span className="engine-dot offline" />
        <div className="engine-status-text">
          <strong>Backend Offline</strong>
          <span>Start API on {API_BASE}</span>
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
        <strong>{ready ? 'Neural Engine Live' : loading ? 'Engine Loading…' : 'Engine Starting'}</strong>
        <span>{ready ? 'Real-time STT active' : 'First run downloads AI model'}</span>
      </div>
    </div>
  );
}
