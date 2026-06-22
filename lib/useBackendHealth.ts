'use client';

import { useEffect, useState } from 'react';
import {
  refreshBackendHealth,
  subscribeBackendHealth,
  type BackendHealthState,
} from '@/lib/backendHealthStore';

export function useBackendHealth() {
  const [snapshot, setSnapshot] = useState<BackendHealthState>({
    health: null,
    online: false,
    checking: true,
  });

  useEffect(() => subscribeBackendHealth(setSnapshot), []);

  return {
    ...snapshot,
    refresh: refreshBackendHealth,
  };
}
