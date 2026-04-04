import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getOrgDisplayName } from '@/lib/organizationVisibility';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Mail, Send, Users, Building2, User, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface UserOption {
  user_id: string;
  full_name: string | null;
  email: string | null;
  org_id: string;
}

interface OrgOption {
  id: string;
  name: string;
  user_count: number;
}

type SendMode = 'template' | 'custom';
type RecipientType = 'user' | 'org';

const TEMPLATE_OPTIONS = [
  { value: 'access-approved', label: 'Acesso Aprovado', description: 'Notifica que o acesso foi liberado' },
  { value: 'access-requested', label: 'Solicitação Recebida', description: 'Confirma recebimento de solicitação' },
  { value: 'custom-message', label: 'Mensagem Personalizada', description: 'E-mail customizado com branding SISTUR' },
];

export function EmailDispatchPanel() {
  const [sendMode, setSendMode] = useState<SendMode>('template');
  const [recipientType, setRecipientType] = useState<RecipientType>('user');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [customSubject, setCustomSubject] = useState('');
  const [customBody, setCustomBody] = useState('');
  const [users, setUsers] = useState<UserOption[]>([]);
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState({ sent: 0, total: 0, errors: 0 });

  useEffect(() => {
    fetchUsersAndOrgs();
  }, []);

  const fetchUsersAndOrgs = async () => {
    setLoading(true);
    try {
      // Fetch users via admin RPC
      const { data: usersData } = await supabase.rpc('admin_get_all_users');

      // Fetch all profiles (including pending) so Temporário org is visible
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('user_id, org_id');

      const allUserIds = new Set((allProfiles || []).map(p => p.user_id));

      if (usersData) {
        // Only include approved users with email
        setUsers(
          usersData
            .filter((u: any) => allUserIds.has(u.user_id))
            .map((u: any) => ({
              user_id: u.user_id,
              full_name: u.full_name,
              email: u.email,
              org_id: u.org_id,
            }))
        );
      }

      // Count approved users per org
      const userCounts = (allProfiles || []).reduce((acc, p) => {
        acc[p.org_id] = (acc[p.org_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Fetch orgs
      const { data: orgsData } = await supabase.from('orgs').select('id, name');
      if (orgsData) {
        const orgMap = (orgsData || [])
          .map(org => ({
            id: org.id,
            name: org.name,
            user_count: userCounts[org.id] || 0,
          }))
          .filter(o => o.user_count > 0);
        setOrgs(orgMap);
      }
    } catch (err) {
      console.error('Failed to fetch users/orgs:', err);
      toast.error('Erro ao carregar usuários e organizações');
    } finally {
      setLoading(false);
    }
  };

  const getEffectiveTemplate = (): string => {
    if (sendMode === 'custom') return 'custom-message';
    return selectedTemplate;
  };

  const getTemplateData = (userName?: string | null): Record<string, any> => {
    const template = getEffectiveTemplate();
    const data: Record<string, any> = {};

    if (userName) data.userName = userName;

    if (template === 'custom-message') {
      data.subject = customSubject;
      data.messageBody = customBody;
    }

    return data;
  };

  const sendToUser = async (user: UserOption) => {
    if (!user.email) return false;

    const template = getEffectiveTemplate();
    const templateData = getTemplateData(user.full_name);

    const { error } = await supabase.functions.invoke('send-transactional-email', {
      body: {
        templateName: template,
        recipientEmail: user.email,
        idempotencyKey: `admin-dispatch-${template}-${user.user_id}-${Date.now()}`,
        templateData,
      },
    });

    return !error;
  };

  const handleSend = async () => {
    const template = getEffectiveTemplate();
    if (!template) {
      toast.error('Selecione um template de e-mail');
      return;
    }

    if (sendMode === 'custom' && (!customSubject.trim() || !customBody.trim())) {
      toast.error('Preencha o assunto e o conteúdo do e-mail');
      return;
    }

    if (customSubject.length > 200) {
      toast.error('O assunto deve ter no máximo 200 caracteres');
      return;
    }

    if (customBody.length > 5000) {
      toast.error('O conteúdo deve ter no máximo 5000 caracteres');
      return;
    }

    setSending(true);

    try {
      if (recipientType === 'user') {
        if (!selectedUserId) {
          toast.error('Selecione um usuário');
          setSending(false);
          return;
        }
        const user = users.find(u => u.user_id === selectedUserId);
        if (!user?.email) {
          toast.error('Usuário sem e-mail cadastrado');
          setSending(false);
          return;
        }

        const success = await sendToUser(user);
        if (success) {
          toast.success('E-mail enviado com sucesso', {
            description: `Para: ${user.email}`,
          });
        } else {
          toast.error('Falha ao enviar e-mail');
        }
      } else {
        // Send to org
        if (!selectedOrgId) {
          toast.error('Selecione uma organização');
          setSending(false);
          return;
        }

        const orgUsers = users.filter(u => u.org_id === selectedOrgId && u.email);
        if (orgUsers.length === 0) {
          toast.error('Nenhum usuário com e-mail nesta organização');
          setSending(false);
          return;
        }

        setSendProgress({ sent: 0, total: orgUsers.length, errors: 0 });

        let sent = 0;
        let errors = 0;

        for (const user of orgUsers) {
          const success = await sendToUser(user);
          if (success) {
            sent++;
          } else {
            errors++;
          }
          setSendProgress({ sent: sent + errors, total: orgUsers.length, errors });
          // Small delay between sends
          await new Promise(r => setTimeout(r, 300));
        }

        if (errors === 0) {
          toast.success(`E-mails enviados com sucesso`, {
            description: `${sent} e-mail(s) enviado(s)`,
          });
        } else {
          toast.warning(`Envio parcialmente concluído`, {
            description: `${sent} enviado(s), ${errors} erro(s)`,
          });
        }

        setSendProgress({ sent: 0, total: 0, errors: 0 });
      }
    } catch (err) {
      console.error('Send error:', err);
      toast.error('Erro ao enviar e-mail');
    } finally {
      setSending(false);
    }
  };

  const selectedOrg = orgs.find(o => o.id === selectedOrgId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          Disparar E-mails
        </CardTitle>
        <CardDescription>
          Envie templates existentes ou mensagens personalizadas com o visual SISTUR
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Mode Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Tipo de E-mail</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={sendMode === 'template' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSendMode('template')}
                  className="justify-start"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Template Existente
                </Button>
                <Button
                  variant={sendMode === 'custom' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSendMode('custom')}
                  className="justify-start"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Mensagem Personalizada
                </Button>
              </div>
            </div>

            {/* Template Selection */}
            {sendMode === 'template' && (
              <div className="space-y-2">
                <Label>Template</Label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_OPTIONS.filter(t => t.value !== 'custom-message').map(t => (
                      <SelectItem key={t.value} value={t.value}>
                        <div className="flex flex-col">
                          <span>{t.label}</span>
                          <span className="text-xs text-muted-foreground">{t.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Custom Email */}
            {sendMode === 'custom' && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  O e-mail será enviado com logo, cores e layout do SISTUR automaticamente
                </div>
                <div className="space-y-2">
                  <Label>Assunto</Label>
                  <Input
                    placeholder="Ex: Atualização importante do SISTUR"
                    value={customSubject}
                    onChange={e => setCustomSubject(e.target.value)}
                    maxLength={200}
                  />
                  <span className="text-xs text-muted-foreground">{customSubject.length}/200</span>
                </div>
                <div className="space-y-2">
                  <Label>Conteúdo</Label>
                  <Textarea
                    placeholder="Escreva o conteúdo do e-mail aqui. Use quebras de linha para separar parágrafos."
                    value={customBody}
                    onChange={e => setCustomBody(e.target.value)}
                    rows={6}
                    maxLength={5000}
                  />
                  <span className="text-xs text-muted-foreground">{customBody.length}/5000</span>
                </div>
              </div>
            )}

            <Separator />

            {/* Recipient Selection */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">Destinatário</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={recipientType === 'user' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRecipientType('user')}
                  className="justify-start"
                >
                  <User className="h-4 w-4 mr-2" />
                  Usuário Específico
                </Button>
                <Button
                  variant={recipientType === 'org' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRecipientType('org')}
                  className="justify-start"
                >
                  <Building2 className="h-4 w-4 mr-2" />
                  Organização
                </Button>
              </div>

              {recipientType === 'user' ? (
                <div className="space-y-2">
                  <Label>Usuário</Label>
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um usuário..." />
                    </SelectTrigger>
                    <SelectContent>
                      {users.filter(u => u.email).map(u => (
                        <SelectItem key={u.user_id} value={u.user_id}>
                          <div className="flex items-center gap-2">
                            <span>{u.full_name || 'Sem nome'}</span>
                            <span className="text-xs text-muted-foreground">({u.email})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Organização</Label>
                  <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma organização..." />
                    </SelectTrigger>
                    <SelectContent>
                      {orgs.map(o => (
                        <SelectItem key={o.id} value={o.id}>
                          <div className="flex items-center gap-2">
                            <span>{o.name}</span>
                            <Badge variant="secondary" className="text-xs">{o.user_count} usuário(s)</Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedOrg && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <AlertCircle className="h-4 w-4" />
                      Serão enviados {selectedOrg.user_count} e-mail(s) individualmente
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Send Progress */}
            {sendProgress.total > 0 && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span>Enviando...</span>
                  <span>{sendProgress.sent}/{sendProgress.total}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 mt-2">
                  <div
                    className="bg-primary rounded-full h-2 transition-all"
                    style={{ width: `${(sendProgress.sent / sendProgress.total) * 100}%` }}
                  />
                </div>
                {sendProgress.errors > 0 && (
                  <p className="text-xs text-destructive mt-1">{sendProgress.errors} erro(s)</p>
                )}
              </div>
            )}

            {/* Send Button */}
            <Button
              onClick={handleSend}
              disabled={sending}
              className="w-full"
              size="lg"
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar E-mail
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
