'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { clearRecordingSession } from '@/lib/session';

interface NewRecordingLinkProps {
  className?: string;
  children?: ReactNode;
}

export default function NewRecordingLink({
  className = 'btn btn-outline',
  children = 'New Recording',
}: NewRecordingLinkProps) {
  return (
    <Link
      href="/recorder"
      className={className}
      onClick={() => clearRecordingSession()}
    >
      {children}
    </Link>
  );
}
