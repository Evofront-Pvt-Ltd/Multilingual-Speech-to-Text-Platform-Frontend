import type { Metadata } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import Sidebar from '@/components/Sidebar';
import SupportChatWidget from '@/components/SupportChatWidget';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'VoiceBridge AI | Enterprise Voice Intelligence',
  description:
    'Enterprise-grade multilingual speech-to-text and real-time translation platform.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jakarta.variable}`}>
      <body>
        <div className="app-shell">
          <Sidebar />
          <main className="main-content">{children}</main>
          <SupportChatWidget />
        </div>
      </body>
    </html>
  );
}
