import { tx } from '@/i18n/t';
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
import { useDeleteProject, Project } from '@/hooks/useProjects';
import { Loader2 } from 'lucide-react';

interface DeleteProjectDialogProps {
  project: Project | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

export function DeleteProjectDialog({ project, open, onOpenChange, onDeleted }: DeleteProjectDialogProps) {
  const deleteProject = useDeleteProject();

  const handleDelete = async () => {
    if (!project) return;

    await deleteProject.mutateAsync(project.id);
    onOpenChange(false);
    onDeleted?.();
  };

  if (!project) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{tx('Excluir Projeto')}</AlertDialogTitle>
          <AlertDialogDescription>
            {tx("Tem certeza que deseja excluir o projeto")} <strong>"{project.name}"</strong>?
            <br /><br />
            {tx('Esta ação não pode ser desfeita. Todas as fases, tarefas e marcos associados serão removidos.')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{tx('Cancelar')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteProject.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteProject.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {tx('Excluir')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
