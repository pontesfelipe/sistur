import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useForum, CreatePostData } from '@/hooks/useForum';
import { useAuth } from '@/hooks/useAuth';
import { useProfileContext } from '@/contexts/ProfileContext';
import { supabase } from '@/integrations/supabase/client';
import { Globe, Building2, Loader2, X, Upload, FileText, Image as ImageIcon, Plus } from 'lucide-react';
import { toast } from 'sonner';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ACCEPTED_FILE_TYPES = [...ACCEPTED_IMAGE_TYPES, 'application/pdf'];

const formSchema = z.object({
  title: z.string().min(5, 'Título deve ter pelo menos 5 caracteres').max(200, 'Título deve ter no máximo 200 caracteres'),
  content: z.string().min(10, 'Conteúdo deve ter pelo menos 10 caracteres').max(10000, 'Conteúdo deve ter no máximo 10.000 caracteres'),
  visibility: z.enum(['org', 'public']),
  category: z.string(),
});

const categories = [
  { value: 'general', label: 'Geral' },
  { value: 'question', label: 'Dúvida' },
  { value: 'discussion', label: 'Discussão' },
  { value: 'announcement', label: 'Anúncio' },
  { value: 'resource', label: 'Recurso' },
  { value: 'tip', label: 'Dica' },
];

interface CreatePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editPost?: {
    id: string;
    title: string;
    content: string;
    visibility: 'org' | 'public';
    category: string;
    image_url: string | null;
    image_urls?: string[] | null;
    attachment_url?: string | null;
    attachment_type?: string | null;
  };
}

export function CreatePostDialog({ open, onOpenChange, editPost }: CreatePostDialogProps) {
  const { createPost, updatePost } = useForum();
  const { user } = useAuth();
  const { profile } = useProfileContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  
  // Multi-image state
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>(
    editPost?.image_urls?.length ? editPost.image_urls :
    editPost?.image_url ? [editPost.image_url] : []
  );
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(editPost?.attachment_type === 'application/pdf' ? editPost?.attachment_url || null : null);
  const [isUploading, setIsUploading] = useState(false);
  const [maxImages, setMaxImages] = useState(6);

  // Load org moderation settings for max images
  useState(() => {
    const orgId = profile?.viewing_demo_org_id || profile?.org_id;
    if (orgId) {
      supabase
        .from('content_moderation_settings')
        .select('max_images_per_post')
        .eq('org_id', orgId)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.max_images_per_post) setMaxImages(data.max_images_per_post);
        });
    }
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: editPost?.title || '',
      content: editPost?.content || '',
      visibility: editPost?.visibility || 'org',
      category: editPost?.category || 'general',
    },
  });

  const isEditing = !!editPost;

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remainingSlots = maxImages - imagePreviews.length;
    if (files.length > remainingSlots) {
      toast.error(`Máximo de ${maxImages} imagens. Você pode adicionar mais ${remainingSlots}.`);
      return;
    }

    for (const file of files) {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        toast.error(`Tipo não suportado: ${file.name}. Use JPEG, PNG ou WebP.`);
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} é muito grande. Máximo 10MB.`);
        return;
      }
    }

    setImageFiles(prev => [...prev, ...files]);

    // Generate previews
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePdfSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast.error('Apenas arquivos PDF são aceitos.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Arquivo muito grande. Máximo 10MB.');
      return;
    }
    setPdfFile(file);
    setPdfUrl(null);
  };

  const removeImage = (index: number) => {
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    // Only remove from files if it's a new file (not existing URL)
    const existingCount = editPost?.image_urls?.length || (editPost?.image_url ? 1 : 0);
    if (index >= existingCount) {
      setImageFiles(prev => prev.filter((_, i) => i !== (index - existingCount)));
    }
  };

  const removePdf = () => {
    setPdfFile(null);
    setPdfUrl(null);
    if (pdfInputRef.current) pdfInputRef.current.value = '';
  };

  const uploadFile = async (file: File): Promise<string> => {
    if (!user) throw new Error('Usuário não autenticado');
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from('forum-attachments')
      .upload(fileName, file, { cacheControl: '3600', upsert: false });
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from('forum-attachments').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const moderateImage = async (url: string): Promise<{ approved: boolean; reason: string }> => {
    try {
      const orgId = profile?.viewing_demo_org_id || profile?.org_id;
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/moderate-image`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ imageUrl: url, orgId }),
        }
      );
      if (!response.ok) return { approved: true, reason: 'Moderação indisponível' };
      return await response.json();
    } catch {
      return { approved: true, reason: 'Erro na moderação' };
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsUploading(true);

      // Upload new images
      const uploadedUrls: string[] = [];
      
      // Keep existing URLs that weren't removed
      const existingUrls = editPost?.image_urls?.length 
        ? editPost.image_urls.filter((_, i) => i < imagePreviews.length)
        : editPost?.image_url && imagePreviews.length > 0 ? [editPost.image_url] : [];
      
      // Only include existing URLs that are still in previews  
      for (const url of existingUrls) {
        if (imagePreviews.includes(url)) {
          uploadedUrls.push(url);
        }
      }

      // Upload and moderate new files
      if (imageFiles.length > 0) {
        toast.info(`Enviando e verificando ${imageFiles.length} imagem(ns)...`);
        
        for (const file of imageFiles) {
          const url = await uploadFile(file);
          const moderation = await moderateImage(url);
          
          if (!moderation.approved) {
            // Delete rejected file
            const filePath = url.split('/forum-attachments/')[1];
            if (filePath) {
              await supabase.storage.from('forum-attachments').remove([filePath]);
            }
            toast.error(`Imagem rejeitada: ${moderation.reason}`);
            setIsUploading(false);
            return;
          }
          uploadedUrls.push(url);
        }
      }

      // Upload PDF if new
      let attachmentUrl: string | undefined;
      let attachmentType: string | undefined;
      if (pdfFile) {
        attachmentUrl = await uploadFile(pdfFile);
        attachmentType = 'application/pdf';
      } else if (pdfUrl) {
        attachmentUrl = pdfUrl;
        attachmentType = 'application/pdf';
      }

      const data: CreatePostData = {
        title: values.title,
        content: values.content,
        visibility: values.visibility,
        category: values.category,
        image_url: uploadedUrls[0] || undefined,
        image_urls: uploadedUrls,
        attachment_url: attachmentUrl,
        attachment_type: attachmentType,
      };

      if (isEditing) {
        await updatePost.mutateAsync({ id: editPost.id, ...data });
      } else {
        await createPost.mutateAsync(data);
      }

      form.reset();
      setImageFiles([]);
      setImagePreviews([]);
      setPdfFile(null);
      setPdfUrl(null);
      onOpenChange(false);
    } catch (error: any) {
      toast.error('Erro ao salvar post: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const isLoading = createPost.isPending || updatePost.isPending || isUploading;
  const canAddMoreImages = imagePreviews.length < maxImages;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Post' : 'Criar Novo Post'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input placeholder="Digite o título do seu post..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Conteúdo</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Compartilhe seus pensamentos, perguntas ou conhecimento..."
                      className="min-h-[150px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma categoria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="visibility"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Visibilidade</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="org" id="org" />
                          <Label htmlFor="org" className="flex items-center gap-1 cursor-pointer">
                            <Building2 className="h-4 w-4" />
                            Organização
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="public" id="public" />
                          <Label htmlFor="public" className="flex items-center gap-1 cursor-pointer">
                            <Globe className="h-4 w-4" />
                            Público
                          </Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Multi-Image Upload Section */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Imagens ({imagePreviews.length}/{maxImages})
              </Label>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                multiple
                onChange={handleImageSelect}
                className="hidden"
              />

              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {imagePreviews.map((preview, idx) => (
                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border">
                      <img src={preview} alt="" className="w-full h-full object-cover" />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6"
                        onClick={() => removeImage(idx)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  
                  {canAddMoreImages && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/25 flex flex-col items-center justify-center gap-1 hover:border-primary/50 hover:bg-muted/50 transition-colors"
                    >
                      <Plus className="h-6 w-6 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Adicionar</span>
                    </button>
                  )}
                </div>
              )}

              {imagePreviews.length === 0 && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-20 border-dashed"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="flex flex-col items-center gap-1">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Adicionar imagens (até {maxImages})
                    </span>
                  </div>
                </Button>
              )}
            </div>

            {/* PDF Upload Section */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                PDF (opcional)
              </Label>

              <input
                ref={pdfInputRef}
                type="file"
                accept=".pdf"
                onChange={handlePdfSelect}
                className="hidden"
              />

              {!pdfFile && !pdfUrl ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => pdfInputRef.current?.click()}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Anexar PDF
                </Button>
              ) : (
                <div className="flex items-center gap-3 p-2 bg-muted rounded-lg">
                  <FileText className="h-5 w-5 text-primary" />
                  <span className="text-sm flex-1 truncate">
                    {pdfFile?.name || 'PDF anexado'}
                  </span>
                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={removePdf}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Salvar' : 'Publicar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
