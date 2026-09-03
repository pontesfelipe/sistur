# Acessos, Planos e Monetização — plano de construção

Baseado no documento enviado (v1.0, 03/09/2026). Verifiquei o estado real do banco antes de escrever este plano.

## O que confirmei no sistema atual

- `profiles`: a política de UPDATE do próprio perfil não limita colunas e o papel `authenticated` tem UPDATE em `org_id` — usuário pode trocar de organização e se auto-aprovar. Existe também política de INSERT do próprio perfil.
- `anon` tem permissão de executar `has_role` (enumeração anônima de papéis).
- Não existem: `orgs.is_platform`, `profiles.blocked_at`, nem as tabelas `plans`, `subscriptions`, `entitlement_overrides`, `beni_quotas`, `trial_state`, `sales_leads`.
- Existe apenas uma definição de `complete_user_onboarding` no banco (o conflito citado no documento não está ativo em produção, mas a definição atual será revisada mesmo assim).
- Os arquivos citados como "já no repositório" (`supabase/migrations/20260904000000_rbac_hardening.sql` e `src/lib/rbac.ts`) **não existem** — serão escritos do zero.

## Fase 0 — Hardening de acesso (primeiro, sem mudar experiência)

Migração:
- `is_trusted_caller()`; funções `has_role`, `has_role_in_org`, `user_belongs_to_org`, `get_user_org_id`, `has_system_access` retornam falso/nulo para chamadas anônimas.
- `orgs.is_platform` (substitui UUID fixo em `is_sistur_admin`); `profiles.blocked_at` / `blocked_reason`.
- `profiles`: remover INSERT/DELETE do cliente; UPDATE limitado por coluna a `full_name`, `avatar_url`, `forum_show_identity`, `updated_at`.
- `user_roles`: políticas recriadas (leitura própria/da org; escrita só ADMIN) + trigger `enforce_privileged_role_grants` (ADMIN/ORG_ADMIN só por ADMIN ou service role).
- `complete_user_onboarding` redefinida: apenas VIEWER (Analítico) e ESTUDANTE/PROFESSOR (EDU).
- `admin_approve_access_request(_user_id,_role,_org_id)`.

Código:
- `src/lib/rbac.ts` (listas canônicas de papéis e labels), usado por `UserManagement`, `OrgAdminUsersPanel`, `PendingApprovalsPanel`.
- `manage-users`: validação de papel, comparação em tempo constante na chave de setup, bloqueio real via ban no Auth, ORG_ADMIN sem poder sobre ADMIN, auditoria em todas as escritas.
- Bloqueio: nova página `/acesso-bloqueado`, `isBlocked` no `ProfileContext`, função pura `resolveBaseRedirect()` com testes, `AdminRoute platformOnly` nas rotas de plataforma.

## Fase 1 — Planos e entitlements

- `orgs.org_kind` (PLATFORM/PUBLIC/ENTERPRISE/INDEPENDENT/PENDING/DEMO) substituindo orgs "mágicas" por nome.
- Tabelas `plans` (versionada), `subscriptions` (org ou usuário), `entitlement_overrides`.
- Seed dos planos do documento (Territorial sob consulta, Empresarial por assento mín. 5, Estudante, Professor, Independente, treinamentos avulsos).
- `get_my_entitlements()` = plano ∪ overrides da org ∪ overrides do usuário ∪ trial; hook `useEntitlements()`.
- `licenses` mantida como projeção, para não quebrar `LicenseContext`/`LicenseRoute`.

## Fase 2 — Stripe e assinatura manual

- Produtos/preços em BRL com cartão, Pix e boleto; `create-checkout`, `customer-portal`, `check-subscription`, `stripe-webhook` (idempotente por evento).
- `admin_set_manual_subscription(...)` para Territorial (contrato/empenho) e `sales_leads` + formulário "Fale conosco".
- Nova página `/assinatura` alimentada por `plans`, com seletor de assentos e alternância mensal/anual.

## Fase 3 — Cotas do Professor Beni

- `beni_quotas`, `beni_credits`, `beni_usage_log`; RPCs `consume_beni_token`, `refund_beni_token`, `get_beni_balance` e concessões administrativas.
- `beni-chat` consome antes de chamar o modelo e devolve 402 com saldo ao esgotar; log de uso e custo.
- UI: contador no chat, modal de compra de pacotes, painel de consumo do ORG_ADMIN; cron mensal de reset e expiração.

## Fase 4 — Trial por consumo

- `trial_state`, `assessment_credits`, `assessments.result_locked` e `assessments.kind`.
- Estudante/Professor: 1 treinamento (o obrigatório "Fundamentos do SISTUR") + 10 perguntas Beni.
- Empresarial/Territorial: 1 diagnóstico executável com resultado bloqueado (teaser com paywall); projetos bloqueados.
- Remoção do trial por tempo (`activate_my_trial`, `expire_trial_licenses` e cron), migrando quem estiver em trial hoje.

## Fase 5 — Área comercial (ADMIN) e onboarding por público

- `/admin/comercial`: planos, assinaturas (ativação manual, suspensão, contrato), overrides, Beni, trial/conversão, professores isentos, leads, auditoria.
- Visão reduzida para ORG_ADMIN (assinatura, assentos, consumo, compra de pacotes).
- Onboarding por público e página pública de preços.

## Fase 6 — Limpeza

- Remover `ROLE_TO_PLAN`, referências a orgs por nome e a fachada de `licenses`; documentação, versão e observabilidade comercial.

## Notas técnicas

- Cada fase termina com: regeneração de types, lint/testes/build, security scan e bump MINOR em `src/config/version.ts` com entrada no histórico.
- Fase 0 não altera modo demo nem licenças; as fases seguintes preservam a UI existente até a Fase 6.
- Preços e cotas seguem exatamente a tabela do documento; qualquer ajuste comercial é só mudança de seed.

## Entrega

Sugiro aprovar e executar por fase, começando pela Fase 0 (segurança) e seguindo para a Fase 1. Se preferir, faço Fase 0 + Fase 1 numa mesma entrega.
