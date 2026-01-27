import React, { useState } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2, Trash2, FileText, FolderKanban, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface DeleteAssessmentDialogProps {
  assessmentId: string;
  assessmentTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

interface RelatedCounts {
  reports: number;
  projects: number;
}

export function DeleteAssessmentDialog({
  assessmentId,
  assessmentTitle,
  open,
  onOpenChange,
  onDeleted,
}: DeleteAssessmentDialogProps) {
  const queryClient = useQueryClient();
  const [deleteReports, setDeleteReports] = useState(false);
  const [deleteProjects, setDeleteProjects] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [relatedCounts, setRelatedCounts] = useState<RelatedCounts | null>(null);
  const [isLoadingCounts, setIsLoadingCounts] = useState(false);

  // Load related counts when dialog opens
  const loadRelatedCounts = async () => {
    if (!open || relatedCounts !== null) return;
    
    setIsLoadingCounts(true);
    try {
      const [reportsResult, projectsResult] = await Promise.all([
        supabase
          .from('generated_reports')
          .select('id', { count: 'exact', head: true })
          .eq('assessment_id', assessmentId),
        supabase
          .from('projects')
          .select('id', { count: 'exact', head: true })
          .eq('assessment_id', assessmentId),
      ]);

      setRelatedCounts({
        reports: reportsResult.count ?? 0,
        projects: projectsResult.count ?? 0,
      });
    } catch (error) {
      console.error('Error loading related counts:', error);
      setRelatedCounts({ reports: 0, projects: 0 });
    } finally {
      setIsLoadingCounts(false);
    }
  };

  // Load counts when dialog opens using useEffect
  React.useEffect(() => {
    if (open && relatedCounts === null && !isLoadingCounts) {
      loadRelatedCounts();
    }
  }, [open, relatedCounts, isLoadingCounts]);

  // Reset state when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setDeleteReports(false);
      setDeleteProjects(false);
      setRelatedCounts(null);
    }
    onOpenChange(newOpen);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      // Delete reports if requested
      if (deleteReports && relatedCounts && relatedCounts.reports > 0) {
        const { error: reportsError } = await supabase
          .from('generated_reports')
          .delete()
          .eq('assessment_id', assessmentId);
        
        if (reportsError) {
          console.error('Error deleting reports:', reportsError);
          toast.error('Erro ao excluir relatórios associados');
          setIsDeleting(false);
          return;
        }
      }

      // Delete projects if requested
      if (deleteProjects && relatedCounts && relatedCounts.projects > 0) {
        const { error: projectsError } = await supabase
          .from('projects')
          .delete()
          .eq('assessment_id', assessmentId);
        
        if (projectsError) {
          console.error('Error deleting projects:', projectsError);
          toast.error('Erro ao excluir projetos associados');
          setIsDeleting(false);
          return;
        }
      }

      // Delete the assessment (cascade will handle other related data)
      const { error: assessmentError } = await supabase
        .from('assessments')
        .delete()
        .eq('id', assessmentId);

      if (assessmentError) {
        console.error('Error deleting assessment:', assessmentError);
        toast.error('Erro ao excluir diagnóstico. Tente novamente.');
        setIsDeleting(false);
        return;
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['generated-reports'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });

      const deletedItems = [];
      if (deleteReports && relatedCounts && relatedCounts.reports > 0) {
        deletedItems.push(`${relatedCounts.reports} relatório(s)`);
      }
      if (deleteProjects && relatedCounts && relatedCounts.projects > 0) {
        deletedItems.push(`${relatedCounts.projects} projeto(s)`);
      }

      if (deletedItems.length > 0) {
        toast.success(`Diagnóstico e ${deletedItems.join(' e ')} excluídos com sucesso!`);
      } else {
        toast.success('Diagnóstico excluído com sucesso!');
      }

      handleOpenChange(false);
      onDeleted?.();
    } catch (error) {
      console.error('Error in delete operation:', error);
      toast.error('Erro ao excluir. Tente novamente.');
    } finally {
      setIsDeleting(false);
    }
  };

  const hasRelatedData = relatedCounts && (relatedCounts.reports > 0 || relatedCounts.projects > 0);

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Excluir diagnóstico?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Esta ação não pode ser desfeita. O diagnóstico <strong>"{assessmentTitle}"</strong> 
              e todos os dados de indicadores, pontuações e planos de ação serão permanentemente excluídos.
            </p>
            
            {isLoadingCounts && (
              <div className="flex items-center gap-2 text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Verificando dados relacionados...</span>
              </div>
            )}

            {hasRelatedData && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 space-y-3">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  Este diagnóstico possui dados relacionados:
                </p>
                
                {relatedCounts.reports > 0 && (
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="delete-reports"
                      checked={deleteReports}
                      onCheckedChange={(checked) => setDeleteReports(checked === true)}
                    />
                    <Label 
                      htmlFor="delete-reports" 
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <FileText className="h-4 w-4 text-amber-600" />
                      Excluir {relatedCounts.reports} relatório(s) associado(s)
                    </Label>
                  </div>
                )}
                
                {relatedCounts.projects > 0 && (
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="delete-projects"
                      checked={deleteProjects}
                      onCheckedChange={(checked) => setDeleteProjects(checked === true)}
                    />
                    <Label 
                      htmlFor="delete-projects" 
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <FolderKanban className="h-4 w-4 text-amber-600" />
                      Excluir {relatedCounts.projects} projeto(s) associado(s)
                    </Label>
                  </div>
                )}
                
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Se não selecionar, estes itens permanecerão sem vínculo ao diagnóstico.
                </p>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={isDeleting || isLoadingCounts}
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
