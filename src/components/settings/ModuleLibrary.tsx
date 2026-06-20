import { useMemo, useState } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Copy, FileCode, Library, Search, ClipboardCopy, Sparkles, Route, Database, Zap, KeyRound, Download, ShieldCheck, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  MODULE_LIBRARY,
  buildModuleManifestJson,
  buildModuleMigrationPrompt,
  type ModuleCategory,
  type ModuleManifest,
  type ModuleSection,
} from '@/data/moduleLibrary';
import { buildModuleBundle, downloadBundle, scanModuleIntegrity, type IntegrityReport } from '@/lib/moduleBundle';

const CATEGORY_BADGE: Record<ModuleCategory, string> = {
  ERP: 'bg-pillar-oe/10 text-pillar-oe border-pillar-oe/20',
  EDU: 'bg-pillar-ra/10 text-pillar-ra border-pillar-ra/20',
  Games: 'bg-pillar-ao/10 text-pillar-ao border-pillar-ao/20',
  Enterprise: 'bg-primary/10 text-primary border-primary/20',
  Comunidade: 'bg-severity-moderate/10 text-severity-moderate border-severity-moderate/20',
  Plataforma: 'bg-muted text-muted-foreground border-border',
};

async function copyToClipboard(text: string, successMessage: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(successMessage);
  } catch {
    toast.error('Não foi possível copiar para a área de transferência');
  }
}

function filterSections(sections: ModuleSection[], query: string): ModuleSection[] {
  const q = query.trim().toLowerCase();
  if (!q) return sections;
  return sections
    .map((section) => {
      const modules = section.modules.filter((m) => {
        const hay = [
          m.module,
          m.description,
          m.category,
          ...(m.files ?? []),
          ...(m.supabaseTables ?? []),
          ...(m.edgeFunctions ?? []),
          ...(m.routes ?? []),
          ...(m.migrationKeywords ?? []),
        ]
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      });
      return { ...section, modules };
    })
    .filter((s) => s.modules.length > 0);
}

function ModuleCard({ m }: { m: ModuleManifest }) {
  const [bundleLoading, setBundleLoading] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [report, setReport] = useState<IntegrityReport | null>(null);

  const version = m.version ?? '1.0.0';

  async function handleBundle() {
    setBundleLoading(true);
    try {
      const bundle = await buildModuleBundle(m);
      if (bundle.filesIncluded.length === 0) {
        toast.error(`Nenhum arquivo do módulo "${m.module}" foi encontrado no bundle`);
        return;
      }
      downloadBundle(bundle);
      toast.success(
        `Bundle de "${m.module}" gerado — ${bundle.filesIncluded.length} arquivos, ${bundle.migrationsIncluded.length} migrations`,
      );
    } catch (e) {
      toast.error(`Falha ao gerar bundle: ${(e as Error).message}`);
    } finally {
      setBundleLoading(false);
    }
  }

  async function handleScan() {
    setScanLoading(true);
    setReport(null);
    try {
      const r = await scanModuleIntegrity(m);
      setReport(r);
      const total = r.undeclared.length + r.missing.length + r.declaredElsewhere.length;
      if (total === 0) {
        toast.success(`"${m.module}" íntegro — nenhuma dependência oculta detectada`);
      } else {
        toast.warning(`"${m.module}": ${total} alerta(s) de integridade — veja detalhes no card`);
      }
    } catch (e) {
      toast.error(`Falha no scan: ${(e as Error).message}`);
    } finally {
      setScanLoading(false);
    }
  }

  return (
    <Card className="border-muted">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-base font-bold">{m.module}</CardTitle>
              <Badge variant="outline" className={CATEGORY_BADGE[m.category]}>
                {m.category}
              </Badge>
              <Badge variant="outline" className="font-mono text-[10px]">
                v{version}
              </Badge>
            </div>
            <CardDescription className="text-xs">{m.description}</CardDescription>
          </div>
          <div className="flex shrink-0 flex-col gap-1.5">
            <Button
              variant="default"
              size="sm"
              onClick={() =>
                copyToClipboard(
                  buildModuleMigrationPrompt(m),
                  `Prompt de migração de "${m.module}" copiado — cole em outro projeto Lovable`,
                )
              }
              title="Gera prompt em linguagem natural para portar este módulo a outro projeto Lovable"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Prompt
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                copyToClipboard(
                  buildModuleManifestJson(m),
                  `Manifesto de "${m.module}" copiado`,
                )
              }
            >
              <ClipboardCopy className="h-3.5 w-3.5" />
              JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBundle}
              disabled={bundleLoading}
              title="Baixa um .txt com manifesto + código completo + migrations deste módulo"
            >
              {bundleLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Bundle
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleScan}
              disabled={scanLoading}
              title="Detecta imports @/... fora do escopo declarado do módulo"
            >
              {scanLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ShieldCheck className="h-3.5 w-3.5" />
              )}
              Scan
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Arquivos-chave
          </p>
          <div className="flex flex-wrap gap-1.5">
            {m.files.map((path) => (
              <button
                key={path}
                type="button"
                onClick={() => copyToClipboard(path, `Path copiado: ${path}`)}
                className="group inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-mono text-foreground/80 transition-colors hover:border-primary/40 hover:bg-muted hover:text-foreground"
                title={`Copiar ${path}`}
              >
                <FileCode className="h-3 w-3 text-muted-foreground group-hover:text-primary" />
                <span className="max-w-[280px] truncate">{path}</span>
                <Copy className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            ))}
          </div>
        </div>

        {m.routes && m.routes.length > 0 && (
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <Route className="h-3 w-3" /> Rotas
            </p>
            <div className="flex flex-wrap gap-1.5">
              {m.routes.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => copyToClipboard(r, `Rota copiada: ${r}`)}
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-0.5 font-mono text-[11px] text-foreground/80 hover:bg-muted"
                  title={`Copiar ${r}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        )}

        {m.supabaseTables && m.supabaseTables.length > 0 && (
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <Database className="h-3 w-3" /> Tabelas Supabase
            </p>
            <div className="flex flex-wrap gap-1.5">
              {m.supabaseTables.map((t) => (
                <Badge key={t} variant="secondary" className="font-mono text-[10px]">
                  {t}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {m.edgeFunctions && m.edgeFunctions.length > 0 && (
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <Zap className="h-3 w-3" /> Edge Functions
            </p>
            <div className="flex flex-wrap gap-1.5">
              {m.edgeFunctions.map((fn) => {
                const path = `supabase/functions/${fn}/index.ts`;
                return (
                  <button
                    key={fn}
                    type="button"
                    onClick={() => copyToClipboard(path, `Path copiado: ${path}`)}
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-0.5 font-mono text-[11px] text-foreground/80 hover:bg-muted"
                    title={`Copiar ${path}`}
                  >
                    {fn}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {m.secrets && m.secrets.length > 0 && (
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <KeyRound className="h-3 w-3" /> Secrets necessários
            </p>
            <div className="flex flex-wrap gap-1.5">
              {m.secrets.map((s) => (
                <Badge key={s} variant="outline" className="font-mono text-[10px]">
                  {s}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {m.dependencies &&
          (m.dependencies.hooks?.length ||
            m.dependencies.contexts?.length ||
            m.dependencies.ui?.length) && (
            <div className="grid gap-2 sm:grid-cols-3">
              {m.dependencies.hooks && m.dependencies.hooks.length > 0 && (
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Hooks
                  </p>
                  <p className="text-[11px] text-foreground/80">
                    {m.dependencies.hooks.join(', ')}
                  </p>
                </div>
              )}
              {m.dependencies.contexts && m.dependencies.contexts.length > 0 && (
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Contexts
                  </p>
                  <p className="text-[11px] text-foreground/80">
                    {m.dependencies.contexts.join(', ')}
                  </p>
                </div>
              )}
              {m.dependencies.ui && m.dependencies.ui.length > 0 && (
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    UI / Libs
                  </p>
                  <p className="text-[11px] text-foreground/80">
                    {m.dependencies.ui.join(', ')}
                  </p>
                </div>
              )}
            </div>
          )}

        {report && <IntegrityPanel report={report} />}
      </CardContent>
    </Card>
  );
}

function IntegrityPanel({ report }: { report: IntegrityReport }) {
  const total =
    report.undeclared.length + report.missing.length + report.declaredElsewhere.length;

  if (total === 0) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-severity-bom/30 bg-severity-bom/5 p-2 text-[11px] text-severity-bom">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Íntegro — {report.filesScanned} arquivos escaneados, {report.totalImports} imports
        verificados.
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-md border border-severity-moderado/30 bg-severity-moderado/5 p-2">
      <div className="flex items-center gap-2 text-[11px] font-semibold text-severity-moderado">
        <AlertTriangle className="h-3.5 w-3.5" />
        {total} alerta(s) de integridade ({report.filesScanned} arquivos,{' '}
        {report.totalImports} imports)
      </div>

      {report.missing.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Arquivos declarados inexistentes ({report.missing.length})
          </p>
          <ul className="ml-3 list-disc text-[11px] text-foreground/80">
            {report.missing.map((f) => (
              <li key={f} className="font-mono">
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      {report.declaredElsewhere.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Acoplamento com outros módulos ({report.declaredElsewhere.length})
          </p>
          <ul className="ml-3 list-disc text-[11px] text-foreground/80">
            {report.declaredElsewhere.slice(0, 8).map((d) => (
              <li key={d.import}>
                <span className="font-mono">{d.import}</span> →{' '}
                <span className="font-semibold">{d.ownedBy}</span>
              </li>
            ))}
            {report.declaredElsewhere.length > 8 && (
              <li className="text-muted-foreground">
                … +{report.declaredElsewhere.length - 8} outros
              </li>
            )}
          </ul>
        </div>
      )}

      {report.undeclared.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Imports órfãos — não declarados em nenhum módulo ({report.undeclared.length})
          </p>
          <ul className="ml-3 list-disc text-[11px] text-foreground/80">
            {report.undeclared.slice(0, 8).map((f) => (
              <li key={f} className="font-mono">
                {f}
              </li>
            ))}
            {report.undeclared.length > 8 && (
              <li className="text-muted-foreground">
                … +{report.undeclared.length - 8} outros
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export function ModuleLibrary() {
  const [query, setQuery] = useState('');
  const sections = useMemo(() => filterSections(MODULE_LIBRARY, query), [query]);

  const totals = useMemo(() => {
    const totalModules = MODULE_LIBRARY.reduce((acc, s) => acc + s.modules.length, 0);
    const totalFiles = MODULE_LIBRARY.reduce(
      (acc, s) => acc + s.modules.reduce((a, m) => a + m.files.length, 0),
      0,
    );
    return { totalModules, totalFiles };
  }, []);

  const defaultOpen = sections.map((s) => s.category);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Library className="h-5 w-5 text-primary" />
              Biblioteca de Módulos
            </CardTitle>
            <CardDescription>
              Catálogo interno dos blocos funcionais do SISTUR — copie paths, tabelas ou o
              manifesto JSON completo para reutilizar em outros projetos.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{totals.totalModules} módulos</Badge>
            <Badge variant="outline">{totals.totalFiles} arquivos</Badge>
            <Badge variant="outline">{MODULE_LIBRARY.length} seções</Badge>
          </div>
        </div>

        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome, descrição, arquivo ou tabela…"
            className="pl-9"
          />
        </div>
      </CardHeader>
      <CardContent>
        {sections.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            Nenhum módulo encontrado para “{query}”.
          </div>
        ) : (
          <Accordion type="multiple" defaultValue={defaultOpen} className="w-full">
              {sections.map((section) => (
                <AccordionItem key={section.category} value={section.category}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex flex-1 items-center justify-between gap-3 pr-3">
                      <div className="text-left">
                        <p className="text-sm font-semibold">{section.title}</p>
                        <p className="text-xs text-muted-foreground">{section.subtitle}</p>
                      </div>
                      <Badge variant="outline" className={CATEGORY_BADGE[section.category]}>
                        {section.modules.length}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid gap-3 pt-2 md:grid-cols-2">
                      {section.modules.map((m) => (
                        <ModuleCard key={`${section.category}-${m.module}`} m={m} />
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
        )}
      </CardContent>
    </Card>
  );
}

export default ModuleLibrary;