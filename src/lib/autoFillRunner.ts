/**
 * Global registry for Enterprise Step 4 auto-fill blocks.
 * Each search component registers itself with a stable id and a run function.
 * The "Rodar todos" button in EnterpriseProfileStep iterates the registry
 * sequentially with a small delay between calls to respect upstream rate limits.
 */
import { useEffect, useRef } from 'react';

type RunFn = () => Promise<unknown> | unknown;

const registry = new Map<string, RunFn>();

export function registerAutoFill(id: string, fn: RunFn): () => void {
  registry.set(id, fn);
  return () => {
    if (registry.get(id) === fn) registry.delete(id);
  };
}

export function listAutoFillIds(): string[] {
  return Array.from(registry.keys());
}

export interface RunAllOptions {
  delayMs?: number;
  onProgress?: (info: { id: string; index: number; total: number }) => void;
  skipIds?: string[];
}

export async function runAllAutoFills(opts: RunAllOptions = {}): Promise<void> {
  const { delayMs = 700, onProgress, skipIds = [] } = opts;
  const entries = Array.from(registry.entries()).filter(([id]) => !skipIds.includes(id));
  for (let i = 0; i < entries.length; i++) {
    const [id, fn] = entries[i];
    onProgress?.({ id, index: i, total: entries.length });
    try {
      await fn();
    } catch (err) {
      console.error(`[autoFillRunner] "${id}" failed`, err);
    }
    if (i < entries.length - 1) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

export function useAutoFillRunner(id: string, run: RunFn): void {
  const ref = useRef(run);
  ref.current = run;
  useEffect(() => registerAutoFill(id, () => ref.current()), [id]);
}