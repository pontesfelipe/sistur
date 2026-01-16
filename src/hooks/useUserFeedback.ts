import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface UserFeedback {
  id: string;
  user_id: string;
  org_id: string | null;
  feedback_type: 'feature' | 'bug';
  title: string;
  description: string;
  status: 'pending' | 'reviewing' | 'planned' | 'in_progress' | 'completed' | 'rejected';
  priority: 'low' | 'medium' | 'high' | 'critical';
  admin_notes: string | null;
  page_url: string | null;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
}

export function useUserFeedback() {
  const { user } = useAuth();
  const [feedbacks, setFeedbacks] = useState<UserFeedback[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFeedbacks = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_feedback')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFeedbacks((data as UserFeedback[]) || []);
    } catch (error) {
      console.error('Error fetching feedbacks:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  const submitFeedback = async (
    feedbackType: 'feature' | 'bug',
    title: string,
    description: string
  ) => {
    if (!user) {
      toast.error('Você precisa estar logado para enviar feedback');
      return false;
    }

    try {
      const { error } = await supabase.from('user_feedback').insert({
        user_id: user.id,
        feedback_type: feedbackType,
        title,
        description,
        page_url: window.location.pathname,
        user_agent: navigator.userAgent,
      });

      if (error) throw error;

      toast.success(
        feedbackType === 'feature' 
          ? 'Sugestão enviada com sucesso!' 
          : 'Bug reportado com sucesso!'
      );
      
      fetchFeedbacks();
      return true;
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Erro ao enviar feedback');
      return false;
    }
  };

  const updateFeedbackStatus = async (
    feedbackId: string,
    status: UserFeedback['status'],
    adminNotes?: string
  ) => {
    try {
      const updates: Partial<UserFeedback> = { status };
      if (adminNotes !== undefined) {
        updates.admin_notes = adminNotes;
      }

      const { error } = await supabase
        .from('user_feedback')
        .update(updates)
        .eq('id', feedbackId);

      if (error) throw error;

      toast.success('Status atualizado');
      fetchFeedbacks();
      return true;
    } catch (error) {
      console.error('Error updating feedback:', error);
      toast.error('Erro ao atualizar feedback');
      return false;
    }
  };

  const updateFeedbackPriority = async (
    feedbackId: string,
    priority: UserFeedback['priority']
  ) => {
    try {
      const { error } = await supabase
        .from('user_feedback')
        .update({ priority })
        .eq('id', feedbackId);

      if (error) throw error;

      toast.success('Prioridade atualizada');
      fetchFeedbacks();
      return true;
    } catch (error) {
      console.error('Error updating priority:', error);
      toast.error('Erro ao atualizar prioridade');
      return false;
    }
  };

  const deleteFeedback = async (feedbackId: string) => {
    try {
      const { error } = await supabase
        .from('user_feedback')
        .delete()
        .eq('id', feedbackId);

      if (error) throw error;

      toast.success('Feedback removido');
      fetchFeedbacks();
      return true;
    } catch (error) {
      console.error('Error deleting feedback:', error);
      toast.error('Erro ao remover feedback');
      return false;
    }
  };

  return {
    feedbacks,
    loading,
    submitFeedback,
    updateFeedbackStatus,
    updateFeedbackPriority,
    deleteFeedback,
    refetch: fetchFeedbacks,
  };
}
