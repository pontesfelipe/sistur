import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  FileText, 
  Download, 
  Trash2, 
  Upload, 
  File, 
  FileSpreadsheet, 
  FileImage, 
  FileArchive,
  Loader2,
  Plus,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export interface TrainingMaterial {
  id: string;
  name: string;
  path: string;
  url: string;
  size: number;
  type: string;
  uploaded_at: string;
}

interface TrainingMaterialsManagerProps {
  trainingId: string;
  materials: TrainingMaterial[];
  onMaterialsChange: (materials: TrainingMaterial[]) => void;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileIcon = (type: string) => {
  if (type.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />;
  if (type.includes('spreadsheet') || type.includes('excel') || type.includes('csv')) 
    return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
  if (type.includes('image')) return <FileImage className="h-5 w-5 text-blue-500" />;
  if (type.includes('zip') || type.includes('rar') || type.includes('archive')) 
    return <FileArchive className="h-5 w-5 text-yellow-500" />;
  return <File className="h-5 w-5 text-muted-foreground" />;
};

const getFileExtension = (filename: string): string => {
  return filename.split('.').pop()?.toUpperCase() || 'FILE';
};

export function TrainingMaterialsManager({ 
  trainingId, 
  materials, 
  onMaterialsChange 
}: TrainingMaterialsManagerProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [deletingMaterial, setDeletingMaterial] = useState<TrainingMaterial | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newMaterials: TrainingMaterial[] = [...materials];

    try {
      for (const file of Array.from(files)) {
        // Validate file size (max 50MB)
        if (file.size > 50 * 1024 * 1024) {
          toast.error(`${file.name} excede o limite de 50MB`);
          continue;
        }

        const timestamp = Date.now();
        const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `${trainingId}/materials/${timestamp}-${safeFileName}`;

        const { data, error } = await supabase.storage
          .from('edu-videos')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (error) {
          toast.error(`Erro ao enviar ${file.name}: ${error.message}`);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from('edu-videos')
          .getPublicUrl(data.path);

        const newMaterial: TrainingMaterial = {
          id: `mat-${timestamp}`,
          name: file.name,
          path: data.path,
          url: urlData.publicUrl,
          size: file.size,
          type: file.type,
          uploaded_at: new Date().toISOString(),
        };

        newMaterials.push(newMaterial);
        toast.success(`${file.name} enviado com sucesso!`);
      }

      onMaterialsChange(newMaterials);
    } catch (error) {
      toast.error('Erro ao enviar arquivos');
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteMaterial = async (material: TrainingMaterial) => {
    try {
      const { error } = await supabase.storage
        .from('edu-videos')
        .remove([material.path]);

      if (error) {
        toast.error(`Erro ao remover: ${error.message}`);
        return;
      }

      const updatedMaterials = materials.filter(m => m.id !== material.id);
      onMaterialsChange(updatedMaterials);
      toast.success('Material removido!');
    } catch (error) {
      toast.error('Erro ao remover material');
      console.error('Delete error:', error);
    } finally {
      setDeletingMaterial(null);
    }
  };

  const handleDownload = (material: TrainingMaterial) => {
    window.open(material.url, '_blank');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Materiais de Apoio
          </CardTitle>
          <CardDescription>
            Adicione PDFs, planilhas, apresentações e outros documentos de suporte
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Upload area */}
          <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.csv,.png,.jpg,.jpeg"
            />
            <div className="flex flex-col items-center gap-2">
              {isUploading ? (
                <>
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                  <p className="text-sm text-muted-foreground">Enviando arquivos...</p>
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Arraste arquivos aqui ou clique para selecionar
                  </p>
                  <Button 
                    type="button"
                    variant="outline" 
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar Material
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF, Word, Excel, PowerPoint, imagens (máx. 50MB)
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Materials list */}
          {materials.length > 0 ? (
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {materials.length} {materials.length === 1 ? 'material' : 'materiais'} anexado{materials.length > 1 ? 's' : ''}
              </Label>
              <div className="divide-y rounded-lg border">
                {materials.map((material) => (
                  <div 
                    key={material.id}
                    className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
                  >
                    {getFileIcon(material.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" title={material.name}>
                        {material.name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {getFileExtension(material.name)}
                        </Badge>
                        <span>{formatFileSize(material.size)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownload(material)}
                        title="Baixar"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingMaterial(material)}
                        title="Remover"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground text-sm">
              <AlertCircle className="h-6 w-6 mx-auto mb-2 opacity-50" />
              Nenhum material anexado ainda
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingMaterial} onOpenChange={() => setDeletingMaterial(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover material?</AlertDialogTitle>
            <AlertDialogDescription>
              O arquivo "{deletingMaterial?.name}" será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingMaterial && handleDeleteMaterial(deletingMaterial)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
