'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { FaComments, FaTimes } from 'react-icons/fa';
import { useAdminAccess } from '@/app/admin/AdminTenantContext';
import RetailBusyDialog from '@/components/retail/RetailBusyDialog';
import { suggestedChipsForPath } from '@/lib/adminHelp/knowledge/routeMap';

/**
 * Floating Admin Help chat on /admin pages.
 * Asks how-to questions about admin features; grounded via /api/admin/help-chat.
 */
export default function AdminHelpChat() {
  const pathname = usePathname() || '/admin';
  const { isPlatformSuperAdmin, tenantId, limitNavToRetail } = useAdminAccess();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [chips, setChips] = useState<string[]>(() =>
    suggestedChipsForPath(pathname, isPlatformSuperAdmin),
  );

  useEffect(() => {
    setChips(suggestedChipsForPath(pathname, isPlatformSuperAdmin));
    setAnswer(null);
    setError(null);
  }, [pathname, isPlatformSuperAdmin]);

  const runAsk = useCallback(
    async (raw: string) => {
      const q = raw.trim();
      if (!q || asking) return;
      setAsking(true);
      setError(null);
      setAnswer(null);
      setQuestion(q);
      try {
        const res = await fetch('/api/admin/help-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: q,
            pathname,
            tenantId: tenantId ?? null,
          }),
        });
        const body = (await res.json()) as {
          reply?: string;
          error?: string;
          suggestedChips?: string[];
        };
        if (!res.ok) {
          setError(body.error || `Help failed (HTTP ${res.status})`);
          return;
        }
        setAnswer(body.reply || 'No answer returned.');
        if (Array.isArray(body.suggestedChips) && body.suggestedChips.length > 0) {
          setChips(body.suggestedChips);
        }
      } catch {
        setError('Help chat failed. Try again in a moment.');
      } finally {
        setAsking(false);
      }
    },
    [asking, pathname, tenantId],
  );

  if (limitNavToRetail) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-[9000] flex items-center gap-2 rounded-full bg-cyan-800 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-cyan-900 focus:outline-none focus:ring-2 focus:ring-cyan-400"
        aria-label="Open admin help chat"
        title="Admin Help"
      >
        <FaComments className="h-5 w-5" aria-hidden />
        Help
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[9100] flex items-end justify-end p-4 sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-help-chat-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close help chat backdrop"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border-2 border-cyan-700 bg-cyan-50 shadow-2xl">
            <div className="flex items-center justify-between border-b border-cyan-300 bg-cyan-200 px-4 py-3">
              <div>
                <h2 id="admin-help-chat-title" className="text-lg font-bold text-cyan-950">
                  Admin Help
                </h2>
                <p className="text-xs font-medium text-cyan-900">
                  Ask how to use this page · {pathname}
                </p>
              </div>
              <button
                type="button"
                className="rounded-md p-2 text-cyan-900 hover:bg-cyan-300"
                aria-label="Close admin help"
                onClick={() => setOpen(false)}
              >
                <FaTimes className="h-5 w-5" />
              </button>
            </div>

            <form
              className="flex flex-1 flex-col gap-3 overflow-y-auto p-4"
              onSubmit={async (event) => {
                event.preventDefault();
                await runAsk(question);
              }}
            >
              <label className="block text-sm font-semibold text-cyan-950">
                Your question
                <input
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  className="mt-1 w-full rounded-md border border-cyan-400 bg-white px-3 py-2 text-base text-cyan-950 shadow-sm focus:border-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-300"
                  disabled={asking}
                  placeholder="Or tap a suggestion below"
                  autoComplete="off"
                />
              </label>

              <div className="flex flex-wrap gap-2">
                {chips.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    className="rounded-md bg-cyan-800 px-3 py-2 text-left text-sm font-semibold text-white hover:bg-cyan-900 disabled:opacity-60"
                    disabled={asking}
                    onClick={() => runAsk(chip)}
                  >
                    {chip}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={asking || !question.trim()}
                className="w-full rounded-md bg-blue-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-60"
              >
                {asking ? 'Asking…' : 'Ask'}
              </button>

              {error && (
                <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
                  {error}
                </p>
              )}
              {answer && (
                <div className="rounded-md border border-cyan-300 bg-white px-3 py-3 text-base font-medium text-cyan-950 whitespace-pre-wrap break-words">
                  {answer}
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {asking && (
        <RetailBusyDialog
          titleId="admin-help-ask-title"
          title="Asking Admin Help"
          message="Looking up how-to guidance for this page. This usually takes a few seconds."
        />
      )}
    </>
  );
}
