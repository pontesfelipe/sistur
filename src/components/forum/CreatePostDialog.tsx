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
import { supabase } from '@/integrations/supabase/client';
import { Globe, Building2, Loader2, X, Upload, FileText, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_FILE_TYPES = ['image/jpeg', 'image/jpg', 'application/pdf'];

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
    attachment_url?: string | null;
    attachment_type?: string | null;
  };
}

export function CreatePostDialog({ open, onOpenChange, editPost }: CreatePostDialogProps) {
  const { createPost, updatePost } = useForum();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(editPost?.attachment_url || editPost?.image_url || null);
  const [attachmentType, setAttachmentType] = useState<string | null>(editPost?.attachment_type || null);
  const [isUploading, setIsUploading] = useState(false);

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      toast.error('Tipo de arquivo não permitido. Use JPEG ou PDF.');
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Arquivo muito grande. Máximo 10MB.');
      return;
    }

    setAttachmentFile(file);
    setAttachmentType(file.type);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachmentPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setAttachmentPreview(null);
    }
  };

  const removeAttachment = () => {
    setAttachmentFile(null);
    setAttachmentPreview(null);
    setAttachmentType(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadFile = async (file: File): Promise<string> => {
    if (!user) throw new Error('Usuário não autenticado');

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('forum-attachments')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('forum-attachments')
      .getPublicUrl(fileName);

    return data.publicUrl;
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsUploading(true);

      let attachmentUrl: string | undefined;
      let imageUrl: string | undefined;
      let fileType: string | undefined;

      // Upload file if selected
      if (attachmentFile) {
        attachmentUrl = await uploadFile(attachmentFile);
        fileType = attachmentFile.type;

        // If it's an image, also set it as image_url for backwards compatibility
        if (attachmentFile.type.startsWith('image/')) {
          imageUrl = attachmentUrl;
        }
      } else if (attachmentPreview && !attachmentFile) {
        // Keep existing attachment if editing
        attachmentUrl = editPost?.attachment_url || editPost?.image_url || undefined;
        fileType = editPost?.attachment_type || undefined;
        if (attachmentUrl?.includes('image') || editPost?.image_url) {
          imageUrl = attachmentUrl;
        }
      }

      const data: CreatePostData = {
        title: values.title,
        content: values.content,
        visibility: values.visibility,
        category: values.category,
        image_url: imageUrl,
        attachment_url: attachmentUrl,
        attachment_type: fileType,
      };

      if (isEditing) {
        await updatePost.mutateAsync({ id: editPost.id, ...data });
      } else {
        await createPost.mutateAsync(data);
      }

      form.reset();
      removeAttachment();
      onOpenChange(false);
    } catch (error: any) {
      toast.error('Erro ao salvar post: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const isLoading = createPost.isPending || updatePost.isPending || isUploading;

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

            {/* File Upload Section */}
            <div className="space-y-2">
              <Label>Anexo (opcional)</Label>
              <p className="text-xs text-muted-foreground mb-2">
                JPEG ou PDF, até 10MB
              </p>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.pdf"
                onChange={handleFileSelect}
                className="hidden"
              />

              {!attachmentFile && !attachmentPreview ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-24 border-dashed"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-6 w-6 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Clique para anexar imagem ou PDF
                    </span>
                  </div>
                </Button>
              ) : (
                <div className="relative border rounded-lg p-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6"
                    onClick={removeAttachment}
                  >
                    <X className="h-4 w-4" />
                  </Button>

                  {attachmentType?.startsWith('image/') || attachmentPreview?.startsWith('data:image') ? (
                    <div className="rounded-lg overflow-hidden">
                      <img
                        src={attachmentPreview || ''}
                        alt="Preview"
                        className="w-full h-48 object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 py-2">
                      <div className="p-2 bg-muted rounded-lg">
                        <FileText className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {attachmentFile?.name || 'Documento PDF'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {attachmentFile 
                            ? `${(attachmentFile.size / 1024 / 1024).toFixed(2)} MB`
                            : 'PDF anexado'}
                        </p>
                      </div>
                    </div>
                  )}
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