import { tx } from '@/i18n/t';
import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Award, Copy, ExternalLink, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  useAllCertifications,
  useCertificationLevels,
  useIssueCertification,
  useRevokeCertification,
  useEvaluateEligibility,
  type CertificationLevel,
} from "@/hooks/useDestinationCertifications";

function useOrgs() {
  return useQuery({
    queryKey: ["orgs-for-certification"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("orgs")
        .select("id, name, org_type")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

const LEVEL_BADGE: Record<CertificationLevel, string> = {
  bronze: "bg-amber-700/20 text-amber-700 border-amber-700/40",
  prata: "bg-slate-400/20 text-slate-600 border-slate-400/40",
  ouro: "bg-yellow-400/20 text-yellow-700 border-yellow-500/40",
  diamante: "bg-cyan-400/20 text-cyan-700 border-cyan-500/40",
};

function copyCode(code: string) {
  navigator.clipboard.writeText(code);
  toast.success(tx('Código copiado'));
}

function publicUrl(code: string) {
  return `${window.location.origin}/verificar-certificado/${code}`;
}

export default function AdminCertificacoes() {
  const { data: certs = [], isLoading } = useAllCertifications();
  const { data: levels = [] } = useCertificationLevels();
  const { data: orgs = [] } = useOrgs();
  const issue = useIssueCertification();
  const revoke = useRevokeCertification();

  const [openIssue, setOpenIssue] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [selectedLevel, setSelectedLevel] = useState<CertificationLevel | "">("");
  const [notes, setNotes] = useState("");

  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState("");

  const eligibility = useEvaluateEligibility(selectedOrg || null);

  const handleIssue = async () => {
    if (!selectedOrg || !selectedLevel) {
      toast.error(tx('Selecione organização e nível'));
      return;
    }
    const cfg = levels.find((l) => l.level === selectedLevel);
    if (!cfg) return;
    await issue.mutateAsync({
      org_id: selectedOrg,
      level: selectedLevel as CertificationLevel,
      validity_months: cfg.validity_months,
      assessment_id: eligibility.data?.assessment_id ?? null,
      overall_score: eligibility.data?.overall_score ?? null,
      ra_score: eligibility.data?.ra_score ?? null,
      oe_score: eligibility.data?.oe_score ?? null,
      ao_score: eligibility.data?.ao_score ?? null,
      notes,
    });
    setOpenIssue(false);
    setSelectedOrg("");
    setSelectedLevel("");
    setNotes("");
  };

  const handleRevoke = async () => {
    if (!revokeId || !revokeReason.trim()) {
      toast.error(tx('Informe o motivo da revogação'));
      return;
    }
    await revoke.mutateAsync({ id: revokeId, reason: revokeReason });
    setRevokeId(null);
    setRevokeReason("");
  };

  return (
    <AppLayout title={tx('Certificação Institucional')}>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <ShieldCheck className="h-7 w-7 text-primary" />
              {tx('Certificação Institucional do Destino')}
            </h1>
            <p className="text-muted-foreground mt-1">
              {tx('Emissão e gestão do Selo SISTUR para destinos turísticos.')}
            </p>
          </div>
          <Button onClick={() => setOpenIssue(true)}>
            <Award className="h-4 w-4 mr-2" /> {tx("Emitir certificado")}
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {levels.map((l) => (
            <Card key={l.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <span
                    className="inline-block w-3 h-3 rounded-full"
                    style={{ backgroundColor: l.badge_color ?? "#888" }}
                  />
                  {l.display_name}
                </CardTitle>
                <CardDescription className="text-xs">{tx(l.description)}</CardDescription>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-1">
                <div>{tx('Geral mín:')} <strong>{l.min_overall_score}%</strong></div>
                <div>{tx('RA/OE/AO mín:')} <strong>{l.min_ra_score}% / {l.min_oe_score}% / {l.min_ao_score}%</strong></div>
                <div>{tx('Validade:')} <strong>{tx("{{v0}} meses", { v0: l.validity_months })}</strong></div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{tx('Certificados emitidos')}</CardTitle>
            <CardDescription>{tx("{{v0}} no total", { v0: certs.length })}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">{tx('Carregando...')}</p>
            ) : certs.length === 0 ? (
              <p className="text-sm text-muted-foreground">{tx('Nenhum certificado emitido ainda.')}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tx('Organização')}</TableHead>
                    <TableHead>{tx('Nível')}</TableHead>
                    <TableHead>{tx('Status')}</TableHead>
                    <TableHead>{tx('Validade')}</TableHead>
                    <TableHead>{tx('Código')}</TableHead>
                    <TableHead className="text-right">{tx('Ações')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {certs.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.orgs?.name ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={LEVEL_BADGE[c.level as CertificationLevel]}>
                          {c.level}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={c.status === "ativo" ? "default" : "secondary"}>{tx(String(c.status ?? ""))}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {new Date(c.valid_until).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{c.verification_code}</TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button size="sm" variant="ghost" onClick={() => copyCode(c.verification_code)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" asChild>
                          <a href={publicUrl(c.verification_code)} target="_blank" rel="noreferrer">
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </Button>
                        {c.status === "ativo" && (
                          <Button size="sm" variant="ghost" className="text-destructive"
                            onClick={() => setRevokeId(c.id)}>
                            {tx('Revogar')}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={openIssue} onOpenChange={setOpenIssue}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{tx('Emitir novo certificado')}</DialogTitle>
            <DialogDescription>
              {tx('O sistema avalia automaticamente o nível elegível com base no diagnóstico mais recente da organização.')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{tx('Organização')}</Label>
              <Select value={selectedOrg} onValueChange={setSelectedOrg}>
                <SelectTrigger><SelectValue placeholder={tx('Selecione...')} /></SelectTrigger>
                <SelectContent>
                  {orgs.map((o: any) => (
                    <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedOrg && eligibility.data && (
              <Card className="bg-muted/40">
                <CardContent className="pt-4 text-sm space-y-1">
                  <div>{tx('Score geral:')} <strong>{Number(eligibility.data.overall_score).toFixed(1)}%</strong></div>
                  <div>{tx('RA / OE / AO:')} <strong>
                    {Number(eligibility.data.ra_score).toFixed(1)}% / {Number(eligibility.data.oe_score).toFixed(1)}% / {Number(eligibility.data.ao_score).toFixed(1)}%
                  </strong></div>
                  <div>{tx('Nível elegível:')} <Badge>{eligibility.data.eligible_level ?? "Nenhum"}</Badge></div>
                </CardContent>
              </Card>
            )}
            {selectedOrg && !eligibility.isLoading && !eligibility.data && (
              <p className="text-sm text-muted-foreground">{tx('Sem diagnóstico calculado para esta organização.')}</p>
            )}

            <div>
              <Label>{tx('Nível')}</Label>
              <Select value={selectedLevel} onValueChange={(v) => setSelectedLevel(v as CertificationLevel)}>
                <SelectTrigger><SelectValue placeholder={tx('Selecione o nível...')} /></SelectTrigger>
                <SelectContent>
                  {levels.map((l) => (
                    <SelectItem key={l.id} value={l.level}>{l.display_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{tx("Observações (opcional)")}</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenIssue(false)}>{tx('Cancelar')}</Button>
            <Button onClick={handleIssue} disabled={issue.isPending}>{tx('Emitir')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!revokeId} onOpenChange={(o) => !o && setRevokeId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tx('Revogar certificado')}</DialogTitle>
            <DialogDescription>{tx('Informe o motivo. Esta ação é registrada e o certificado fica inválido publicamente.')}</DialogDescription>
          </DialogHeader>
          <Textarea value={revokeReason} onChange={(e) => setRevokeReason(e.target.value)} rows={4} placeholder={tx('Motivo...')} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeId(null)}>{tx('Cancelar')}</Button>
            <Button variant="destructive" onClick={handleRevoke} disabled={revoke.isPending}>{tx('Revogar')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}