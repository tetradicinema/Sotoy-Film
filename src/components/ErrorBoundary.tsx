/// <reference types="vite/client" />
import React from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * Message patterns for "stale deploy" chunk failures: the browser holds an old
 * HTML/bundle that lazily imports a hashed JS module which no longer exists on
 * the server after a new build ships. Covers Vite, webpack and native ESM
 * wording across Chromium/Firefox/Safari.
 */
const CHUNK_ERROR_PATTERNS: RegExp[] = [
  /failed to fetch dynamically imported module/i,
  /importing a module script failed/i,
  /loading chunk .*failed/i,
  /error loading dynamically imported module/i,
];

/**
 * Detects chunk/module load errors (e.g. after a new deploy invalidates cached
 * chunks). Accepts anything a React boundary may catch; returns false for
 * null/undefined and non-Error inputs instead of throwing.
 */
export function isChunkLoadError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const message = (error as { message?: unknown }).message;
  if (typeof message !== 'string') return false;
  return CHUNK_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** When this value changes, a previously caught render error is cleared. */
  resetKey?: string;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Route-level safety net: a render error inside a page must not unmount the
 * whole app. Rendered around the app's <Routes> so the navbar/footer stay
 * visible; navigating (resetKey = pathname) clears the error automatically.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo): void {
    // Local diagnostics only; no external reporting.
    console.error('[ErrorBoundary] Render error:', error, '\nComponent stack:', info.componentStack);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error !== null) {
      this.setState({ error: null });
    }
  }

  render(): React.ReactNode {
    const { error } = this.state;
    if (error === null) return this.props.children;

    const chunkError = isChunkLoadError(error);

    return (
      <div role="alert" className="flex min-h-[50vh] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-[#FF2E7E]/30 bg-[#171717]/80 p-8 text-center shadow-2xl">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-[#FF2E7E]/15 text-[#FF2E7E]">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-white">Terjadi kesalahan</h2>
          <p className="mt-2 text-sm text-slate-400">
            {chunkError
              ? 'Versi baru situs tersedia. Muat ulang untuk melanjutkan.'
              : 'Halaman ini gagal dimuat.'}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-xl bg-[#FF2E7E] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#FF2E7E]/90 focus:outline-none focus:ring-2 focus:ring-[#FF2E7E]/40"
            >
              Muat ulang halaman
            </button>
            <a
              href="/"
              className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-2.5 text-sm font-bold text-slate-200 transition-colors hover:bg-white/[0.08] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#FF2E7E]/40"
            >
              Kembali ke beranda
            </a>
          </div>
          {import.meta.env?.DEV === true && (
            <details className="mt-6 text-left">
              <summary className="cursor-pointer text-xs font-semibold text-slate-500 hover:text-slate-300">
                Detail teknis
              </summary>
              <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-black/60 p-3 text-[11px] leading-relaxed text-red-300">
                {error.message}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }
}
