'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  IconDashboard,
  IconHistory,
  IconLogo,
  IconMic,
  IconTranscript,
  IconTranslate,
} from '@/components/Icons';
import EngineStatus from '@/components/EngineStatus';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', Icon: IconDashboard },
  { href: '/recorder', label: 'Voice Recorder', Icon: IconMic },
  { href: '/transcript', label: 'Transcript Viewer', Icon: IconTranscript },
  { href: '/translate', label: 'Translation', Icon: IconTranslate },
  { href: '/history', label: 'History', Icon: IconHistory },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">
          <IconLogo />
          <div>
            <h1>VoiceBridge AI</h1>
            <p>Enterprise Voice Intelligence</p>
          </div>
        </div>
      </div>
      <nav className="sidebar-nav">
        <span className="nav-section">Platform</span>
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-link ${pathname === item.href ? 'active' : ''}`}
          >
            <item.Icon className="nav-icon" />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className="sidebar-footer">
        <EngineStatus />
        <span className="footer-version">v1.0.0 · Production</span>
      </div>
    </aside>
  );
}
