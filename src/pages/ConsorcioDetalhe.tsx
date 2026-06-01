import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  useConsortium,
  useConsortiumMembers,
  useConsortiumComparison,
  useInviteOrg,
  useRemoveMember,
  useRespondInvite,
} from "@/hooks/useConsortia";
import { useProfileContext } from "@/contexts/ProfileContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Network, Loader2, UserPlus, Trash2, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function statusColor(s: string | null) {
  if (s === "ADEQUADO") return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20";
  if (s === "ATENCAO") return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";
  if (s === "CRITICO") return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20";
  return "bg-muted text-muted-foreground border-border";
}
function statusLabel(s: string | null) {
  if (s === "ADEQUADO") return "Adequado";
  if (s === "ATENCAO") return "Atenção";
  if (s === "CRITICO") return "Crítico";
  return "Sem dados";
}
function pct(n: number | null) {
  return n == null ? "—" : `${Math.round(n)}%`;
}

function InviteOrgDialog({ consortiumId }: { consortiumId: string }) {
  const invite = useInviteOrg(consortiumId);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  // Lista de orgs visíveis ao admin (RLS limita o que aparece, mas ADMIN/ORG_ADMIN do líder consegue ver mais)
  const { data: orgs } = useQuery({
    queryKey: ["orgs-for-invite", q],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("orgs")
        .select("id, name, org_type")
        .ilike("name", `%${q}%`)
        .limit(20);
      if (error) throw error;
      return data as Array<{ id: string; name: string; org_type: string | null }>;
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2"><UserPlus className="h-4 w-4" /> Convidar município</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convidar município</DialogTitle>
          <DialogDescription>
            O município convidado precisará aceitar formalmente para participar do consórcio e compartilhar o resumo do diagnóstico.
          </DialogDescription>
        </DialogHeader>
        <Input placeholder="Buscar por nome..." value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="max-h-72 overflow-y-auto divide-y border rounded-md">
          {(orgs ?? []).map((o) => (
            <div key={o.id} className="flex items-center justify-between p-2 text-sm">
              <div>
                <div className="font-medium">{o.name}</div>
                {o.org_type && <div className="text-xs text-muted-foreground">{o.org_type}</div>}
              </div>
              <Button size="sm" variant="outline" disabled={invite.isPending} onClick={() => invite.mutate(o.id)}>
                Convidar
              </Button>
            </div>
          ))}
          {!orgs?.length && <div className="p-4 text-sm text-muted-foreground text-center">Sem resultados</div>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ConsorcioDetalhe() {
  const { id } = useParams<{ id: string }>();
  const { profile, isAdmin, isOrgAdmin } = useProfileContext();
  const { data: consortium, isLoading } = useConsortium(id);
  const { data: members } = useConsortiumMembers(id);
  const { data: comparison } = useConsortiumComparison(id);
  const removeMember = useRemoveMember(id || "");
  const respond = useRespondInvite();

  const isLead = !!profile && !!consortium && profile.org_id === consortium.lead_org_id;
  const canAdminister = isAdmin || (isLead && isOrgAdmin);

  if (isLoading) {
    return (
      <AppLayout title="Consórcio">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!consortium) {
    return (
      <AppLayout title="Consórcio">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Consórcio não encontrado ou sem permissão de acesso.</p>
            <Link to="/consorcios">
              <Button variant="link" className="mt-3">Voltar</Button>
            </Link>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  const myPendingInvite = members?.find(
    (m) => m.org_id === profile?.org_id && !m.accepted_at && !m.declined_at,
  );

  return (
    <AppLayout title={consortium.name}>
      <div className="space-y-6">
        <div className="flex items-start gap-3">
          <Link to="/consorcios">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-display font-bold flex items-center gap-2">
              <Network className="h-6 w-6 text-primary" />
              {consortium.name}
            </h1>
            {consortium.description && (
              <p className="text-muted-foreground mt-1">{consortium.description}</p>
            )}
          </div>
        </div>

        {myPendingInvite && (
          <Card className="border-primary/40 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-base">Convite pendente para o seu município</CardTitle>
              <CardDescription>
                Aceitar significa compartilhar a pontuação por pilar (RA/OE/AO) do último diagnóstico com os demais membros deste consórcio.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button size="sm" className="gap-2" disabled={respond.isPending} onClick={() => respond.mutate({ memberId: myPendingInvite.id, accept: true })}>
                <Check className="h-4 w-4" /> Aceitar
              </Button>
              <Button size="sm" variant="outline" className="gap-2" disabled={respond.isPending} onClick={() => respond.mutate({ memberId: myPendingInvite.id, accept: false })}>
                <X className="h-4 w-4" /> Recusar
              </Button>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="comparativo">
          <TabsList>
            <TabsTrigger value="comparativo">Visão Regional</TabsTrigger>
            <TabsTrigger value="municipios">Municípios ({members?.length ?? 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="comparativo" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Comparativo por pilar</CardTitle>
                <CardDescription>
                  Pontuação do último diagnóstico calculado de cada município que aceitou o consórcio.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!comparison || comparison.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    Ainda não há municípios com diagnóstico calculado neste consórcio.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="py-2 pr-3 font-medium">Município</th>
                          <th className="py-2 px-3 font-medium">RA</th>
                          <th className="py-2 px-3 font-medium">OE</th>
                          <th className="py-2 px-3 font-medium">AO</th>
                          <th className="py-2 px-3 font-medium">Último cálculo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {comparison.map((r) => (
                          <tr key={r.org_id} className="border-b last:border-0">
                            <td className="py-2 pr-3">
                              <div className="font-medium">{r.destination_name || r.org_name}</div>
                              <div className="text-xs text-muted-foreground">{r.org_name}</div>
                            </td>
                            <td className="py-2 px-3">
                              <div className={`inline-flex items-center gap-2 px-2 py-1 rounded border text-xs ${statusColor(r.ra_status)}`}>
                                <span className="font-semibold">{pct(r.ra_score)}</span>
                                <span>{statusLabel(r.ra_status)}</span>
                              </div>
                            </td>
                            <td className="py-2 px-3">
                              <div className={`inline-flex items-center gap-2 px-2 py-1 rounded border text-xs ${statusColor(r.oe_status)}`}>
                                <span className="font-semibold">{pct(r.oe_score)}</span>
                                <span>{statusLabel(r.oe_status)}</span>
                              </div>
                            </td>
                            <td className="py-2 px-3">
                              <div className={`inline-flex items-center gap-2 px-2 py-1 rounded border text-xs ${statusColor(r.ao_status)}`}>
                                <span className="font-semibold">{pct(r.ao_score)}</span>
                                <span>{statusLabel(r.ao_status)}</span>
                              </div>
                            </td>
                            <td className="py-2 px-3 text-xs text-muted-foreground">
                              {r.last_calculated_at
                                ? format(new Date(r.last_calculated_at), "dd/MM/yyyy", { locale: ptBR })
                                : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="municipios" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Municípios participantes</CardTitle>
                  <CardDescription>Convidados, aceitos e recusados.</CardDescription>
                </div>
                {canAdminister && id && <InviteOrgDialog consortiumId={id} />}
              </CardHeader>
              <CardContent>
                {!members || members.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">Nenhum município ainda.</p>
                ) : (
                  <div className="divide-y">
                    {members.map((m) => {
                      const status = m.accepted_at ? "Aceito" : m.declined_at ? "Recusou" : "Pendente";
                      const variant = m.accepted_at ? "default" : m.declined_at ? "destructive" : "secondary";
                      return (
                        <div key={m.id} className="flex items-center justify-between py-3">
                          <div>
                            <div className="font-medium text-sm">{m.org_name}</div>
                            <div className="text-xs text-muted-foreground">
                              {m.member_role === "lead" ? "Município-líder" : "Membro"} · convidado em {format(new Date(m.invited_at), "dd/MM/yyyy", { locale: ptBR })}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={variant as any}>{status}</Badge>
                            {canAdminister && m.member_role !== "lead" && (
                              <Button size="icon" variant="ghost" onClick={() => {
                                if (confirm("Remover este município do consórcio?")) removeMember.mutate(m.id);
                              }}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}