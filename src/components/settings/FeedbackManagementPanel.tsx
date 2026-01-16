import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MessageSquare, 
  Lightbulb, 
  Bug, 
  Clock, 
  CheckCircle2, 
  XCircle,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Trash2
} from 'lucide-react';
import { useUserFeedback, UserFeedback } from '@/hooks/useUserFeedback';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const statusConfig: Record<UserFeedback['status'], { label: string; icon: React.ElementType; color: string }> = {
  pending: { label: 'Pendente', icon: Clock, color: 'bg-gray-500/20 text-gray-700 border-gray-500/30' },
  reviewing: { label: 'Em Análise', icon: AlertCircle, color: 'bg-blue-500/20 text-blue-700 border-blue-500/30' },
  planned: { label: 'Planejado', icon: Clock, color: 'bg-purple-500/20 text-purple-700 border-purple-500/30' },
  in_progress: { label: 'Em Progresso', icon: Loader2, color: 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30' },
  completed: { label: 'Concluído', icon: CheckCircle2, color: 'bg-green-500/20 text-green-700 border-green-500/30' },
  rejected: { label: 'Rejeitado', icon: XCircle, color: 'bg-red-500/20 text-red-700 border-red-500/30' },
};

const priorityConfig: Record<UserFeedback['priority'], { label: string; color: string }> = {
  low: { label: 'Baixa', color: 'bg-gray-100 text-gray-600' },
  medium: { label: 'Média', color: 'bg-blue-100 text-blue-600' },
  high: { label: 'Alta', color: 'bg-orange-100 text-orange-600' },
  critical: { label: 'Crítica', color: 'bg-red-100 text-red-600' },
};

function FeedbackItem({ feedback, onUpdate }: { feedback: UserFeedback; onUpdate: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [adminNotes, setAdminNotes] = useState(feedback.admin_notes || '');
  const [saving, setSaving] = useState(false);
  const { updateFeedbackStatus, updateFeedbackPriority, deleteFeedback } = useUserFeedback();

  const StatusIcon = statusConfig[feedback.status].icon;

  const handleStatusChange = async (status: UserFeedback['status']) => {
    setSaving(true);
    await updateFeedbackStatus(feedback.id, status, adminNotes);
    setSaving(false);
    onUpdate();
  };

  const handlePriorityChange = async (priority: UserFeedback['priority']) => {
    await updateFeedbackPriority(feedback.id, priority);
    onUpdate();
  };

  const handleSaveNotes = async () => {
    setSaving(true);
    await updateFeedbackStatus(feedback.id, feedback.status, adminNotes);
    setSaving(false);
  };

  const handleDelete = async () => {
    await deleteFeedback(feedback.id);
    onUpdate();
  };

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          {feedback.feedback_type === 'feature' ? (
            <Lightbulb className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
          ) : (
            <Bug className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium">{feedback.title}</span>
              <Badge variant="outline" className={statusConfig[feedback.status].color}>
                <StatusIcon className={`h-3 w-3 mr-1 ${feedback.status === 'in_progress' ? 'animate-spin' : ''}`} />
                {statusConfig[feedback.status].label}
              </Badge>
              <Badge className={priorityConfig[feedback.priority].color}>
                {priorityConfig[feedback.priority].label}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(feedback.created_at).toLocaleDateString('pt-BR', { 
                day: '2-digit', 
                month: 'short', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
              {feedback.page_url && ` • ${feedback.page_url}`}
            </p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {expanded && (
        <div className="space-y-4 pt-2 border-t">
          <div>
            <p className="text-sm font-medium mb-1">Descrição:</p>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{feedback.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={feedback.status} onValueChange={handleStatusChange} disabled={saving}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="reviewing">Em Análise</SelectItem>
                  <SelectItem value="planned">Planejado</SelectItem>
                  <SelectItem value="in_progress">Em Progresso</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                  <SelectItem value="rejected">Rejeitado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Prioridade</label>
              <Select value={feedback.priority} onValueChange={handlePriorityChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="critical">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Notas do Admin</label>
            <Textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Adicione notas internas sobre este feedback..."
              rows={2}
            />
            <div className="flex gap-2">
              <Button 
                size="sm" 
                onClick={handleSaveNotes} 
                disabled={saving || adminNotes === (feedback.admin_notes || '')}
              >
                {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                Salvar Notas
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="destructive">
                    <Trash2 className="h-4 w-4 mr-1" />
                    Excluir
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir feedback?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. O feedback será permanentemente removido.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function FeedbackManagementPanel() {
  const { feedbacks, loading, refetch } = useUserFeedback();
  const [filter, setFilter] = useState<'all' | 'feature' | 'bug'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | UserFeedback['status']>('all');

  const filteredFeedbacks = feedbacks.filter(f => {
    if (filter !== 'all' && f.feedback_type !== filter) return false;
    if (statusFilter !== 'all' && f.status !== statusFilter) return false;
    return true;
  });

  const stats = {
    total: feedbacks.length,
    features: feedbacks.filter(f => f.feedback_type === 'feature').length,
    bugs: feedbacks.filter(f => f.feedback_type === 'bug').length,
    pending: feedbacks.filter(f => f.status === 'pending').length,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Gerenciamento de Feedback
        </CardTitle>
        <CardDescription>
          Sugestões de features e bugs reportados pelos usuários
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="p-3 bg-muted/50 rounded-lg text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div className="p-3 bg-yellow-500/10 rounded-lg text-center">
            <p className="text-2xl font-bold text-yellow-600">{stats.features}</p>
            <p className="text-xs text-muted-foreground">Sugestões</p>
          </div>
          <div className="p-3 bg-red-500/10 rounded-lg text-center">
            <p className="text-2xl font-bold text-red-600">{stats.bugs}</p>
            <p className="text-xs text-muted-foreground">Bugs</p>
          </div>
          <div className="p-3 bg-blue-500/10 rounded-lg text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.pending}</p>
            <p className="text-xs text-muted-foreground">Pendentes</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)} className="flex-1">
            <TabsList>
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="feature" className="gap-1">
                <Lightbulb className="h-3 w-3" />
                Sugestões
              </TabsTrigger>
              <TabsTrigger value="bug" className="gap-1">
                <Bug className="h-3 w-3" />
                Bugs
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="reviewing">Em Análise</SelectItem>
              <SelectItem value="planned">Planejado</SelectItem>
              <SelectItem value="in_progress">Em Progresso</SelectItem>
              <SelectItem value="completed">Concluído</SelectItem>
              <SelectItem value="rejected">Rejeitado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* List */}
        <ScrollArea className="h-[500px]">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : filteredFeedbacks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mb-4 opacity-20" />
              <p className="font-medium">Nenhum feedback encontrado</p>
              <p className="text-sm">Os feedbacks dos usuários aparecerão aqui</p>
            </div>
          ) : (
            <div className="space-y-3 pr-4">
              {filteredFeedbacks.map(feedback => (
                <FeedbackItem key={feedback.id} feedback={feedback} onUpdate={refetch} />
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
