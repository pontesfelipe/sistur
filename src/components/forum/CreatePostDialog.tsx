import { useState } from 'react';
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
import { Globe, Building2, Loader2, ImagePlus, X } from 'lucide-react';

const formSchema = z.object({
  title: z.string().min(5, 'Título deve ter pelo menos 5 caracteres'),
  content: z.string().min(10, 'Conteúdo deve ter pelo menos 10 caracteres'),
  visibility: z.enum(['org', 'public']),
  category: z.string(),
  image_url: z.string().optional(),
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
  };
}

export function CreatePostDialog({ open, onOpenChange, editPost }: CreatePostDialogProps) {
  const { createPost, updatePost } = useForum();
  const [imageUrl, setImageUrl] = useState(editPost?.image_url || '');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: editPost?.title || '',
      content: editPost?.content || '',
      visibility: editPost?.visibility || 'org',
      category: editPost?.category || 'general',
      image_url: editPost?.image_url || '',
    },
  });

  const isEditing = !!editPost;

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const data: CreatePostData = {
      title: values.title,
      content: values.content,
      visibility: values.visibility,
      category: values.category,
      image_url: imageUrl || undefined,
    };

    if (isEditing) {
      await updatePost.mutateAsync({ id: editPost.id, ...data });
    } else {
      await createPost.mutateAsync(data);
    }

    form.reset();
    setImageUrl('');
    onOpenChange(false);
  };

  const isLoading = createPost.isPending || updatePost.isPending;

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

            {/* Image URL Input */}
            <div className="space-y-2">
              <Label>Imagem (opcional)</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Cole a URL de uma imagem..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="flex-1"
                />
                {imageUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setImageUrl('')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {imageUrl && (
                <div className="relative mt-2 rounded-lg overflow-hidden border">
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="w-full h-48 object-cover"
                    onError={() => setImageUrl('')}
                  />
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
