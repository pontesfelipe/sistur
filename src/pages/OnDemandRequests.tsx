import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  Plus, 
  Search, 
  Sparkles,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  Target,
  Loader2,
  MessageSquare,
  Inbox,
} from 'lucide-react';
import { 
  useUserOnDemandRequests, 
  useOnDemandMutations,
  type OnDemandRequest 
} from '@/hooks/useOnDemand';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const OnDemandRequests = () => {
  const [activeTab, setActiveTab] = useState('my-requests');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    topic: '',
    learning_goals: '',
    preferred_format: 'video' as 'video' | 'text' | 'mixed',
    urgency: 'normal' as 'low' | 'normal' | 'high',
  });
  
  const { data: requests, isLoading } = useUserOnDemandRequests();
  const { createRequest } = useOnDemandMutations();

  const filteredRequests = requests?.filter(req => {
    return !searchQuery || 
      req.topic_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.learning_goals?.join(' ').toLowerCase().includes(searchQuery.toLowerCase());
  }) || [];

  const stats = {
    total: requests?.length || 0,
    pending: requests?.filter(r => r.status === 'received').length || 0,
    approved: requests?.filter(r => r.status === 'validated' || r.status === 'generating').length || 0,
    completed: requests?.filter(r => r.status === 'generated').length || 0,
  };

  const handleSubmit = async () => {
    if (!formData.topic.trim()) {
      toast.error('Informe o tópico desejado');
      return;
    }
    
    try {
      await createRequest.mutateAsync({
        goal_type: 'course',
        topic_text: formData.topic,
        learning_goals: formData.learning_goals ? [formData.learning_goals] : undefined,
      });
      toast.success('Solicitação enviada com sucesso!');
      setIsDialogOpen(false);
      setFormData({
        topic: '',
        learning_goals: '',
        preferred_format: 'video',
        urgency: 'normal',
      });
    } catch (error) {
      toast.error('Erro ao enviar solicitação');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'received':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700"><Clock className="w-3 h-3 mr-1" />Aguardando</Badge>;
      case 'validated':
      case 'generating':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-700"><Loader2 className="w-3 h-3 mr-1" />Em Produção</Badge>;
      case 'generated':
        return <Badge className="bg-green-500/20 text-green-700"><CheckCircle className="w-3 h-3 mr-1" />Entregue</Badge>;
      case 'rejected':
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejeitado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getGoalTypeBadge = (goalType: string) => {
    switch (goalType) {
      case 'course':
        return <Badge variant="secondary">Curso</Badge>;
      case 'track':
        return <Badge variant="secondary">Trilha</Badge>;
      case 'lesson_plan':
        return <Badge variant="outline">Plano de Aula</Badge>;
      default:
        return <Badge variant="outline">{goalType}</Badge>;
    }
  };

  return (
    <AppLayout 
      title="Conteúdo Sob Demanda" 
      subtitle="Solicite conteúdos personalizados para suas necessidades"
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="my-requests" className="gap-2">
            <Inbox className="h-4 w-4" />
            Minhas Solicitações
          </TabsTrigger>
          <TabsTrigger value="new" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Nova Solicitação
          </TabsTrigger>
        </TabsList>

        {/* MY REQUESTS TAB */}
        <TabsContent value="my-requests" className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-2xl font-bold">{stats.total}</CardTitle>
                <CardDescription>Total</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-2xl font-bold text-yellow-600">{stats.pending}</CardTitle>
                <CardDescription>Aguardando</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-2xl font-bold text-blue-600">{stats.approved}</CardTitle>
                <CardDescription>Em Produção</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-2xl font-bold text-green-600">{stats.completed}</CardTitle>
                <CardDescription>Entregues</CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* Search */}
          <div className="flex gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar solicitações..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button onClick={() => setActiveTab('new')}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Solicitação
            </Button>
          </div>

          {/* Requests List */}
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : filteredRequests.length === 0 ? (
            <Card className="py-12">
              <CardContent className="text-center">
                <Inbox className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">Nenhuma solicitação</h3>
                <p className="text-muted-foreground mb-4">
                  Você ainda não fez nenhuma solicitação de conteúdo
                </p>
                <Button onClick={() => setActiveTab('new')}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Fazer Primeira Solicitação
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((request) => (
                <Card key={request.request_id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{request.topic_text}</CardTitle>
                        <CardDescription className="flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          Solicitado em {format(new Date(request.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        {getGoalTypeBadge(request.goal_type)}
                        {getStatusBadge(request.status)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {request.learning_goals && request.learning_goals.length > 0 && (
                        <div className="flex items-start gap-2 text-sm">
                          <Target className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <p className="text-muted-foreground">{request.learning_goals.join(', ')}</p>
                        </div>
                      )}
                      {request.desired_pillar && (
                        <div className="flex items-center gap-2 text-sm">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            Pilar: {request.desired_pillar}
                          </span>
                        </div>
                      )}
                      {request.error_message && (
                        <div className="flex items-start gap-2 text-sm p-3 bg-muted rounded-lg">
                          <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <p>{request.error_message}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* NEW REQUEST TAB */}
        <TabsContent value="new" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Nova Solicitação de Conteúdo
              </CardTitle>
              <CardDescription>
                Descreva o conteúdo que você precisa e nossa equipe irá avaliá-lo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="topic">Tópico / Assunto *</Label>
                <Input
                  id="topic"
                  placeholder="Ex: Gestão de resíduos sólidos em destinos turísticos"
                  value={formData.topic}
                  onChange={(e) => setFormData(prev => ({ ...prev, topic: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="goals">Objetivos de Aprendizagem</Label>
                <Textarea
                  id="goals"
                  placeholder="Descreva o que você espera aprender com este conteúdo..."
                  rows={4}
                  value={formData.learning_goals}
                  onChange={(e) => setFormData(prev => ({ ...prev, learning_goals: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Formato Preferido</Label>
                  <Select 
                    value={formData.preferred_format}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, preferred_format: v as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="video">Vídeo</SelectItem>
                      <SelectItem value="text">Texto/Artigo</SelectItem>
                      <SelectItem value="mixed">Misto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Urgência</Label>
                  <Select 
                    value={formData.urgency}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, urgency: v as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button 
                  onClick={handleSubmit}
                  disabled={!formData.topic.trim() || createRequest.isPending}
                  className="w-full sm:w-auto"
                >
                  {createRequest.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Enviar Solicitação
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <h4 className="font-medium mb-2">Como funciona?</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Preencha o formulário descrevendo o conteúdo que você precisa</li>
                <li>Nossa equipe pedagógica irá avaliar sua solicitação</li>
                <li>Se aprovado, o conteúdo será produzido e você será notificado</li>
                <li>O conteúdo ficará disponível no seu catálogo personalizado</li>
              </ol>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
};

export default OnDemandRequests;
