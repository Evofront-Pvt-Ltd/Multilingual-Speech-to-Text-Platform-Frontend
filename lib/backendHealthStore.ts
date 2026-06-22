'use client';

import { getHealth, type HealthStatus } from '@/lib/api';

export interface BackendHealthState {
  health: HealthStatus | null;
  online: boolean;
  checking: boolean;
}

type Listener = (state: BackendHealthState) => void;

let state: BackendHealthState = {
  health: null,
  online: false,
  checking: true,
};

const listeners = new Set<Listener>();
let pollTimer: ReturnType<typeof setTimeout> | null = null;
let subscriberCount = 0;
let pollDelayMs = 8000;

function notify() {
  for (const listener of listeners) {
    listener(state);
  }
}

function schedulePoll() {
  if (pollTimer) clearTimeout(pollTimer);
  pollTimer = setTimeout(() => {
    void poll();
  }, pollDelayMs);
}

async function poll() {
  const data = await getHealth();
  const online = data?.status === 'ok';

  state = {
    health: data,
    online,
    checking: false,
  };

  pollDelayMs = online ? 8000 : Math.min(Math.round(pollDelayMs * 1.5), 30000);
  notify();
  schedulePoll();
}

function startPolling() {
  if (pollTimer) return;
  pollDelayMs = 8000;
  state = { ...state, checking: true };
  notify();
  void poll();
}

function stopPolling() {
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
}

export function subscribeBackendHealth(listener: Listener): () => void {
  listeners.add(listener);
  subscriberCount += 1;
  if (subscriberCount === 1) {
    startPolling();
  }
  listener(state);

  return () => {
    listeners.delete(listener);
    subscriberCount -= 1;
    if (subscriberCount === 0) {
      stopPolling();
    }
  };
}

export async function refreshBackendHealth(): Promise<BackendHealthState> {
  pollDelayMs = 8000;
  await poll();
  return state;
}
