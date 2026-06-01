---
name: ERP Regional / Consórcios
description: Multi-org consortia grouping municipalities with private benchmarking via opt-in
type: feature
---
Tabelas `consortia`, `consortium_members`, `consortium_user_roles`. Cada consórcio tem um município-líder (lead_org_id) e agrupa múltiplas orgs (municípios).

Regras-chave:
- Org só aparece no painel comparativo após `accepted_at IS NOT NULL` em `consortium_members` (consent explícito do ORG_ADMIN da org convidada).
- `get_consortium_comparison(_consortium_id)` é security-definer e devolve pontuação RA/OE/AO + status (Adequado/Atenção/Crítico) do último diagnóstico calculado de cada org aceita.
- `is_consortium_admin`: criador OR ORG_ADMIN do município-líder OR `consortium_user_roles.role='consortium_admin'` OR ADMIN global.
- `can_view_consortium`: membro de qualquer org aceita do consórcio OR usuário com consortium_user_role OR ADMIN OR ORG_ADMIN do líder.
- Comparação é privada entre os membros do mesmo consórcio (não viola "no public rankings" — é benchmarking interno opt-in).
- Rota: `/consorcios` (lista) e `/consorcios/:id` (detalhe). Gated por `ERPRoute`. Sem feature flag de licença no MVP.