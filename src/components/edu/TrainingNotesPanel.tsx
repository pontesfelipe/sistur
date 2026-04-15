/**
 * SISEDU - Painel de Anotações Pessoais
 * Permite que alunos criem notas vinculadas a treinamentos
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { StickyNote, Plus, Trash2, Clock, Edit2, Check, X } from 'lucide-react';
import { useTrainingNotes, useNoteMutations, type EduNote } from '@/hooks/useEduNotes';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TrainingNotesProps {
  trainingId: string;
  moduleIndex?: number;
  currentVideoTime?: number;
}

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function TrainingNotesPanel({ trainingId, moduleIndex, currentVideoTime }: TrainingNotesProps) {
  const { data: notes, isLoading } = useTrainingNotes(trainingId, moduleIndex);
  const { createNote, updateNote, deleteNote } = useNoteMutations();
  const [newContent, setNewContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showForm, setShowForm] = useState(false);

  const handleCreate = async () => {
    if (!newContent.trim()) return;
    await createNote.mutateAsync({
      training_id: trainingId,
      module_index: moduleIndex,
      video_timestamp_seconds: currentVideoTime,
      content: newContent.trim(),
    });
    setNewContent('');
    setShowForm(false);
  };

  const handleUpdate = async (noteId: string) => {
    if (!editContent.trim()) return;
    await updateNote.mutateAsync({ noteId, content: editContent.trim() });
    setEditingId(null);
    setEditContent('');
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <StickyNote className="h-4 w-4 text-yellow-500" />
            Minhas Anotações
            {notes && notes.length > 0 && (
              <Badge variant="secondary" className="text-xs">{notes.length}</Badge>
            )}
          </span>
          <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {showForm && (
          <div className="space-y-2 animate-fade-in">
            <Textarea
              placeholder="Escreva sua anotação..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              rows={3}
              className="text-sm"
            />
            {currentVideoTime !== undefined && currentVideoTime > 0 && (
              <Badge variant="outline" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                {formatTimestamp(currentVideoTime)}
              </Badge>
            )}
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate} disabled={!newContent.trim() || createNote.isPending}>
                Salvar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setNewContent(''); }}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : notes && notes.length > 0 ? (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {notes.map((note) => (
              <NoteItem
                key={note.id}
                note={note}
                isEditing={editingId === note.id}
                editContent={editContent}
                onStartEdit={() => {
                  setEditingId(note.id);
                  setEditContent(note.content);
                }}
                onCancelEdit={() => { setEditingId(null); setEditContent(''); }}
                onSaveEdit={() => handleUpdate(note.id)}
                onDelete={() => deleteNote.mutate(note.id)}
                onEditContentChange={setEditContent}
              />
            ))}
          </div>
        ) : !showForm ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma anotação ainda. Clique em + para começar.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function NoteItem({
  note,
  isEditing,
  editContent,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onEditContentChange,
}: {
  note: EduNote;
  isEditing: boolean;
  editContent: string;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDelete: () => void;
  onEditContentChange: (v: string) => void;
}) {
  return (
    <div className="group p-2 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
      {isEditing ? (
        <div className="space-y-2">
          <Textarea
            value={editContent}
            onChange={(e) => onEditContentChange(e.target.value)}
            rows={2}
            className="text-sm"
          />
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onSaveEdit}>
              <Check className="h-3 w-3" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onCancelEdit}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm whitespace-pre-wrap">{note.content}</p>
          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-2">
              {note.video_timestamp_seconds != null && (
                <Badge variant="outline" className="text-[10px] py-0">
                  <Clock className="h-2.5 w-2.5 mr-0.5" />
                  {formatTimestamp(note.video_timestamp_seconds)}
                </Badge>
              )}
              <span className="text-[10px] text-muted-foreground">
                {formatDistanceToNow(new Date(note.created_at), { addSuffix: true, locale: ptBR })}
              </span>
            </div>
            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onStartEdit}>
                <Edit2 className="h-3 w-3" />
              </Button>
              <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={onDelete}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
