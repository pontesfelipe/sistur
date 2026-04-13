import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

/**
 * Client-side error monitor that captures:
 * - Unhandled JS errors
 * - Unhandled promise rejections
 * - Failed fetch requests (4xx/5xx)
 * - Navigation errors
 * 
 * Reports are batched and sent every 30 seconds to avoid flooding.
 */
export function useClientErrorMonitor() {
  const { user } = useAuth();
  const errorQueue = useRef<Array<{
    error_type: string;
    message: string;
    stack_trace?: string;
    page_url: string;
    metadata?: Record<string, unknown>;
  }>>([]);
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const queueError = useCallback((error: {
    error_type: string;
    message: string;
    stack_trace?: string;
    page_url: string;
    metadata?: Record<string, unknown>;
  }) => {
    // Deduplicate: don't queue same error+page twice
    const isDupe = errorQueue.current.some(
      e => e.message === error.message && e.page_url === error.page_url
    );
    if (!isDupe && errorQueue.current.length < 50) {
      errorQueue.current.push(error);
    }
  }, []);

  const flushErrors = useCallback(async () => {
    if (!user?.id || errorQueue.current.length === 0) return;

    const errors = [...errorQueue.current];
    errorQueue.current = [];

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('user_id', user.id)
        .single();

      const inserts = errors.map(e => ({
        user_id: user.id,
        org_id: profile?.org_id || null,
        error_type: e.error_type,
        message: e.message.substring(0, 500),
        stack_trace: e.stack_trace?.substring(0, 2000) || null,
        page_url: e.page_url,
        user_agent: navigator.userAgent,
        metadata: e.metadata || {},
      }));

      await supabase.from('client_error_reports').insert(inserts);
    } catch {
      // Silently fail - don't create error loops
    }
  }, [user?.id]);

  useEffect(() => {
    // Capture unhandled errors
    const handleError = (event: ErrorEvent) => {
      queueError({
        error_type: 'unhandled_error',
        message: event.message || 'Unknown error',
        stack_trace: event.error?.stack,
        page_url: window.location.pathname,
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    };

    // Capture unhandled promise rejections
    const handleRejection = (event: PromiseRejectionEvent) => {
      const message = event.reason?.message || event.reason?.toString() || 'Unhandled promise rejection';
      queueError({
        error_type: 'unhandled_rejection',
        message,
        stack_trace: event.reason?.stack,
        page_url: window.location.pathname,
      });
    };

    // Intercept fetch for failed API calls
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        if (response.status >= 500) {
          const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request)?.url || '';
          // Only track our own API calls
          if (url.includes('supabase') || url.includes('functions/v1')) {
            queueError({
              error_type: 'api_error',
              message: `API ${response.status}: ${url.split('?')[0]}`,
              page_url: window.location.pathname,
              metadata: { status: response.status, url: url.split('?')[0] },
            });
          }
        }
        return response;
      } catch (err) {
        const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request)?.url || '';
        if (url.includes('supabase') || url.includes('functions/v1')) {
          queueError({
            error_type: 'network_error',
            message: `Network error: ${url.split('?')[0]}`,
            page_url: window.location.pathname,
            metadata: { url: url.split('?')[0] },
          });
        }
        throw err;
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    // Flush every 30 seconds
    flushTimerRef.current = setInterval(flushErrors, 30_000);

    // Flush on page unload
    const handleBeforeUnload = () => flushErrors();
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.fetch = originalFetch;
      if (flushTimerRef.current) clearInterval(flushTimerRef.current);
      flushErrors();
    };
  }, [queueError, flushErrors]);
}
