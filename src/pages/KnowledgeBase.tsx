import { useState, useRef } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Upload, FileText, Trash2, Download, Search, Filter,
  File, FileSpreadsheet, BookOpen, FolderOpen, Plus, MapPin,
} from 'lucide-react';
import {
  useKnowledgeBaseFiles, useUploadKBFile, useDeleteKBFile, useDownloadKBFile,
  KB_CATEGORIES, ACCEPTED_EXTENSIONS, KBFile,
} from '@/hooks/useKnowledgeBase';
import { useDestinations } from '@/hooks/useDestinations';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const fileIcon = (type: string) => {
  if (type.includes('pdf')) return <FileText className="h-5 w-5 text-red-400" />;
  if (type.includes('spreadsheet') || type.includes('csv') || type.includes('excel'))
    return <FileSpreadsheet className="h-5 w-5 text-green-400" />;
  return <File className="h-5 w-5 text-muted-foreground" />;
};

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

export default function KnowledgeBase() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [destFilter, setDestFilter] = useState<string>('all');
  const [uploadOpen, setUploadOpen] = useState(false);

  const { data: files = [], isLoading } = useKnowledgeBaseFiles();
  const { data: destinations = [] } = useDestinations();

  const filtered = files.filter((f) => {
    const matchSearch = !search || f.file_name.toLowerCase().includes(search.toLowerCase())
      || f.description?.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === 'all' || f.category === categoryFilter;
    const matchDest = destFilter === 'all'
      || (destFilter === 'global' && !f.destination_id)
      || f.destination_id === destFilter;
    return matchSearch && matchCat && matchDest;
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" />
              Base de Conhecimento
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Documentos e dados de referência para enriquecer diagnósticos e relatórios
            </p>
          </div>
          <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} destinations={destinations} />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar arquivo..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {KB_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={destFilter} onValueChange={setDestFilter}>
            <SelectTrigger className="w-[200px]">
              <MapPin className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Destino" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="global">Global (organização)</SelectItem>
              {destinations.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* File list */}
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
                <Plus className="h-4 w-4 mr-2" /> Enviar arquivo
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {filtered.map(file => (
              <FileCard key={file.id} file={file} destinations={destinations} />
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

function FileCard({ file, destinations }: { file: KBFile; destinations: any[] }) {
  const deleteFile = useDeleteKBFile();
  const downloadFile = useDownloadKBFile();
  const dest = destinations.find((d: any) => d.id === file.destination_id);
  const catLabel = KB_CATEGORIES.find(c => c.value === file.category)?.label || file.category;

  return (
    <Card className="hover:border-primary/30 transition-colors">
      <CardContent className="flex items-center gap-4 py-4">
        {fileIcon(file.file_type)}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium truncate">{file.file_name}</p>
            <Badge variant="secondary" className="text-xs shrink-0">{catLabel}</Badge>
            {dest && <Badge variant="outline" className="text-xs shrink-0"><MapPin className="h-3 w-3 mr-1" />{dest.name}</Badge>}
            {!file.destination_id && <Badge variant="outline" className="text-xs shrink-0 bg-primary/5">Global</Badge>}
          </div>
          {file.description && <p className="text-sm text-muted-foreground truncate mt-0.5">{file.description}</p>}
          <p className="text-xs text-muted-foreground mt-1">
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
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('geral');
  const [destId, setDestId] = useState<string>('');

  const handleSubmit = async () => {
    if (!file) return;
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
    onOpenChange(false);
  };

  const accept = ACCEPTED_EXTENSIONS.join(',');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button><Upload className="h-4 w-4 mr-2" /> Enviar arquivo</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enviar para Base de Conhecimento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <input
              ref={fileRef}
              type="file"
              accept={accept}
              className="hidden"
              onChange={e => setFile(e.target.files?.[0] || null)}
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
          <Textarea placeholder="Descrição (opcional)" value={description} onChange={e => setDescription(e.target.value)} rows={2} />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              {KB_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={destId || 'global'} onValueChange={v => setDestId(v === 'global' ? '' : v)}>
            <SelectTrigger><SelectValue placeholder="Escopo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="global">Global (toda organização)</SelectItem>
              {destinations.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!file || uploadFile.isPending}>
            {uploadFile.isPending ? 'Enviando...' : 'Enviar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
