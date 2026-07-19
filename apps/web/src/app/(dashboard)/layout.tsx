'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import Sidebar from '@/components/layout/Sidebar';
import Providers from './providers';
import type { ReactNode } from 'react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && !token) {
      router.replace('/login');
    }
  }, [isMounted, token, router]);

  // While redirecting, render nothing to avoid flash
  if (!isMounted || !token) {
    return null;
  }

  return (
    <Providers>
      <div className="dashboard-shell">
        <Sidebar />
        <main className="dashboard-main" id="main-content">
          {children}
        </main>
      </div>
    </Providers>
  );
}
