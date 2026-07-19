'use client';

import Image from 'next/image';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: '◈' },
  { href: '/jobs', label: 'Jobs', icon: '◉' },
  { href: '/settings', label: 'Settings', icon: '⚙' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);

  // Close sidebar on route change (mobile nav)
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen]);

  // Lock body scroll when open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleLogout = useCallback((): void => {
    logout();
    router.push('/login');
  }, [logout, router]);

  const userInitials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : 'SH';

  return (
    <>
      {/* ── Mobile top bar ────────────────────────────────────── */}
      <div className="mobile-topbar" id="mobile-topbar" role="banner">
        <button
          type="button"
          className="mobile-topbar__hamburger"
          onClick={() => setIsOpen((v) => !v)}
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isOpen}
          aria-controls="sidebar"
          id="hamburger-btn"
        >
          <span className="hamburger-line" aria-hidden="true" />
          <span className="hamburger-line" aria-hidden="true" />
          <span className="hamburger-line" aria-hidden="true" />
        </button>
        <div className="mobile-topbar__brand-group">
          <Image
            src="/logo.png"
            alt="SmartHire Logo"
            width={28}
            height={28}
            className="brand-logo-img"
            priority
          />
          <span className="mobile-topbar__brand">SmartHire</span>
        </div>
      </div>

      {/* ── Backdrop (mobile only) ─────────────────────────────── */}
      {isOpen && (
        <div
          className="sidebar__mobile-backdrop"
          aria-hidden="true"
          onClick={() => setIsOpen(false)}
          id="sidebar-backdrop"
        />
      )}

      {/* ── Sidebar ───────────────────────────────────────────── */}
      <aside
        className={`sidebar ${isOpen ? 'sidebar--open' : ''}`}
        aria-label="Main navigation"
        id="sidebar"
        aria-hidden={!isOpen ? undefined : undefined}
      >
        {/* Brand */}
        <div className="sidebar-brand">
          <Image
            src="/logo.png"
            alt="SmartHire Logo"
            width={28}
            height={28}
            className="brand-logo-img"
            priority
          />
          <span className="sidebar-brand-name">SmartHire</span>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav" aria-label="Primary navigation">
          <ul className="sidebar-nav-list" role="list">
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    id={`nav-${item.label.toLowerCase()}`}
                    className={`sidebar-nav-link ${isActive ? 'sidebar-nav-link--active' : ''}`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span className="sidebar-nav-icon" aria-hidden="true">
                      {item.icon}
                    </span>
                    <span className="sidebar-nav-label">{item.label}</span>
                    {isActive && <span className="sidebar-nav-indicator" aria-hidden="true" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom: user + logout */}
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar" aria-hidden="true">
              {userInitials}
            </div>
            <div className="sidebar-user-info">
              <p className="sidebar-user-email">{user?.email ?? 'User'}</p>
              <p className="sidebar-user-role">{user?.role ?? 'recruiter'}</p>
            </div>
          </div>

          <button
            id="logout-btn"
            type="button"
            onClick={handleLogout}
            className="sidebar-logout-btn"
            aria-label="Sign out"
          >
            <span aria-hidden="true">⎋</span>
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
