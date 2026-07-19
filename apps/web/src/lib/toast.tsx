'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  /** True while the exit animation is running */
  exiting: boolean;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

// ── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue>({
  toast: () => undefined,
});

let nextId = 0;
const DISPLAY_MS = 4000;
const EXIT_MS = 300;

// ── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    // First trigger exit animation, then remove
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)),
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, EXIT_MS);
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType = 'info') => {
      const id = ++nextId;
      setToasts((prev) => [...prev, { id, message, type, exiting: false }]);
      // Auto-dismiss after DISPLAY_MS
      setTimeout(() => dismiss(id), DISPLAY_MS);
    },
    [dismiss],
  );

  const ICONS: Record<ToastType, string> = {
    success: '✓',
    error:   '✗',
    info:    'ℹ',
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {toasts.length > 0 && (
        <div
          className="toast-container"
          role="region"
          aria-label="Notifications"
          aria-live="polite"
        >
          {toasts.map((t) => (
            <div
              key={t.id}
              id={`toast-${t.id}`}
              className={[
                'toast',
                `toast--${t.type}`,
                t.exiting ? 'toast--exiting' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              role="alert"
            >
              <span className="toast__icon" aria-hidden="true">
                {ICONS[t.type]}
              </span>
              <span className="toast__message">{t.message}</span>
              <button
                className="toast__dismiss"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}
