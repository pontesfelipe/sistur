/**
 * Global registry for Enterprise Step 4 auto-fill blocks.
 *
 * Each search component registers itself with a stable id + run function via
 * `useAutoFillRunner(id, run)`. EnterpriseProfileStep enriches the registry
 * with metadata (friendly label + data source) via `setAutoFillMeta`.
 *
 * The runner maintains a subscribable per-block status store so the UI can
 * render per-block badges (idle / running / success / error), per-block
 * toasts and individual retry buttons — without coupling every search
 * component to the orchestrator UI.
 */
import { useEffect, useRef, useSyncExternalStore } from 'react';

type RunFn = () => Promise<unknown> | unknown;

export type AutoFillStatus = 'idle' | 'running' | 'success' | 'error' | 'no_data';

/**
 * Sinaliza que o bloco rodou com sucesso, mas a fonte de dados não retornou
 * informações suficientes para preencher os indicadores. O orquestrador trata
 * isso como um estado neutro (não-erro) e exibe a causa para o usuário.
 *
 * Componentes de busca podem usar `throw new NoDataError('motivo')` para
 * sinalizar isso explicitamente. Para evitar editar 18 componentes, o
 * `runEntry` também detecta mensagens de erro comuns ("Sem dados retornados",
 * "não encontrado", "nenhum resultado", etc.) e converte para no_data.
 */
export class NoDataError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = 'NoDataError';
  }
}

const NO_DATA_PATTERNS = [
  /sem dados/i,
  /nenhum (?:resultado|dado|registro|item)/i,
  /n[ãa]o (?:foi )?encontrad/i,
  /not found/i,
  /no data/i,
  /no results/i,
  /vazio/i,
  /empty/i,
  /indispon[íi]vel/i,
  /sem dados/i,
  /preencha manualmente/i,
];

function classifyError(err: unknown): { kind: 'no_data' | 'error'; message: string } {
  const message = err instanceof Error ? err.message : String(err);
  if (err instanceof NoDataError) return { kind: 'no_data', message };
  if ((err as any)?.name === 'NoDataError') return { kind: 'no_data', message };
  if (NO_DATA_PATTERNS.some((re) => re.test(message))) {
    return { kind: 'no_data', message };
  }
  return { kind: 'error', message };
}

export interface AutoFillEntry {
  id: string;
  label: string;
  source?: string;
  status: AutoFillStatus;
  error?: string;
  lastRunAt?: string;
  lastDurationMs?: number;
}

const registry = new Map<string, RunFn>();
const meta = new Map<string, { label: string; source?: string }>();
const state = new Map<string, AutoFillEntry>();
const listeners = new Set<() => void>();
let cachedSnapshot: AutoFillEntry[] = [];

function rebuildSnapshot() {
  const ids = new Set<string>([...registry.keys(), ...meta.keys(), ...state.keys()]);
  cachedSnapshot = Array.from(ids).map((id) => {
    const s = state.get(id);
    const m = meta.get(id);
    return {
      id,
      label: m?.label ?? id,
      source: m?.source,
      status: s?.status ?? 'idle',
      error: s?.error,
      lastRunAt: s?.lastRunAt,
      lastDurationMs: s?.lastDurationMs,
    };
  });
}

function notify() {
  rebuildSnapshot();
  listeners.forEach((l) => l());
}

function setStatus(id: string, patch: Partial<AutoFillEntry>) {
  const prev = state.get(id) ?? { id, label: meta.get(id)?.label ?? id, status: 'idle' as AutoFillStatus };
  state.set(id, { ...prev, ...patch });
  notify();
}

export function registerAutoFill(id: string, fn: RunFn): () => void {
  registry.set(id, fn);
  if (!state.has(id)) state.set(id, { id, label: meta.get(id)?.label ?? id, status: 'idle' });
  notify();
  return () => {
    if (registry.get(id) === fn) registry.delete(id);
    notify();
  };
}

export function setAutoFillMeta(id: string, m: { label: string; source?: string }): void {
  meta.set(id, m);
  if (state.has(id)) {
    const prev = state.get(id)!;
    state.set(id, { ...prev, label: m.label });
  }
  notify();
}

export function listAutoFillIds(): string[] {
  return Array.from(registry.keys());
}

/** Restore a previously persisted snapshot (e.g. from enterprise_profiles.autofill_run_state). */
export function hydrateAutoFillState(entries: AutoFillEntry[] | null | undefined): void {
  if (!entries || !Array.isArray(entries)) return;
  for (const e of entries) {
    if (!e?.id) continue;
    // Never restore "running" — a stale running state would block the UI.
    const status: AutoFillStatus = e.status === 'running' ? 'idle' : (e.status ?? 'idle');
    state.set(e.id, {
      id: e.id,
      label: meta.get(e.id)?.label ?? e.label ?? e.id,
      source: meta.get(e.id)?.source ?? e.source,
      status,
      error: status === 'error' || status === 'no_data' ? e.error : undefined,
      lastRunAt: e.lastRunAt,
      lastDurationMs: e.lastDurationMs,
    });
  }
  notify();
}

export function getAutoFillSnapshot(): AutoFillEntry[] {
  return cachedSnapshot;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** React hook that re-renders whenever any block status changes. */
export function useAutoFillStatuses(): AutoFillEntry[] {
  return useSyncExternalStore(subscribe, getAutoFillSnapshot, getAutoFillSnapshot);
}

export interface RunAllOptions {
  delayMs?: number;
  onProgress?: (info: { id: string; index: number; total: number }) => void;
  onBlockComplete?: (info: { id: string; label: string; status: 'success' | 'error' | 'no_data'; error?: string }) => void;
  skipIds?: string[];
}

async function runEntry(id: string, fn: RunFn): Promise<{ status: 'success' | 'error' | 'no_data'; error?: string }> {
  const started = Date.now();
  setStatus(id, { status: 'running', error: undefined });
  try {
    await fn();
    setStatus(id, { status: 'success', error: undefined, lastRunAt: new Date().toISOString(), lastDurationMs: Date.now() - started });
    return { status: 'success' };
  } catch (err) {
    const { kind, message } = classifyError(err);
    if (kind === 'no_data') {
      console.info(`[autoFillRunner] "${id}" sem dados: ${message}`);
    } else {
      console.error(`[autoFillRunner] "${id}" failed`, err);
    }
    setStatus(id, { status: kind, error: message, lastRunAt: new Date().toISOString(), lastDurationMs: Date.now() - started });
    return { status: kind, error: message };
  }
}

export async function runAllAutoFills(opts: RunAllOptions = {}): Promise<void> {
  const { delayMs = 700, onProgress, onBlockComplete, skipIds = [] } = opts;
  const entries = Array.from(registry.entries()).filter(([id]) => !skipIds.includes(id));
  for (let i = 0; i < entries.length; i++) {
    const [id, fn] = entries[i];
    onProgress?.({ id, index: i, total: entries.length });
    const result = await runEntry(id, fn);
    onBlockComplete?.({ id, label: meta.get(id)?.label ?? id, status: result.status, error: result.error });
    if (i < entries.length - 1) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

/** Re-execute a single block (used by the per-block "Tentar novamente" button). */
export async function runOneAutoFill(
  id: string,
  opts: { onComplete?: (info: { id: string; label: string; status: 'success' | 'error' | 'no_data'; error?: string }) => void } = {},
): Promise<{ status: 'success' | 'error' | 'no_data'; error?: string } | { status: 'missing' }> {
  const fn = registry.get(id);
  if (!fn) return { status: 'missing' };
  const result = await runEntry(id, fn);
  opts.onComplete?.({ id, label: meta.get(id)?.label ?? id, status: result.status, error: result.error });
  return result;
}

export function useAutoFillRunner(id: string, run: RunFn): void {
  const ref = useRef(run);
  ref.current = run;
  useEffect(() => registerAutoFill(id, () => ref.current()), [id]);
}