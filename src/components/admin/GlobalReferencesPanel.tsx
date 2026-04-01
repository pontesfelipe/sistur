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
  File, FileSpreadsheet, BookOpenCheck, Eye, EyeOff,
} from 'lucide-react';
import {
  useGlobalReferenceFiles, useUploadGlobalReference, useDeleteGlobalReference,
  useDownloadGlobalReference, useUpdateGlobalReference,
  REFERENCE_CATEGORIES, ACCEPTED_EXTENSIONS, GlobalReferenceFile,
} from '@/hooks/useGlobalReferences';
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
              Referências Globais
            </CardTitle>
            <CardDescription className="mt-1">
              Documentos de referência usados automaticamente na geração de relatórios e diagnósticos (ex: PNT, legislação, diretrizes)
            </CardDescription>
          </div>
          <Button onClick={() => setUploadOpen(true)}>
            <Upload className="h-4 w-4 mr-2" /> Adicionar
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
            <p className="text-lg font-medium">Nenhum documento de referência</p>
            <p className="text-sm">Adicione documentos como o Plano Nacional de Turismo para enriquecer relatórios</p>
            <Button variant="outline" className="mt-4" onClick={() => setUploadOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Adicionar documento
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
  const catLabel = REFERENCE_CATEGORIES.find(c => c.value === file.category)?.label || file.category;

  return (
    <div className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${file.is_active ? 'hover:border-primary/30' : 'opacity-60 bg-muted/30'}`}>
      {fileIcon(file.file_type)}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium truncate">{file.file_name}</p>
          <Badge variant="secondary" className="text-xs shrink-0">{catLabel}</Badge>
          {!file.is_active && (
            <Badge variant="outline" className="text-xs shrink-0 bg-destructive/10 text-destructive">
              <EyeOff className="h-3 w-3 mr-1" /> Inativo
            </Badge>
          )}
          {file.summary && (
            <Badge variant="outline" className="text-xs shrink-0 bg-primary/5">
              Resumo ✓
            </Badge>
          )}
        </div>
        {file.description && <p className="text-sm text-muted-foreground truncate mt-0.5">{file.description}</p>}
        <p className="text-xs text-muted-foreground mt-1">
          {formatSize(file.file_size_bytes)} • {format(new Date(file.created_at), "dd MMM yyyy", { locale: ptBR })}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Switch
          checked={file.is_active}
          onCheckedChange={(checked) => updateFile.mutate({ id: file.id, is_active: checked })}
          title={file.is_active ? 'Ativo (usado nos relatórios)' : 'Inativo'}
        />
        <Button size="icon" variant="ghost" onClick={onEdit} title="Editar resumo">
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
              <AlertDialogTitle>Remover referência?</AlertDialogTitle>
              <AlertDialogDescription>
                O documento "{file.file_name}" será removido permanentemente.
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
          <DialogTitle>Adicionar Documento de Referência</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <input ref={fileRef} type="file" accept={ACCEPTED_EXTENSIONS.join(',')} className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
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
          <Input placeholder="Descrição (ex: Plano Nacional de Turismo 2024-2027)" value={description} onChange={e => setDescription(e.target.value)} />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              {REFERENCE_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Textarea
            placeholder="Resumo do documento (será injetado nos prompts de geração de relatórios)"
            value={summary}
            onChange={e => setSummary(e.target.value)}
            rows={4}
          />
          <p className="text-xs text-muted-foreground">
            💡 O resumo é fundamental: ele será incluído automaticamente no contexto da IA ao gerar relatórios e diagnósticos.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!file || uploadFile.isPending}>
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

  const handleSubmit = async () => {
    await updateFile.mutateAsync({ id: file.id, description, summary });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Referência: {file.file_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input placeholder="Descrição" value={description} onChange={e => setDescription(e.target.value)} />
          <Textarea
            placeholder="Resumo do documento (injetado nos relatórios via IA)"
            value={summary}
            onChange={e => setSummary(e.target.value)}
            rows={6}
          />
          <p className="text-xs text-muted-foreground">
            💡 Inclua os pontos-chave: metas quantitativas, princípios, eixos de atuação, tendências e diretrizes que devem contextualizar os relatórios.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={updateFile.isPending}>
            {updateFile.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
