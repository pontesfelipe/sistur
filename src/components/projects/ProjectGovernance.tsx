import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle2, Plus, ShieldCheck, Trash2, Upload, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  useProjectCheckpoints,
  useCreateCheckpoint,
  useUpdateCheckpoint,
  useDeleteCheckpoint,
  useProjectRaci,
  useAddRaci,
  useDeleteRaci,
  RACI_INFO,
  CHECKPOINT_STATUS_INFO,
  type ProjectCheckpoint,
  type RaciRole,
} from '@/hooks/useProjectGovernance';
import { useProjectTasks } from '@/hooks/useProjects';

interface Props {
  projectId: string;
}

export function ProjectGovernance({ projectId }: Props) {
  const { data: checkpoints = [] } = useProjectCheckpoints(projectId);
  const { data: raci = [] } = useProjectRaci(projectId);
  const { data: tasks = [] } = useProjectTasks(projectId);
  const createCheckpoint = useCreateCheckpoint();
  const updateCheckpoint = useUpdateCheckpoint();
  const deleteCheckpoint = useDeleteCheckpoint();
  const addRaci = useAddRaci();
  const delRaci = useDeleteRaci();

  const [cpOpen, setCpOpen] = useState(false);
  const [cpForm, setCpForm] = useState({ name: '', description: '', pillar: 'GERAL', is_mandatory: true, due_date: '' });
  const [evidenceOpen, setEvidenceOpen] = useState<ProjectCheckpoint | null>(null);
  const [evidence, setEvidence] = useState({ url: '', notes: '' });

  const [raciOpen, setRaciOpen] = useState(false);
  const [raciForm, setRaciForm] = useState<{ task_id: string; user_name: string; role: RaciRole }>({ task_id: '', user_name: '', role: 'responsible' });

  const mandatoryPending = checkpoints.filter(c => c.is_mandatory && c.status !== 'approved').length;
  const approvedCount = checkpoints.filter(c => c.status === 'approved').length;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Checkpoints aprovados</p>
              <p className="text-2xl font-bold">{approvedCount}/{checkpoints.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <Clock className="h-8 w-8 text-amber-500" />
            <div>
              <p className="text-sm text-muted-foreground">Obrigatórios pendentes</p>
              <p className="text-2xl font-bold">{mandatoryPending}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">Atribuições RACI</p>
              <p className="text-2xl font-bold">{raci.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Checkpoints */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Checkpoints de governança</CardTitle>
            <CardDescription>Marcos obrigatórios por pilar com evidência e aprovação</CardDescription>
          </div>
          <Button size="sm" onClick={() => setCpOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />Novo checkpoint
          </Button>
        </CardHeader>
        <CardContent>
          {checkpoints.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum checkpoint criado ainda.</p>
          ) : (
            <div className="space-y-3">
              {checkpoints.map(cp => {
                const info = CHECKPOINT_STATUS_INFO[cp.status];
                return (
                  <div key={cp.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium">{cp.name}</p>
                          {cp.pillar && cp.pillar !== 'GERAL' && <Badge variant="outline">{cp.pillar}</Badge>}
                          {cp.is_mandatory && <Badge variant="destructive">Obrigatório</Badge>}
                          <Badge className={cn('text-white', info.color)}>{info.label}</Badge>
                        </div>
                        {cp.description && <p className="text-sm text-muted-foreground mt-1">{cp.description}</p>}
                        {cp.due_date && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Prazo: {format(new Date(cp.due_date), 'dd/MM/yyyy', { locale: ptBR })}
                          </p>
                        )}
                        {cp.evidence_url && (
                          <a href={cp.evidence_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline mt-1 inline-block">
                            Ver evidência
                          </a>
                        )}
                        {cp.evidence_notes && <p className="text-xs italic mt-1">"{cp.evidence_notes}"</p>}
                      </div>
                      <div className="flex gap-1">
                        {cp.status === 'pending' && (
                          <Button size="sm" variant="outline" onClick={() => { setEvidenceOpen(cp); setEvidence({ url: cp.evidence_url || '', notes: cp.evidence_notes || '' }); }}>
                            <Upload className="h-3 w-3 mr-1" />Submeter
                          </Button>
                        )}
                        {cp.status === 'submitted' && (
                          <>
                            <Button size="sm" variant="default" onClick={() => updateCheckpoint.mutate({ id: cp.id, updates: {}, action: 'approve' })}>
                              <CheckCircle2 className="h-3 w-3 mr-1" />Aprovar
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => updateCheckpoint.mutate({ id: cp.id, updates: { rejection_reason: 'Revisar evidência' }, action: 'reject' })}>
                              <XCircle className="h-3 w-3 mr-1" />Rejeitar
                            </Button>
                          </>
                        )}
                        <Button size="icon" variant="ghost" onClick={() => deleteCheckpoint.mutate({ id: cp.id, projectId })}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* RACI */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Matriz RACI</CardTitle>
            <CardDescription>Responsabilidades por tarefa</CardDescription>
          </div>
          <Button size="sm" onClick={() => setRaciOpen(true)} disabled={tasks.length === 0}>
            <Plus className="h-4 w-4 mr-2" />Atribuir
          </Button>
        </CardHeader>
        <CardContent>
          {raci.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma atribuição RACI ainda.</p>
          ) : (
            <div className="space-y-2">
              {tasks.filter(t => raci.some(r => r.task_id === t.id)).map(task => (
                <div key={task.id} className="border rounded p-3">
                  <p className="font-medium text-sm">{task.title}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {raci.filter(r => r.task_id === task.id).map(r => {
                      const info = RACI_INFO[r.role];
                      return (
                        <div key={r.id} className="flex items-center gap-1 border rounded px-2 py-1 text-xs">
                          <span className={cn('inline-block w-2 h-2 rounded-full', info.color)} />
                          <span>{info.label.split(' - ')[0]}: {r.user_name || r.user_id.slice(0, 8)}</span>
                          <button onClick={() => delRaci.mutate({ id: r.id, projectId })} className="ml-1 text-destructive">×</button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* New checkpoint dialog */}
      <Dialog open={cpOpen} onOpenChange={setCpOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo checkpoint</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={cpForm.name} onChange={e => setCpForm({ ...cpForm, name: e.target.value })} /></div>
            <div><Label>Descrição</Label><Textarea value={cpForm.description} onChange={e => setCpForm({ ...cpForm, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Pilar</Label>
                <Select value={cpForm.pillar} onValueChange={v => setCpForm({ ...cpForm, pillar: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GERAL">Geral</SelectItem>
                    <SelectItem value="RA">RA - Relações Ambientais</SelectItem>
                    <SelectItem value="OE">OE - Organização Estrutural</SelectItem>
                    <SelectItem value="AO">AO - Ações Operacionais</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Prazo</Label><Input type="date" value={cpForm.due_date} onChange={e => setCpForm({ ...cpForm, due_date: e.target.value })} /></div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={cpForm.is_mandatory} onCheckedChange={v => setCpForm({ ...cpForm, is_mandatory: !!v })} />
              <Label>Obrigatório (bloqueia conclusão do projeto)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCpOpen(false)}>Cancelar</Button>
            <Button onClick={async () => {
              if (!cpForm.name) return;
              await createCheckpoint.mutateAsync({
                project_id: projectId,
                name: cpForm.name,
                description: cpForm.description || null,
                pillar: cpForm.pillar as any,
                is_mandatory: cpForm.is_mandatory,
                due_date: cpForm.due_date || null,
              });
              setCpOpen(false);
              setCpForm({ name: '', description: '', pillar: 'GERAL', is_mandatory: true, due_date: '' });
            }}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Evidence dialog */}
      <Dialog open={!!evidenceOpen} onOpenChange={(o) => !o && setEvidenceOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Submeter evidência</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>URL da evidência</Label><Input value={evidence.url} onChange={e => setEvidence({ ...evidence, url: e.target.value })} placeholder="https://..." /></div>
            <div><Label>Notas</Label><Textarea value={evidence.notes} onChange={e => setEvidence({ ...evidence, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEvidenceOpen(null)}>Cancelar</Button>
            <Button onClick={async () => {
              if (!evidenceOpen) return;
              await updateCheckpoint.mutateAsync({
                id: evidenceOpen.id,
                updates: { evidence_url: evidence.url || null, evidence_notes: evidence.notes || null },
                action: 'submit',
              });
              setEvidenceOpen(null);
            }}>Submeter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* RACI dialog */}
      <Dialog open={raciOpen} onOpenChange={setRaciOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Atribuir responsável</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Tarefa</Label>
              <Select value={raciForm.task_id} onValueChange={v => setRaciForm({ ...raciForm, task_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {tasks.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Papel</Label>
              <Select value={raciForm.role} onValueChange={v => setRaciForm({ ...raciForm, role: v as RaciRole })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(RACI_INFO).map(([k, v]) => <SelectItem key={k} value={k}>{v.label} — {v.description}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Nome</Label><Input value={raciForm.user_name} onChange={e => setRaciForm({ ...raciForm, user_name: e.target.value })} placeholder="Ex.: Maria Silva" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRaciOpen(false)}>Cancelar</Button>
            <Button onClick={async () => {
              if (!raciForm.task_id || !raciForm.user_name) return;
              await addRaci.mutateAsync({
                project_id: projectId,
                task_id: raciForm.task_id,
                user_id: crypto.randomUUID(),
                user_name: raciForm.user_name,
                role: raciForm.role,
              });
              setRaciOpen(false);
              setRaciForm({ task_id: '', user_name: '', role: 'responsible' });
            }}>Atribuir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}