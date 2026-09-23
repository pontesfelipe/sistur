import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Share2, Link2, FileDown, Mail, Copy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { exportBeniConversationDocx } from '@/lib/exportBeniConversationDocx';
import type { BeniConversation } from '@/hooks/useBeniConversations';

interface Props {
  conversation: BeniConversation;
  onUpdate: (patch: Partial<BeniConversation>) => Promise<void>;
}

function randomToken() {
  const a = new Uint8Array(18);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function ShareConversationMenu({ conversation, onUpdate }: Props) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emails, setEmails] = useState('');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);

  const shareUrl = conversation.share_token ? `${window.location.origin}/beni/compartilhado/${conversation.share_token}` : '';

  const toggleLink = async (enabled: boolean) => {
    try {
      await onUpdate({ share_enabled: enabled, share_token: conversation.share_token || randomToken() });
    } catch { toast.error('Não foi possível atualizar o link'); }
  };

  const loadMessages = async () => {
    const { data } = await supabase.from('beni_chat_messages').select('role, content')
      .eq('conversation_id', conversation.id).order('created_at', { ascending: true });
    return data ?? [];
  };

  const exportWord = async () => {
    const msgs = await loadMessages();
    if (!msgs.length) { toast.error('Conversa vazia'); return; }
    await exportBeniConversationDocx(conversation.title, msgs);
  };

  const sendEmail = async () => {
    const list = emails.split(/[,;\s]+/).map((e) => e.trim()).filter(Boolean);
    if (!list.length || list.length > 5) { toast.error('Informe de 1 a 5 e-mails'); return; }
    setSending(true);
    const { data, error } = await supabase.functions.invoke('share-beni-conversation', {
      body: { conversationId: conversation.id, emails: list, note: note || null },
    });
    setSending(false);
    if (error || (data as any)?.error) { toast.error((data as any)?.error || 'Falha ao enviar'); return; }
    toast.success('Conversa enviada por e-mail');
    setEmailOpen(false); setEmails(''); setNote('');
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="text-muted-foreground"><Share2 className="h-4 w-4 mr-1" />Compartilhar</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setLinkOpen(true)}><Link2 className="h-4 w-4 mr-2" />Link somente leitura</DropdownMenuItem>
          <DropdownMenuItem onClick={exportWord}><FileDown className="h-4 w-4 mr-2" />Baixar em Word</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setEmailOpen(true)}><Mail className="h-4 w-4 mr-2" />Enviar por e-mail</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Compartilhar por link</DialogTitle>
            <DialogDescription>Qualquer pessoa com o link poderá ler esta conversa, sem precisar entrar no SISTUR.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between">
            <Label htmlFor="share-on">Link ativo</Label>
            <Switch id="share-on" checked={conversation.share_enabled} onCheckedChange={toggleLink} />
          </div>
          {conversation.share_enabled && shareUrl && (
            <div className="flex gap-2">
              <Input readOnly value={shareUrl} />
              <Button size="icon" variant="outline" onClick={() => { navigator.clipboard.writeText(shareUrl); toast.success('Link copiado'); }}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar conversa por e-mail</DialogTitle>
            <DialogDescription>Até 5 endereços, separados por vírgula.</DialogDescription>
          </DialogHeader>
          <Input placeholder="nome@exemplo.com, outro@exemplo.com" value={emails} onChange={(e) => setEmails(e.target.value)} />
          <Textarea placeholder="Mensagem opcional" value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} />
          <DialogFooter>
            <Button onClick={sendEmail} disabled={sending}>{sending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Enviar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
