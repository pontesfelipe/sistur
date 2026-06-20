import type { ModuleManifest } from '@/data/moduleLibrary';
import { MODULE_LIBRARY, buildModuleManifestJson } from '@/data/moduleLibrary';

/**
 * Pacote B + C da Biblioteca de Módulos.
 *
 * - `buildModuleBundle(m)` produz um único texto concatenado com todos os
 *   arquivos-chave do módulo (incluindo edge functions e migrations
 *   localizadas via `migrationKeywords`), pronto pra download em .txt e
 *   colagem em outro projeto Lovable.
 * - `scanModuleIntegrity(m)` percorre os imports `@/...` do código real
 *   e reporta dependências internas que NÃO estão declaradas no manifesto
 *   (hooks/contexts/files) — útil pra detectar acoplamentos ocultos antes
 *   de portar o módulo.
 *
 * Tudo roda no browser usando `import.meta.glob` do Vite (raw, lazy).
 * Nenhuma dependência nova é adicionada.
 */

// Glob lazy — Vite resolve em build, mas o conteúdo só é baixado quando
// o loader correspondente é chamado. Não infla o bundle inicial.
const SRC_RAW = import.meta.glob('/src/**/*.{ts,tsx,css,md,json}', {
  query: '?raw',
  import: 'default',
}) as Record<string, () => Promise<string>>;

const FUNCTIONS_RAW = import.meta.glob('/supabase/functions/**/*.{ts,tsx,json}', {
  query: '?raw',
  import: 'default',
}) as Record<string, () => Promise<string>>;

const MIGRATIONS_RAW = import.meta.glob('/supabase/migrations/*.sql', {
  query: '?raw',
  import: 'default',
}) as Record<string, () => Promise<string>>;

function normalize(p: string): string {
  return p.startsWith('/') ? p : `/${p}`;
}

/**
 * Resolve uma entrada `files[]` (que pode ser um arquivo exato ou um
 * diretório terminado em `/`) para a lista concreta de paths existentes
 * no bundle Vite.
 */
function resolveFiles(entry: string): string[] {
  const abs = normalize(entry);
  const pool = entry.startsWith('supabase/functions') ? FUNCTIONS_RAW : SRC_RAW;

  if (entry.endsWith('/')) {
    return Object.keys(pool)
      .filter((k) => k.startsWith(abs))
      .sort();
  }

  if (pool[abs]) return [abs];

  // Fallback: caminho declarado mas arquivo inexistente (manifesto stale).
  return [];
}

async function loadRaw(path: string): Promise<string | null> {
  const pool = path.startsWith('/supabase/functions') ? FUNCTIONS_RAW : SRC_RAW;
  const loader = pool[path];
  if (!loader) return null;
  try {
    return await loader();
  } catch {
    return null;
  }
}

function findMatchingMigrations(keywords: string[] = []): string[] {
  if (keywords.length === 0) return [];
  const kws = keywords.map((k) => k.toLowerCase());
  return Object.keys(MIGRATIONS_RAW)
    .filter((path) => kws.some((kw) => path.toLowerCase().includes(kw)))
    .sort();
}

export interface ModuleBundle {
  module: string;
  version: string;
  filesIncluded: string[];
  migrationsIncluded: string[];
  text: string;
}

const SEP = '='.repeat(78);

export async function buildModuleBundle(m: ModuleManifest): Promise<ModuleBundle> {
  const filePaths = Array.from(new Set(m.files.flatMap(resolveFiles)));

  // Edge functions explicitamente declaradas
  const fnPaths = (m.edgeFunctions ?? []).flatMap((fn) =>
    resolveFiles(`supabase/functions/${fn}/`),
  );

  const allCodePaths = Array.from(new Set([...filePaths, ...fnPaths])).sort();

  // Migrations relacionadas (por keyword OU por nome de tabela)
  const migrationPaths = findMatchingMigrations([
    ...(m.migrationKeywords ?? []),
    ...(m.supabaseTables ?? []),
  ]);

  const chunks: string[] = [];
  const version = m.version ?? '1.0.0';

  chunks.push(SEP);
  chunks.push(`SISTUR MODULE BUNDLE — ${m.module} v${version}`);
  chunks.push(`Generated: ${new Date().toISOString()}`);
  chunks.push(`Category: ${m.category}`);
  chunks.push(`Files: ${allCodePaths.length} · Migrations: ${migrationPaths.length}`);
  chunks.push(SEP);
  chunks.push('');
  chunks.push('--- MANIFESTO ---');
  chunks.push(buildModuleManifestJson(m));
  chunks.push('');

  for (const path of allCodePaths) {
    const content = await loadRaw(path);
    chunks.push(SEP);
    chunks.push(`FILE: ${path.replace(/^\//, '')}`);
    chunks.push(SEP);
    chunks.push(content ?? '// [unavailable: file not found in bundle]');
    chunks.push('');
  }

  for (const path of migrationPaths) {
    const loader = MIGRATIONS_RAW[path];
    let content = '';
    try {
      content = await loader();
    } catch {
      content = '-- [unavailable]';
    }
    chunks.push(SEP);
    chunks.push(`MIGRATION: ${path.replace(/^\//, '')}`);
    chunks.push(SEP);
    chunks.push(content);
    chunks.push('');
  }

  return {
    module: m.module,
    version,
    filesIncluded: allCodePaths.map((p) => p.replace(/^\//, '')),
    migrationsIncluded: migrationPaths.map((p) => p.replace(/^\//, '')),
    text: chunks.join('\n'),
  };
}

export function downloadBundle(bundle: ModuleBundle) {
  const blob = new Blob([bundle.text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const slug = bundle.module
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  a.href = url;
  a.download = `sistur-module-${slug}-v${bundle.version}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ============================================================
// Pacote C — Auto-scan de dependências
// ============================================================

export interface IntegrityIssue {
  type: 'undeclared-import' | 'missing-file' | 'declared-elsewhere';
  detail: string;
  /** Arquivo do módulo onde o issue foi detectado (quando aplicável). */
  from?: string;
}

export interface IntegrityReport {
  module: string;
  filesScanned: number;
  totalImports: number;
  undeclared: string[]; // imports @/... fora deste módulo
  missing: string[]; // arquivos declarados mas inexistentes
  declaredElsewhere: Array<{ import: string; ownedBy: string }>;
  issues: IntegrityIssue[];
}

const IMPORT_RX = /(?:from|import)\s+['"]@\/([^'"]+)['"]/g;

/**
 * Constrói um índice reverso: caminho `src/...` → módulo que o declara.
 * Diretórios (entries terminadas em `/`) cobrem qualquer arquivo abaixo.
 */
function buildOwnershipIndex(): Array<{ path: string; module: string; isDir: boolean }> {
  const index: Array<{ path: string; module: string; isDir: boolean }> = [];
  for (const section of MODULE_LIBRARY) {
    for (const m of section.modules) {
      for (const f of m.files) {
        index.push({ path: f, module: m.module, isDir: f.endsWith('/') });
      }
    }
  }
  return index;
}

function resolveImportToFile(importPath: string): string | null {
  // `@/foo/bar` → `src/foo/bar` — tenta .ts, .tsx, /index.ts, /index.tsx
  const base = `/src/${importPath}`;
  const candidates = [
    base + '.ts',
    base + '.tsx',
    base + '/index.ts',
    base + '/index.tsx',
    base, // se já tem extensão
  ];
  for (const c of candidates) {
    if (SRC_RAW[c]) return c.replace(/^\//, '');
  }
  return null;
}

function isCoveredBy(filePath: string, moduleFiles: string[]): boolean {
  return moduleFiles.some((f) =>
    f.endsWith('/') ? filePath.startsWith(f) : filePath === f,
  );
}

function isUiPrimitive(filePath: string): boolean {
  // shadcn-ui é genérico e fica em src/components/ui — não conta como
  // dependência oculta, é parte do contrato "ui" das deps.
  return filePath.startsWith('src/components/ui/') || filePath.startsWith('src/lib/utils');
}

export async function scanModuleIntegrity(m: ModuleManifest): Promise<IntegrityReport> {
  const ownership = buildOwnershipIndex();
  const moduleFilesResolved = Array.from(new Set(m.files.flatMap(resolveFiles))).map((p) =>
    p.replace(/^\//, ''),
  );

  const report: IntegrityReport = {
    module: m.module,
    filesScanned: 0,
    totalImports: 0,
    undeclared: [],
    missing: [],
    declaredElsewhere: [],
    issues: [],
  };

  // 1) Arquivos declarados que não existem
  for (const f of m.files) {
    if (resolveFiles(f).length === 0) {
      report.missing.push(f);
      report.issues.push({
        type: 'missing-file',
        detail: `Arquivo declarado não encontrado: ${f}`,
      });
    }
  }

  const undeclaredSet = new Set<string>();
  const elsewhereSet = new Set<string>();

  // 2) Scan de imports
  for (const absPath of Array.from(new Set(m.files.flatMap(resolveFiles)))) {
    const content = await loadRaw(absPath);
    if (!content) continue;
    report.filesScanned++;
    const matches = content.matchAll(IMPORT_RX);
    for (const match of matches) {
      report.totalImports++;
      const importPath = match[1];
      const resolved = resolveImportToFile(importPath);
      if (!resolved) continue;
      if (isUiPrimitive(resolved)) continue;
      if (isCoveredBy(resolved, m.files)) continue;

      const owner = ownership.find(
        (o) =>
          o.module !== m.module &&
          (o.isDir ? resolved.startsWith(o.path) : resolved === o.path),
      );
      if (owner) {
        if (!elsewhereSet.has(resolved)) {
          elsewhereSet.add(resolved);
          report.declaredElsewhere.push({ import: resolved, ownedBy: owner.module });
          report.issues.push({
            type: 'declared-elsewhere',
            detail: `Importa "${resolved}" (pertence ao módulo "${owner.module}")`,
            from: absPath.replace(/^\//, ''),
          });
        }
      } else if (!undeclaredSet.has(resolved)) {
        undeclaredSet.add(resolved);
        report.undeclared.push(resolved);
        report.issues.push({
          type: 'undeclared-import',
          detail: `Import não declarado em nenhum módulo: ${resolved}`,
          from: absPath.replace(/^\//, ''),
        });
      }
    }
  }

  return report;
}