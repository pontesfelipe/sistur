import { usePendingInvitesForMyOrg, useRespondInvite } from "@/hooks/useConsortia";
import { useProfileContext } from "@/contexts/ProfileContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Network, Check, X, Loader2, Info } from "lucide-react";

/**
 * Bloco para `/configuracoes` mostrando convites de consórcio pendentes
 * direcionados à organização do usuário. Apenas ORG_ADMIN da org deve interagir,
 * mas a RLS no banco já restringe `useRespondInvite`.
 */
export function PendingConsortiumInvitesPanel() {
  const { profile, isOrgAdmin, isAdmin } = useProfileContext();
  const orgId = profile?.org_id;
  const { data, isLoading } = usePendingInvitesForMyOrg(orgId);
  const respond = useRespondInvite();

  // Só faz sentido para quem administra a org localmente
  if (!isOrgAdmin && !isAdmin) return null;
  if (isLoading) return null;
  if (!data || data.length === 0) return null;

  return (
    <Card className="border-primary/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Network className="h-5 w-5 text-primary" />
          Convites para Consórcio
        </CardTitle>
        <CardDescription>
          Sua organização foi convidada a participar de um arranjo regional.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Ao aceitar, o resumo do diagnóstico (pontuação por pilar RA/OE/AO) do seu município passa a ser visível para os demais membros aceitos deste consórcio. Não há ranking público — a comparação é restrita ao grupo.
          </AlertDescription>
        </Alert>

        {data.map((invite) => (
          <div
            key={invite.id}
            className="flex items-start justify-between gap-3 p-3 border rounded-lg"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm">{invite.consortia?.name ?? "Consórcio"}</p>
              {invite.consortia?.description && (
                <p className="text-xs text-muted-foreground mt-1">{invite.consortia.description}</p>
              )}
              <p className="text-[10px] text-muted-foreground mt-1">
                Convite recebido em {new Date(invite.invited_at).toLocaleDateString("pt-BR")}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={() => respond.mutate({ memberId: invite.id, accept: false })}
                disabled={respond.isPending}
              >
                <X className="h-3 w-3 mr-1" /> Recusar
              </Button>
              <Button
                size="sm"
                onClick={() => respond.mutate({ memberId: invite.id, accept: true })}
                disabled={respond.isPending}
              >
                {respond.isPending ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Check className="h-3 w-3 mr-1" />
                )}
                Aceitar
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}