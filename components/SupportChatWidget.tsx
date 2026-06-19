'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { IconChat } from '@/components/Icons';

const HINT_DISMISSED_KEY = 'vb-support-hint-dismissed';

export default function SupportChatWidget() {
  const [showHint, setShowHint] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(HINT_DISMISSED_KEY)) return;
    const timer = window.setTimeout(() => setShowHint(true), 2000);
    return () => window.clearTimeout(timer);
  }, []);

  const dismissHint = () => {
    setShowHint(false);
    localStorage.setItem(HINT_DISMISSED_KEY, '1');
  };

  const openPanel = () => {
    dismissHint();
    setOpen(true);
  };

  const closePanel = () => setOpen(false);

  return (
    <div className="support-widget" aria-live="polite">
      {open && (
        <div className="support-panel" role="dialog" aria-label="Help and support">
          <div className="support-panel-header">
            <strong>VoiceBridge Support</strong>
            <button
              type="button"
              className="support-panel-close"
              onClick={closePanel}
              aria-label="Close support panel"
            >
              ×
            </button>
          </div>
          <p className="support-panel-text">
            Need help with recording, transcription, or translation? Quick guides below.
          </p>
          <ul className="support-panel-links">
            <li>
              <Link href="/recorder" onClick={closePanel}>
                Voice Recorder guide
              </Link>
            </li>
            <li>
              <Link href="/translate" onClick={closePanel}>
                Translation workflow
              </Link>
            </li>
            <li>
              <Link href="/history" onClick={closePanel}>
                View past transcripts
              </Link>
            </li>
          </ul>
          <p className="support-panel-foot">
            Use Chrome or Edge for Telugu, Kannada, and Hindi live speech.
          </p>
        </div>
      )}

      {showHint && !open && (
        <div className="support-hint">
          <p>
            Click here to explore documentation or get help with VoiceBridge AI.
          </p>
          <button type="button" className="support-hint-open" onClick={openPanel}>
            Open
          </button>
          <button
            type="button"
            className="support-hint-dismiss"
            onClick={dismissHint}
            aria-label="Dismiss hint"
          >
            ×
          </button>
        </div>
      )}

      <button
        type="button"
        className="support-fab"
        onClick={() => (open ? closePanel() : openPanel())}
        aria-label={open ? 'Close support chat' : 'Open support chat'}
        aria-expanded={open}
      >
        <IconChat />
      </button>
    </div>
  );
}
