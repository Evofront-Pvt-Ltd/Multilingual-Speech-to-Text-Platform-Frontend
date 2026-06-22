import Sidebar from '@/components/Sidebar';
import SupportChatWidget from '@/components/SupportChatWidget';

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">{children}</main>
      <SupportChatWidget />
    </div>
  );
}
