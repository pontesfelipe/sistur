import { tx } from '@/i18n/t';
import { getDateLocale } from '@/i18n/dateLocale';
import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Upload, FileText, Trash2, Download, Edit, FolderOpen, Plus,
  File, FileSpreadsheet, BookOpenCheck, Eye, EyeOff, Sparkles, Loader2, RefreshCw, Search,
} from 'lucide-react';
import {
  useGlobalReferenceFiles, useUploadGlobalReference, useDeleteGlobalReference,
  useDownloadGlobalReference, useUpdateGlobalReference,
  REFERENCE_CATEGORIES, ACCEPTED_EXTENSIONS, GlobalReferenceFile, generateReferenceSummary,
  indexGlobalReference, searchGlobalReferenceChunks, ReferenceChunkHit,
} from '@/hooks/useGlobalReferences';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ptBR } from 'date-fns/locale';

function IndexBadge({ file }: { file: GlobalReferenceFile }) {
  const s = file.index_status || 'pending';
  if (s === 'ready') return <Badge variant="outline" className="text-xs shrink-0">{tx('{{v0}} trechos', { v0: file.chunk_count ?? 0 })}</Badge>;
  if (s === 'indexing') return <Badge variant="outline" className="text-xs shrink-0">{tx('Indexando…')}</Badge>;
  if (s === 'error') return <Badge variant="outline" className="text-xs shrink-0 text-destructive">{tx('Erro na indexação')}</Badge>;
  return <Badge variant="outline" className="text-xs shrink-0 text-muted-foreground">{tx('Não indexado')}</Badge>;
}

function SearchTester() {
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [hits, setHits] = useState<ReferenceChunkHit[] | null>(null);
  const run = async () => {
    if (q.trim().length < 8) return;
    setLoading(true);
    try { setHits(await searchGlobalReferenceChunks(q, 3)); }
    catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div>
        <p className="font-medium text-sm">{tx('Testar busca por trechos')}</p>
        <p className="text-xs text-muted-foreground">{tx('Veja quais trechos dos documentos o Professor Beni receberia para uma pergunta.')}</p>
      </div>
      <div className="flex gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && run()}
          placeholder={tx('Ex.: o que a política nacional diz sobre pousadas históricas?')} />
        <Button onClick={run} disabled={loading || q.trim().length < 8}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </div>
      {hits && hits.length === 0 && <p className="text-sm text-muted-foreground">{tx('Nenhum trecho relevante encontrado.')}</p>}
      {hits?.map((h) => (
        <div key={h.id} className="text-sm border-l-2 border-primary pl-3">
          <p className="text-xs text-muted-foreground">{h.file_name}{h.page ? ` · p. ${h.page}` : ''} · {Math.round(h.similarity * 100)}%</p>
          <p className="line-clamp-4">{h.content}</p>
        </div>
      ))}
    </div>
  );
}

const fileIcon = (type: string) => {
  if (type.includes('pdf')) return <FileText className="h-5 w-5 text-destructive" />;
  if (type.includes('spreadsheet') || type.includes('csv') || type.includes('excel'))
    return <FileSpreadsheet className="h-5 w-5 text-primary" />;
  return <File className="h-5 w-5 text-muted-foreground" />;
};

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

export function GlobalReferencesPanel() {
  const { data: files = [], isLoading } = useGlobalReferenceFiles();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editFile, setEditFile] = useState<GlobalReferenceFile | null>(null);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BookOpenCheck className="h-5 w-5 text-primary" />
              {tx("Referências Globais")}
            </CardTitle>
            <CardDescription className="mt-1">
              {tx("Documentos de referência usados automaticamente na geração de relatórios e diagnósticos (ex: PNT, legislação, diretrizes)")}
            </CardDescription>
          </div>
          <Button onClick={() => setUploadOpen(true)}>
            <Upload className="h-4 w-4 mr-2" /> {tx("Adicionar")}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map(i => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
            <FolderOpen className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-lg font-medium">{tx("Nenhum documento de referência")}</p>
            <p className="text-sm">{tx("Adicione documentos como o Plano Nacional de Turismo para enriquecer relatórios")}</p>
            <Button variant="outline" className="mt-4" onClick={() => setUploadOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> {tx("Adicionar documento")}
            </Button>
          </div>
        ) : (
          files.map(file => (
            <ReferenceFileCard key={file.id} file={file} onEdit={() => setEditFile(file)} />
          ))
        )}

        <p className="text-xs text-muted-foreground text-center pt-2">
          {files.length} documento{files.length !== 1 ? 's' : ''} de referência •
          Estes documentos são injetados automaticamente nos relatórios gerados por IA
        </p>

        {files.length > 0 && <SearchTester />}

        <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />
        {editFile && <EditDialog file={editFile} open={!!editFile} onOpenChange={(v) => !v && setEditFile(null)} />}
      </CardContent>
    </Card>
  );
}

function ReferenceFileCard({ file, onEdit }: { file: GlobalReferenceFile; onEdit: () => void }) {
  const deleteFile = useDeleteGlobalReference();
  const downloadFile = useDownloadGlobalReference();
  const updateFile = useUpdateGlobalReference();
  const queryClient = useQueryClient();
  const [indexing, setIndexing] = useState(false);
  const catLabel = REFERENCE_CATEGORIES.find(c => c.value === file.category)?.label || file.category;
  const reindex = async () => {
    setIndexing(true);
    try {
      const r = await indexGlobalReference(file.id);
      toast.success(tx('Documento dividido em {{v0}} trechos.', { v0: r.chunks }));
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIndexing(false);
      queryClient.invalidateQueries({ queryKey: ['global-reference-files'] });
    }
  };


  return (
    <div className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${file.is_active ? 'hover:border-primary/30' : 'opacity-60 bg-muted/30'}`}>
      {fileIcon(file.file_type)}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium truncate">{file.file_name}</p>
          <Badge variant="secondary" className="text-xs shrink-0">{catLabel}</Badge>
          {!file.is_active && (
            <Badge variant="outline" className="text-xs shrink-0 bg-destructive/10 text-destructive">
              <EyeOff className="h-3 w-3 mr-1" /> {tx("Inativo")}
            </Badge>
          )}
          {file.summary && (
            <Badge variant="outline" className="text-xs shrink-0 bg-primary/5">
              {tx("Resumo ✓")}
            </Badge>
          )}
          <IndexBadge file={file} />
        </div>
        {file.description && <p className="text-sm text-muted-foreground truncate mt-0.5">{file.description}</p>}
        <p className="text-xs text-muted-foreground mt-1">
          {formatSize(file.file_size_bytes)} • {format(new Date(file.created_at), "dd MMM yyyy", { locale: getDateLocale() })}
          {file.indexed_at && ` • ${tx("indexado em")} ${format(new Date(file.indexed_at), "dd MMM yyyy HH:mm", { locale: getDateLocale() })}`}
        </p>
        {file.index_status === 'error' && file.index_error && (
          <p className="text-xs text-destructive mt-1">{file.index_error}</p>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Switch
          checked={file.is_active}
          onCheckedChange={(checked) => updateFile.mutate({ id: file.id, is_active: checked })}
          title={file.is_active ? tx('Ativo (usado nos relatórios)') : 'Inativo'}
        />
        <Button size="icon" variant="ghost" onClick={reindex} disabled={indexing || file.index_status === 'indexing'} title={tx("Reindexar trechos")}>
          {indexing || file.index_status === 'indexing' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
        <Button size="icon" variant="ghost" onClick={onEdit} title={tx("Editar resumo")}>
          <Edit className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={() => downloadFile.mutate(file)} disabled={downloadFile.isPending}>
          <Download className="h-4 w-4" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{tx("Remover referência?")}</AlertDialogTitle>
              <AlertDialogDescription>
                {tx("O documento \"{{v0}}\" será removido permanentemente.", { v0: file.file_name })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{tx("Cancelar")}</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteFile.mutate(file)} className="bg-destructive text-destructive-foreground">
                {tx("Remover")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

function UploadDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const uploadFile = useUploadGlobalReference();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('plano_nacional');
  const [summary, setSummary] = useState('');
  const [generating, setGenerating] = useState(false);

  const runSummary = async (f: File) => {
    setGenerating(true);
    try {
      const r = await generateReferenceSummary({ file: f, category, description });
      setSummary(r.summary);
      toast.success(r.truncated ? 'Resumo gerado (documento muito longo: lida a parte inicial). Revise antes de salvar.' : 'Resumo gerado a partir do documento inteiro. Revise antes de salvar.');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async () => {
    if (!file) return;
    await uploadFile.mutateAsync({ file, description: description || undefined, category, summary: summary || undefined });
    setFile(null);
    setDescription('');
    setCategory('plano_nacional');
    setSummary('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{tx("Adicionar Documento de Referência")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <input ref={fileRef} type="file" accept={ACCEPTED_EXTENSIONS.join(',')} className="hidden" onChange={e => { const f = e.target.files?.[0] || null; setFile(f); if (f && !summary) runSummary(f); }} />
            <Button variant="outline" className="w-full h-24 border-dashed" onClick={() => fileRef.current?.click()}>
              {file ? (
                <div className="flex items-center gap-2">
                  {fileIcon(file.type)}
                  <span className="truncate max-w-[200px]">{file.name}</span>
                  <span className="text-xs text-muted-foreground">({formatSize(file.size)})</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                  <Upload className="h-6 w-6" />
                  <span className="text-sm">{tx("Clique para selecionar")}</span>
                  <span className="text-xs">{tx("PDF, DOCX, XLSX, CSV, TXT (máx. 20MB)")}</span>
                </div>
              )}
            </Button>
          </div>
          <Input placeholder={tx("Descrição (ex: Plano Nacional de Turismo 2024-2027)")} value={description} onChange={e => setDescription(e.target.value)} />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue placeholder={tx("Categoria")} /></SelectTrigger>
            <SelectContent>
              {REFERENCE_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{tx(String(c.label ?? ""))}</SelectItem>)}
            </SelectContent>
          </Select>
          <Textarea
            placeholder={tx("Resumo do documento (será injetado nos prompts de geração de relatórios)")}
            value={summary}
            onChange={e => setSummary(e.target.value)}
            rows={8}
            disabled={generating}
          />
          <Button type="button" variant="secondary" size="sm" disabled={!file || generating} onClick={() => file && runSummary(file)}>
            {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            {generating ? tx('Lendo o documento e gerando resumo...') : tx('Gerar resumo com IA')}
          </Button>
          <p className="text-xs text-muted-foreground">
            {tx("💡 Ao escolher o arquivo, a IA lê o documento inteiro e sugere o resumo. É ele que o Professor Beni e os relatórios usam — revise e ajuste antes de salvar.")}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{tx("Cancelar")}</Button>
          <Button onClick={handleSubmit} disabled={!file || uploadFile.isPending || generating}>
            {uploadFile.isPending ? 'Enviando...' : 'Adicionar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditDialog({ file, open, onOpenChange }: { file: GlobalReferenceFile; open: boolean; onOpenChange: (v: boolean) => void }) {
  const updateFile = useUpdateGlobalReference();
  const [description, setDescription] = useState(file.description || '');
  const [summary, setSummary] = useState(file.summary || '');
  const [generating, setGenerating] = useState(false);

  const runSummary = async () => {
    setGenerating(true);
    try {
      const r = await generateReferenceSummary({ id: file.id, improve: !!summary.trim() });
      setSummary(r.summary);
      toast.success('Nova versão do resumo pronta. Revise e clique em Salvar.');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async () => {
    await updateFile.mutateAsync({ id: file.id, description, summary });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{tx("Editar Referência: {{v0}}", { v0: file.file_name })}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input placeholder={tx("Descrição")} value={description} onChange={e => setDescription(e.target.value)} />
          <Textarea
            placeholder={tx("Resumo do documento (injetado nos relatórios via IA)")}
            value={summary}
            onChange={e => setSummary(e.target.value)}
            rows={12}
            disabled={generating}
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">{summary.length} {tx("caracteres")}</span>
            <Button type="button" variant="secondary" size="sm" disabled={generating} onClick={runSummary}>
              {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              {generating ? tx('Relendo o documento...') : summary.trim() ? tx('Melhorar com IA') : tx('Gerar resumo com IA')}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {tx("💡 Inclua os pontos-chave: metas quantitativas, princípios, eixos de atuação, tendências e diretrizes que devem contextualizar os relatórios.")}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{tx("Cancelar")}</Button>
          <Button onClick={handleSubmit} disabled={updateFile.isPending || generating}>
            {updateFile.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
