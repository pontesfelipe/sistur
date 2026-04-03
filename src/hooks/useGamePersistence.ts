import { useCallback, useEffect, useRef } from 'react';

const EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
const DEBOUNCE_MS = 500;

interface StoredData<T> {
  state: T;
  savedAt: number;
}

export function useGamePersistence<T>(key: string, state: T | null, enabled: boolean) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced save
  useEffect(() => {
    if (!enabled || state === null) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        const data: StoredData<T> = { state, savedAt: Date.now() };
        localStorage.setItem(key, JSON.stringify(data));
      } catch { /* quota exceeded — ignore */ }
    }, DEBOUNCE_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [key, state, enabled]);

  const load = useCallback((): { state: T; savedAt: Date } | null => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const data: StoredData<T> = JSON.parse(raw);
      if (Date.now() - data.savedAt > EXPIRY_MS) {
        localStorage.removeItem(key);
        return null;
      }
      return { state: data.state, savedAt: new Date(data.savedAt) };
    } catch {
      localStorage.removeItem(key);
      return null;
    }
  }, [key]);

  const clear = useCallback(() => {
    localStorage.removeItem(key);
  }, [key]);

  return { load, clear };
}
