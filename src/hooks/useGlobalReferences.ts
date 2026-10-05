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

/** Gera (ou melhora) o resumo de um documento lendo o arquivo inteiro com IA. */
export async function generateReferenceSummary(
  input: { file: File; category?: string; description?: string } | { id: string; improve?: boolean },
): Promise<{ summary: string; chars_read: number; truncated: boolean }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Não autenticado');
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/summarize-global-reference`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${session.access_token}`,
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  };
  let body: BodyInit;
  if ('file' in input) {
    const fd = new FormData();
    fd.append('file', input.file);
    if (input.category) fd.append('category', input.category);
    if (input.description) fd.append('description', input.description);
    body = fd;
  } else {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(input);
  }
  const resp = await fetch(url, { method: 'POST', headers, body });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data.error || 'Falha ao gerar resumo');
  return data;
}
