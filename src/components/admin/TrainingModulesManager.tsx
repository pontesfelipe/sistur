import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  BookOpen,
  Video,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TrainingModule {
  module_number: number;
  module_title: string;
  lives: string[];
}

interface TrainingModulesManagerProps {
  modules: TrainingModule[];
  onModulesChange: (modules: TrainingModule[]) => void;
}

interface ModuleFormData {
  module_title: string;
  lives: string[];
}

const defaultModuleForm: ModuleFormData = {
  module_title: '',
  lives: [],
};

export function TrainingModulesManager({ modules, onModulesChange }: TrainingModulesManagerProps) {
  const [isModuleDialogOpen, setIsModuleDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingModuleIndex, setEditingModuleIndex] = useState<number | null>(null);
  const [deletingModuleIndex, setDeletingModuleIndex] = useState<number | null>(null);
  const [moduleForm, setModuleForm] = useState<ModuleFormData>(defaultModuleForm);
  const [newLiveTitle, setNewLiveTitle] = useState('');

  const handleOpenCreateModule = () => {
    setEditingModuleIndex(null);
    setModuleForm(defaultModuleForm);
    setNewLiveTitle('');
    setIsModuleDialogOpen(true);
  };

  const handleOpenEditModule = (index: number) => {
    const module = modules[index];
    setEditingModuleIndex(index);
    setModuleForm({
      module_title: module.module_title,
      lives: [...module.lives],
    });
    setNewLiveTitle('');
    setIsModuleDialogOpen(true);
  };

  const handleOpenDeleteModule = (index: number) => {
    setDeletingModuleIndex(index);
    setIsDeleteDialogOpen(true);
  };

  const handleSaveModule = () => {
    if (!moduleForm.module_title.trim()) return;

    const newModules = [...modules];

    if (editingModuleIndex !== null) {
      // Editing existing module
      newModules[editingModuleIndex] = {
        ...newModules[editingModuleIndex],
        module_title: moduleForm.module_title.trim(),
        lives: moduleForm.lives,
      };
    } else {
      // Creating new module
      const nextNumber = modules.length > 0 
        ? Math.max(...modules.map(m => m.module_number)) + 1 
        : 1;
      newModules.push({
        module_number: nextNumber,
        module_title: moduleForm.module_title.trim(),
        lives: moduleForm.lives,
      });
    }

    onModulesChange(newModules);
    setIsModuleDialogOpen(false);
    setModuleForm(defaultModuleForm);
    setEditingModuleIndex(null);
  };

  const handleConfirmDelete = () => {
    if (deletingModuleIndex !== null) {
      const newModules = modules
        .filter((_, i) => i !== deletingModuleIndex)
        .map((m, i) => ({ ...m, module_number: i + 1 })); // Renumber
      onModulesChange(newModules);
    }
    setIsDeleteDialogOpen(false);
    setDeletingModuleIndex(null);
  };

  const handleMoveModule = (index: number, direction: 'up' | 'down') => {
    const newModules = [...modules];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newModules.length) return;

    // Swap modules
    [newModules[index], newModules[targetIndex]] = [newModules[targetIndex], newModules[index]];

    // Renumber
    newModules.forEach((m, i) => {
      m.module_number = i + 1;
    });

    onModulesChange(newModules);
  };

  // Live management within module form
  const handleAddLive = () => {
    if (!newLiveTitle.trim()) return;
    setModuleForm(prev => ({
      ...prev,
      lives: [...prev.lives, newLiveTitle.trim()],
    }));
    setNewLiveTitle('');
  };

  const handleRemoveLive = (liveIndex: number) => {
    setModuleForm(prev => ({
      ...prev,
      lives: prev.lives.filter((_, i) => i !== liveIndex),
    }));
  };

  const handleMoveLive = (liveIndex: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? liveIndex - 1 : liveIndex + 1;
    if (targetIndex < 0 || targetIndex >= moduleForm.lives.length) return;

    const newLives = [...moduleForm.lives];
    [newLives[liveIndex], newLives[targetIndex]] = [newLives[targetIndex], newLives[liveIndex]];
    setModuleForm(prev => ({ ...prev, lives: newLives }));
  };

  const handleEditLive = (liveIndex: number, newTitle: string) => {
    const newLives = [...moduleForm.lives];
    newLives[liveIndex] = newTitle;
    setModuleForm(prev => ({ ...prev, lives: newLives }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          Módulos do Curso ({modules.length})
        </Label>
        <Button type="button" variant="outline" size="sm" onClick={handleOpenCreateModule}>
          <Plus className="h-4 w-4 mr-1" />
          Adicionar Módulo
        </Button>
      </div>

      {modules.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground text-sm">
              Nenhum módulo cadastrado. Adicione módulos para estruturar o conteúdo do curso.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="single" collapsible className="space-y-2">
          {modules.map((module, index) => (
            <AccordionItem
              key={index}
              value={`module-${index}`}
              className="border rounded-lg px-4"
            >
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={index === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveModule(index, 'up');
                      }}
                    >
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={index === modules.length - 1}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveModule(index, 'down');
                      }}
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                    {module.module_number}
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-medium">{module.module_title}</p>
                    <p className="text-xs text-muted-foreground">
                      {module.lives.length} aula(s)
                    </p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="pt-2 pb-4 space-y-3">
                  {module.lives.length > 0 ? (
                    <div className="space-y-1">
                      {module.lives.map((live, liveIndex) => (
                        <div
                          key={liveIndex}
                          className="flex items-center gap-2 text-sm py-1.5 px-2 bg-muted/50 rounded"
                        >
                          <Video className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="flex-1">{live}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      Nenhuma aula cadastrada neste módulo
                    </p>
                  )}
                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEditModule(index)}
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      Editar
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleOpenDeleteModule(index)}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Excluir
                    </Button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      {/* Module Form Dialog */}
      <Dialog open={isModuleDialogOpen} onOpenChange={setIsModuleDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingModuleIndex !== null ? 'Editar Módulo' : 'Novo Módulo'}
            </DialogTitle>
            <DialogDescription>
              {editingModuleIndex !== null
                ? 'Atualize as informações do módulo'
                : 'Adicione um novo módulo ao curso'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="module-title">Título do Módulo *</Label>
              <Input
                id="module-title"
                value={moduleForm.module_title}
                onChange={(e) => setModuleForm(prev => ({ ...prev, module_title: e.target.value }))}
                placeholder="Ex: Introdução ao Turismo Sustentável"
              />
            </div>

            <div className="space-y-3">
              <Label>Aulas / Conteúdos</Label>
              
              {moduleForm.lives.length > 0 && (
                <div className="space-y-2">
                  {moduleForm.lives.map((live, liveIndex) => (
                    <div key={liveIndex} className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={liveIndex === 0}
                          onClick={() => handleMoveLive(liveIndex, 'up')}
                        >
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={liveIndex === moduleForm.lives.length - 1}
                          onClick={() => handleMoveLive(liveIndex, 'down')}
                        >
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                      </div>
                      <Input
                        value={live}
                        onChange={(e) => handleEditLive(liveIndex, e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleRemoveLive(liveIndex)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Input
                  value={newLiveTitle}
                  onChange={(e) => setNewLiveTitle(e.target.value)}
                  placeholder="Título da aula..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddLive();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleAddLive}
                  disabled={!newLiveTitle.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Pressione Enter ou clique no botão para adicionar uma aula
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsModuleDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSaveModule}
              disabled={!moduleForm.module_title.trim()}
            >
              {editingModuleIndex !== null ? 'Salvar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Módulo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o módulo "
              {deletingModuleIndex !== null ? modules[deletingModuleIndex]?.module_title : ''}"?
              As aulas associadas também serão removidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
