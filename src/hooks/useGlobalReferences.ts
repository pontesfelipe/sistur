import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const REFERENCE_CATEGORIES = [
  { value: 'plano_nacional', label: 'Plano Nacional de Turismo' },
  { value: 'legislacao', label: 'Legislação' },
  { value: 'politica_publica', label: 'Política Pública' },
  { value: 'metodologia', label: 'Metodologia' },
  { value: 'benchmark', label: 'Benchmark / Referência' },
  { value: 'diretriz', label: 'Diretriz Institucional' },
  { value: 'outro', label: 'Outro' },
] as const;

export const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.xlsx', '.csv', '.txt'];

export interface GlobalReferenceFile {
  id: string;
  file_name: string;
  storage_path: string;
  file_type: string;
  file_size_bytes: number;
  description: string | null;
  category: string;
  summary: string | null;
  is_active: boolean;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useGlobalReferenceFiles() {
  return useQuery({
    queryKey: ['global-reference-files'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('global_reference_files' as any)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as GlobalReferenceFile[];
    },
  });
}

export function useUploadGlobalReference() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, description, category, summary }: {
      file: File;
      description?: string;
      category: string;
      summary?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const storagePath = `${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('global-references')
        .upload(storagePath, file);
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('global_reference_files' as any)
        .insert({
          file_name: file.name,
          storage_path: storagePath,
          file_type: file.type || `application/${ext}`,
          file_size_bytes: file.size,
          description: description || null,
          category,
          summary: summary || null,
          uploaded_by: user.id,
        } as any);
      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-reference-files'] });
      toast.success('Documento de referência enviado');
    },
    onError: (e: any) => toast.error('Erro ao enviar: ' + e.message),
  });
}

export function useUpdateGlobalReference() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, summary, description, is_active }: {
      id: string;
      summary?: string;
      description?: string;
      is_active?: boolean;
    }) => {
      const updates: any = { updated_at: new Date().toISOString() };
      if (summary !== undefined) updates.summary = summary;
      if (description !== undefined) updates.description = description;
      if (is_active !== undefined) updates.is_active = is_active;

      const { error } = await supabase
        .from('global_reference_files' as any)
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-reference-files'] });
      toast.success('Referência atualizada');
    },
    onError: (e: any) => toast.error('Erro: ' + e.message),
  });
}

export function useDeleteGlobalReference() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: GlobalReferenceFile) => {
      await supabase.storage.from('global-references').remove([file.storage_path]);
      const { error } = await supabase
        .from('global_reference_files' as any)
        .delete()
        .eq('id', file.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-reference-files'] });
      toast.success('Referência removida');
    },
    onError: (e: any) => toast.error('Erro: ' + e.message),
  });
}

export function useDownloadGlobalReference() {
  return useMutation({
    mutationFn: async (file: GlobalReferenceFile) => {
      const { data, error } = await supabase.storage
        .from('global-references')
        .download(file.storage_path);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.file_name;
      a.click();
      URL.revokeObjectURL(url);
    },
    onError: (e: any) => toast.error('Erro ao baixar: ' + e.message),
  });
}
