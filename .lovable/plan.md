
# ERP Regional / Consórcio — MVP

## Objetivo

Criar a entidade **Consórcio** (ou Região Turística) que agrupa múltiplas organizações municipais já existentes no SISTUR e oferece, para usuários autorizados desse arranjo, uma camada de leitura comparativa e consolidada — sem violar a constraint "no public rankings" (a comparação é privada, restrita aos membros do próprio consórcio, e opt-in pelos próprios municípios).

## Escopo do MVP (esta entrega)

1. Modelo de dados: `consortia`, `consortium_members`, `consortium_user_roles`.
2. Convite/aceite municipal: cada org tem que **aceitar formalmente** entrar no consórcio (consent explícito). Sem aceite, nenhum dado seu aparece para os outros.
3. Página `/consorcios` (lista) + `/consorcios/:id` (painel regional):
   - Lista de municípios membros e status de aceite
   - Comparativo de pontuação por pilar (RA/OE/AO) entre membros aceitos — apenas no último ciclo
   - Tabela de status por município (Adequado/Atenção/Crítico) por pilar
   - Mapa simples com pins dos municípios membros
4. Painel admin do consórcio: criar, editar, convidar/remover municípios, definir município-líder.
5. Gating por licença: consórcio é feature do plano **Pro/Enterprise** (LicenseRoute com `requiredFeature="erp_regional"`).
6. Bump de versão (MINOR — nova feature) + changelog + memória.

## Fora do escopo desta entrega (próximas)

- Diagnóstico comparativo histórico (séries temporais entre municípios).
- Observatório regional (módulo separado).
- Faturamento/licença em nível regional (continua por org).
- Painel de captação de recursos regional.
- Relatório IA consolidado regional.

## Modelo de dados

```text
consortia
  id, name, slug, description, lead_org_id, created_by, status (active/inactive)

consortium_members
  consortium_id, org_id, joined_at, accepted_at (null = pendente),
  invited_by, role (lead|member)
  unique (consortium_id, org_id)

consortium_user_roles
  consortium_id, user_id, role (consortium_admin|consortium_viewer)
  -- quem pode ver/gerenciar o painel regional
```

**RLS:**
- `consortia`: SELECT para qualquer membro de qualquer org aceita do consórcio + ADMIN global.
- `consortium_members`: SELECT idem; INSERT/UPDATE/DELETE só por `consortium_admin` do consórcio ou ADMIN global.
- `consortium_user_roles`: gerido por `consortium_admin` + ADMIN.
- View materializada `consortium_pillar_snapshot` (org_id, consortium_id, ra_score, oe_score, ao_score, last_assessment_at) **apenas com members.accepted_at not null** — leitura via security-definer function `get_consortium_comparison(consortium_id)`.

## Telas

- `src/pages/Consorcios.tsx` — lista de consórcios que o usuário pode ver, + botão "Criar consórcio" (ADMIN/ORG_ADMIN do município-líder).
- `src/pages/ConsorcioDetalhe.tsx` — painel regional (membros, comparativo, mapa).
- `src/components/consortia/InviteOrgDialog.tsx`, `ConsortiumMembersList.tsx`, `ConsortiumPillarComparison.tsx`.
- Card no Dashboard quando o usuário pertence a algum consórcio.
- Rota com `LicenseRoute requiredFeature="erp_regional"`.

## Aceite municipal (consent)

Quando um consórcio convida uma org, aparece um banner para o `ORG_ADMIN` daquela org em `/configuracoes` perguntando: *"O município X está sendo convidado para participar do Consórcio Y. Aceitar significa compartilhar o resumo do diagnóstico (pontuação por pilar) com os demais membros."* Aceitar grava `accepted_at`. Recusar marca `status='declined'`.

## Arquivos a criar/editar

**Novos:**
- `supabase/migrations/<timestamp>_consortia.sql`
- `src/pages/Consorcios.tsx`, `src/pages/ConsorcioDetalhe.tsx`
- `src/components/consortia/` (InviteOrgDialog, MembersList, PillarComparison, MapView)
- `src/hooks/useConsortia.ts`

**Editados:**
- `src/App.tsx` — rotas lazy novas
- `src/components/layout/Sidebar` (ou equivalente) — link "Consórcios" para quem tem feature
- `src/components/dashboard/...` — card "Consórcios em que participo"
- `src/components/settings/...` — bloco de convites pendentes para ORG_ADMIN
- `src/contexts/LicenseContext.tsx` — adicionar feature flag `erp_regional` aos planos Pro/Enterprise
- `src/config/version.ts` — bump MINOR + nota
- `mem://features/erp-regional-consortia.md` (nova memória) + index

## Confirmações antes de implementar

1. Aceite municipal obrigatório (org só entra se ORG_ADMIN dela aceitar) — **OK?**
2. Comparativo mostra **pontuação por pilar** dos municípios aceitos com nome visível (não anonimizado) entre os membros do mesmo consórcio. Isso é benchmarking privado, alinhado à constraint pública. **OK?**
3. Feature gated em **Pro e Enterprise** (não em Basic/trial). **OK?**

Posso seguir com a implementação assim que confirmar.
