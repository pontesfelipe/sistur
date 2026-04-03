import { useState, useRef } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Upload, FileText, Trash2, Download, Search,
  File, FileSpreadsheet, BookOpen, FolderOpen, Plus, MapPin, ChevronDown, Globe,
  ShieldCheck, Loader2, AlertTriangle,
} from 'lucide-react';
import {
  useKnowledgeBaseFiles, useUploadKBFile, useDeleteKBFile, useDownloadKBFile,
  useModerateKBFile, KB_CATEGORIES, ACCEPTED_EXTENSIONS, KBFile,
} from '@/hooks/useKnowledgeBase';
import { useDestinations } from '@/hooks/useDestinations';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

export default function KnowledgeBase() {
  const [search, setSearch] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);

  const { data: files = [], isLoading } = useKnowledgeBaseFiles();
  const { destinations = [] } = useDestinations();

  const filtered = files.filter((f) => {
    return !search || f.file_name.toLowerCase().includes(search.toLowerCase())
      || f.description?.toLowerCase().includes(search.toLowerCase());
  });

  // Group files by destination
  const globalFiles = filtered.filter(f => !f.destination_id);
  const filesByDest = new Map<string, KBFile[]>();
  filtered.filter(f => f.destination_id).forEach(f => {
    const existing = filesByDest.get(f.destination_id!) || [];
    existing.push(f);
    filesByDest.set(f.destination_id!, existing);
  });

  // Sort destinations that have files
  const destsWithFiles = (destinations as any[]).filter((d: any) => filesByDest.has(d.id));

  return (
    <AppLayout title="Base de Conhecimento">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" />
              Base de Conhecimento
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Documentos de referência organizados por destino — usados automaticamente em diagnósticos e relatórios
            </p>
          </div>
          <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} destinations={destinations} />
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar arquivo..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FolderOpen className="h-12 w-12 mb-3 opacity-50" />
              <p className="text-lg font-medium">Nenhum arquivo encontrado</p>
              <p className="text-sm">Faça upload de documentos para criar sua base de conhecimento</p>
              <Button variant="outline" className="mt-4" onClick={() => setUploadOpen(true)}>
                <Plus className="h-4 w-4 mr-2" /> Upload de arquivo
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Global files */}
            {globalFiles.length > 0 && (
              <DestinationGroup
                label="Global (toda organização)"
                icon={<Globe className="h-4 w-4 text-primary" />}
                files={globalFiles}
                destinations={destinations}
                defaultOpen
              />
            )}

            {/* Files grouped by destination */}
            {destsWithFiles.map((dest: any) => (
              <DestinationGroup
                key={dest.id}
                label={`${dest.name}${dest.uf ? ` — ${dest.uf}` : ''}`}
                icon={<MapPin className="h-4 w-4 text-primary" />}
                files={filesByDest.get(dest.id) || []}
                destinations={destinations}
                defaultOpen
              />
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center">
          {files.length} arquivo{files.length !== 1 ? 's' : ''} na base de conhecimento •
          Aceitos: PDF, DOCX, XLSX, CSV, TXT (máx. 20MB)
        </p>
      </div>
    </AppLayout>
  );
}

function DestinationGroup({ label, icon, files, destinations, defaultOpen }: {
  label: string;
  icon: React.ReactNode;
  files: KBFile[];
  destinations: any[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? true);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between px-4 py-3 h-auto hover:bg-muted/50">
          <div className="flex items-center gap-2 font-semibold">
            {icon}
            {label}
            <Badge variant="secondary" className="text-xs ml-1">{files.length}</Badge>
          </div>
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="grid gap-2 pl-2">
          {files.map(file => (
            <FileCard key={file.id} file={file} destinations={destinations} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function FileCard({ file, destinations }: { file: KBFile; destinations: any[] }) {
  const deleteFile = useDeleteKBFile();
  const downloadFile = useDownloadKBFile();
  const catLabel = KB_CATEGORIES.find(c => c.value === file.category)?.label || file.category;

  return (
    <Card className="hover:border-primary/30 transition-colors">
      <CardContent className="flex items-center gap-4 py-3">
        {fileIcon(file.file_type)}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium truncate text-sm">{file.file_name}</p>
            <Badge variant="secondary" className="text-xs shrink-0">{catLabel}</Badge>
          </div>
          {file.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{file.description}</p>}
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatSize(file.file_size_bytes)} • {format(new Date(file.created_at), "dd MMM yyyy", { locale: ptBR })}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
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
                <AlertDialogTitle>Remover arquivo?</AlertDialogTitle>
                <AlertDialogDescription>
                  O arquivo "{file.file_name}" será removido da base de conhecimento.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteFile.mutate(file)} className="bg-destructive text-destructive-foreground">
                  Remover
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}

function UploadDialog({ open, onOpenChange, destinations }: { open: boolean; onOpenChange: (v: boolean) => void; destinations: any[] }) {
  const uploadFile = useUploadKBFile();
  const moderateFile = useModerateKBFile();
  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('geral');
  const [destId, setDestId] = useState<string>('');
  const [moderationResult, setModerationResult] = useState<{ approved: boolean; reason: string; relevance_score: number } | null>(null);
  const [moderating, setModerating] = useState(false);

  const cancelModeration = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setModerating(false);
  };

  const handleFileChange = async (selectedFile: File | null) => {
    setFile(selectedFile);
    setModerationResult(null);
    cancelModeration();

    if (!selectedFile) return;

    const controller = new AbortController();
    abortRef.current = controller;

    setModerating(true);

    // Timeout: 15 seconds max for moderation
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const result = await moderateFile.mutateAsync({
        file: selectedFile,
        description,
        category,
      });
      if (!controller.signal.aborted) {
        setModerationResult(result);
      }
    } catch {
      if (!controller.signal.aborted) {
        // On error, allow upload (fail-open)
        setModerationResult({ approved: true, reason: 'Moderação indisponível — upload permitido', relevance_score: 50 });
      }
    } finally {
      clearTimeout(timeout);
      if (!controller.signal.aborted) {
        setModerating(false);
      }
    }
  };

  const handleSubmit = async () => {
    if (!file || !moderationResult?.approved) return;
    await uploadFile.mutateAsync({
      file,
      description: description || undefined,
      category,
      destinationId: destId || null,
    });
    setFile(null);
    setDescription('');
    setCategory('geral');
    setDestId('');
    setModerationResult(null);
    onOpenChange(false);
  };

  const accept = ACCEPTED_EXTENSIONS.join(',');
  const isRejected = moderationResult && !moderationResult.approved;
  const isApproved = moderationResult?.approved;

  return (
    <Dialog open={open} onOpenChange={(v) => {
      if (!v) { cancelModeration(); setFile(null); setModerationResult(null); }
      onOpenChange(v);
    }}>
      <DialogTrigger asChild>
        <Button><Upload className="h-4 w-4 mr-2" /> Upload de arquivo</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload para Base de Conhecimento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <input
              ref={fileRef}
              type="file"
              accept={accept}
              className="hidden"
              onChange={e => handleFileChange(e.target.files?.[0] || null)}
            />
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
                  <span className="text-sm">Clique para selecionar</span>
                  <span className="text-xs">PDF, DOCX, XLSX, CSV, TXT (máx. 20MB)</span>
                </div>
              )}
            </Button>
          </div>

          {/* Moderation status */}
          {moderating && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
              <Loader2 className="h-4 w-4 animate-spin" />
              Verificando relevância do arquivo...
            </div>
          )}
          {isApproved && !moderating && (
            <div className="flex items-center gap-2 text-sm bg-primary/5 border border-primary/20 rounded-lg p-3">
              <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
              <span className="text-primary">{moderationResult.reason}</span>
            </div>
          )}
          {isRejected && !moderating && (
            <div className="flex items-start gap-2 text-sm bg-destructive/5 border border-destructive/20 rounded-lg p-3">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-destructive">Arquivo rejeitado</p>
                <p className="text-destructive/80">{moderationResult.reason}</p>
              </div>
            </div>
          )}

          <Select value={destId || 'global'} onValueChange={v => setDestId(v === 'global' ? '' : v)}>
            <SelectTrigger>
              <MapPin className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Destino" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="global">Global (toda organização)</SelectItem>
              {(destinations as any[]).map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}{d.uf ? ` — ${d.uf}` : ''}</SelectItem>)}
            </SelectContent>
          </Select>
          <Textarea placeholder="Descrição (opcional)" value={description} onChange={e => setDescription(e.target.value)} rows={2} />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              {KB_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!file || !isApproved || moderating || uploadFile.isPending}>
            {uploadFile.isPending ? 'Enviando...' : 'Upload'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
