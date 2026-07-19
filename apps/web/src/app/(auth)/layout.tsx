import type { ReactNode } from 'react';
import Image from 'next/image';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-shell">
      {/* Brand header */}
      <div className="auth-brand">
        <Image
          src="/logo.png"
          alt="SmartHire Logo"
          width={32}
          height={32}
          className="brand-logo-img"
          priority
        />
        <span className="auth-brand-name">SmartHire</span>
      </div>
      {children}
    </div>
  );
}
