import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfileContext } from '@/contexts/ProfileContext';
import { toast } from 'sonner';

export interface KBFile {
  id: string;
  org_id: string;
  destination_id: string | null;
  uploaded_by: string;
  file_name: string;
  file_type: string;
  file_size_bytes: number;
  storage_path: string;
  description: string | null;
  category: string;
  tags: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const KB_CATEGORIES = [
  { value: 'geral', label: 'Geral' },
  { value: 'plano_diretor', label: 'Plano Diretor' },
  { value: 'legislacao', label: 'Legislação' },
  { value: 'pesquisa', label: 'Pesquisa / Estudo' },
  { value: 'dados_oficiais', label: 'Dados Oficiais' },
  { value: 'relatorio', label: 'Relatório' },
  { value: 'inventario', label: 'Inventário Turístico' },
  { value: 'orcamento', label: 'Orçamento' },
] as const;

export { KB_CATEGORIES };

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'text/plain',
];

const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.xlsx', '.xls', '.csv', '.txt'];

export { ACCEPTED_TYPES, ACCEPTED_EXTENSIONS };

export function useKnowledgeBaseFiles(destinationId?: string | null) {
  const { effectiveOrgId } = useProfileContext();

  return useQuery({
    queryKey: ['knowledge-base-files', effectiveOrgId, destinationId],
    queryFn: async () => {
      let query = supabase
        .from('knowledge_base_files')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (destinationId) {
        query = query.or(`destination_id.eq.${destinationId},destination_id.is.null`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as KBFile[];
    },
    enabled: !!effectiveOrgId,
  });
}

export function useUploadKBFile() {
  const qc = useQueryClient();
  const { effectiveOrgId } = useProfileContext();

  return useMutation({
    mutationFn: async ({
      file,
      description,
      category,
      tags,
      destinationId,
    }: {
      file: File;
      description?: string;
      category: string;
      tags?: string[];
      destinationId?: string | null;
    }) => {
      if (!effectiveOrgId) throw new Error('Organização não identificada');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
      const storagePath = `${effectiveOrgId}/${crypto.randomUUID()}.${ext}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('knowledge-base')
        .upload(storagePath, file, { contentType: file.type });

      if (uploadError) throw uploadError;

      // Insert metadata
      const { data, error } = await supabase
        .from('knowledge_base_files')
        .insert({
          org_id: effectiveOrgId,
          destination_id: destinationId || null,
          uploaded_by: user.id,
          file_name: file.name,
          file_type: file.type || `application/${ext}`,
          file_size_bytes: file.size,
          storage_path: storagePath,
          description: description || null,
          category,
          tags: tags || [],
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['knowledge-base-files'] });
      toast.success('Arquivo enviado com sucesso');
    },
    onError: (err: any) => {
      toast.error(`Erro ao enviar: ${err.message}`);
    },
  });
}

export function useDeleteKBFile() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (file: KBFile) => {
      // Delete from storage
      await supabase.storage.from('knowledge-base').remove([file.storage_path]);

      // Soft delete in DB
      const { error } = await supabase
        .from('knowledge_base_files')
        .update({ is_active: false })
        .eq('id', file.id);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['knowledge-base-files'] });
      toast.success('Arquivo removido');
    },
    onError: (err: any) => {
      toast.error(`Erro ao remover: ${err.message}`);
    },
  });
}

export function useDownloadKBFile() {
  return useMutation({
    mutationFn: async (file: KBFile) => {
      const { data, error } = await supabase.storage
        .from('knowledge-base')
        .download(file.storage_path);

      if (error) throw error;
      if (!data) throw new Error('Arquivo não encontrado');

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.file_name;
      a.click();
      URL.revokeObjectURL(url);
    },
    onError: (err: any) => {
      toast.error(`Erro ao baixar: ${err.message}`);
    },
  });
}
