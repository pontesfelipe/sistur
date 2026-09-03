# SISTUR — Acessos, Planos Comerciais e Prompts para o Lovable

**Versão:** 1.0 — 03/09/2026
**Perspectiva:** Arquitetura de Sistemas e Segurança + Consultoria de Mercado (Brasil)
**Público:** time SISTUR e agente Lovable (prompts prontos na Seção 12)

---

## 1. Sumário executivo

O SISTUR tem hoje um modelo de acesso funcional, mas com quatro falhas críticas de segurança que precisam ser corrigidas **antes** de qualquer monetização, um modelo de licenças por tempo (trial de 7 dias, planos por papel) que não reflete a estratégia comercial desejada, e nenhuma integração de pagamento.

Este documento entrega:

1. **Diagnóstico** do modelo atual (usuários, papéis, acessos, permissões) com achados classificados por severidade.
2. **Modelo-alvo de acesso**: plataforma → organização → usuário → plano → entitlements → consumo. Mantém administradores globais, modo demo, organizações e a organização de usuários independentes (hoje "Autônomo").
3. **Planos e preços** com visão de consultor de mercado brasileiro: Territorial (sob consulta), Empresarial (por usuário, mínimo 5), Estudante (mensalidade ou por treinamento), Professor (isento com 5 alunos) e Independente (opcional).
4. **Sistema de tokens do Professor Beni** (30 perguntas/mês, 60 no Empresarial, pacotes adicionais).
5. **Trial por consumo** (1 treinamento; no Empresarial/Territorial também 1 diagnóstico com resultado bloqueado) e **rodada única** para estudantes.
6. **Área administrativa** com controle total de planos, cotas, licenças manuais e uso.
7. **Roadmap em fases** e **prompts prontos** para colar no Lovable, aproveitando Lovable Cloud, Stripe, Lovable AI, pg_cron e e-mail.

A correção de segurança (Fase 0) já está escrita no repositório: `supabase/migrations/20260904000000_rbac_hardening.sql` e `src/lib/rbac.ts`.

---

## 2. Diagnóstico do modelo atual

### 2.1 Como funciona hoje

| Camada | Estado atual |
|---|---|
| Autenticação | Supabase Auth (e-mail/senha). Trigger `handle_new_user` cria `profiles` na org "Temporário" com `pending_approval = true`. |
| Organizações | `orgs` com `org_type` (PUBLIC/PRIVATE), `is_demo`, `has_territorial_access`, `has_enterprise_access`. Orgs especiais por **nome**: "Temporário", "Autônomo", "Não Atribuídos", "Demo SISTUR", "SISTUR". |
| Papéis | Enum `app_role`: ADMIN, ORG_ADMIN, ANALYST, VIEWER, ESTUDANTE, PROFESSOR. Tabela `user_roles (user_id, org_id, role)` — um papel por org. |
| Sistema | `profiles.system_access`: ERP (Analítico) ou EDU. |
| Onboarding | RPC `complete_user_onboarding` → usuário escolhe sistema e papel → fica pendente → ADMIN aprova no painel. |
| Gestão de usuários | Edge function `manage-users` (service role) com ações create/update_role/block/delete/change_org…; ADMIN global, ORG_ADMIN restrito à própria org. |
| Licenças | Tabela `licenses` (trial 7 dias, estudante, professor, basic, pro, enterprise) com `features` JSON; `LicenseRoute requiredFeature`. Sem pagamento. |
| Módulos | `org_module_overrides` (empacotamento por org) via `ModuleRoute`. ADMIN ignora. |
| Demo | `viewing_demo_org_id` + RPC `toggle_demo_mode` / `set_demo_org_id` (só leitura de dados da org demo). |
| Beni (bot) | Edge function `beni-chat` via Lovable AI gateway. **Sem cota** por usuário. |
| Referral | Professor tem código; `professor_qualifies_free_license` = ≥ 5 alunos vinculados. Org tem código de convite (`link_user_to_org_by_code`). |

### 2.2 Achados de segurança

| # | Sev. | Achado | Impacto | Correção (Fase 0) |
|---|---|---|---|---|
| S1 | **Crítico** | Política de UPDATE de `profiles` é apenas por linha; usuário pode alterar `pending_approval`, `org_id`, `system_access` no próprio perfil. | Auto-aprovação, troca de tenant (acesso aos dados de qualquer org cujo id conheça), bypass de qualquer paywall. | Grants por coluna: cliente só atualiza `full_name`, `avatar_url`, `forum_show_identity`. |
| S2 | **Crítico** | Política "Users can insert their own profile" permite INSERT de perfil pelo cliente com qualquer `org_id` e `pending_approval=false`. | Usuário rejeitado (perfil apagado, auth mantido por bug) recria perfil dentro de outra org. | Remover política e revogar INSERT/DELETE do papel `authenticated`. |
| S3 | **Crítico** | `complete_user_onboarding` tem duas definições concorrentes no repositório: uma aceita `_role='ADMIN'` (auto-promoção a admin global), outra faz cast para um tipo inexistente (`public.user_role`). | Escalada de privilégio ou onboarding quebrado, dependendo de qual migração foi aplicada. | Redefinição única: só VIEWER/ESTUDANTE/PROFESSOR, coerente com o sistema, cast correto. |
| S4 | **Crítico** | Migração de 03/09 concede EXECUTE a `anon` em `has_role`, `has_role_in_org`, `user_belongs_to_org`, `get_user_org_id`. | Enumeração anônima de "quem é admin" e "a que org pertence" por user id. | Funções retornam `false`/`NULL` para chamadas anônimas (`is_trusted_caller()`). |
| S5 | Alto | Fluxo de aprovação (`PendingApprovalsPanel`) escreve direto em `profiles`/`user_roles`; RLS exige que o admin pertença à org "Temporário" → falha; rejeição chama ação inexistente (`delete`), deixando o usuário no Auth sem perfil. | Aprovação/rejeição não confiáveis; contas órfãs. | RPC `admin_approve_access_request(user, role, org)`; rejeição via `delete_user`. |
| S6 | Alto | "Bloquear" usuário = `pending_approval=true`. Bloqueado some da lista (filtro), vê tela "aguardando aprovação", sessão continua válida. | Estado ambíguo; sem bloqueio real. | Coluna `blocked_at` + ban no Supabase Auth (`ban_duration`) + `user_belongs_to_org` ignora bloqueados. |
| S7 | Alto | `AdminRoute` admite ORG_ADMIN em páginas exclusivas de plataforma (/admin/semantica, /admin/audit, /admin/licencas, /admin/ingestoes, /admin/report-logs…), embora o menu as oculte. | Páginas quebradas/expostas a admins de tenant. | Prop `platformOnly` no `AdminRoute`. |
| S8 | Alto | `manage-users`: ação `service_create` sem autenticação (chave estática no body, comparação não constante); ORG_ADMIN pode alterar `system_access` de ADMIN; papel não validado contra enum; admin pode rebaixar a si mesmo. | Superfície de escalada e lockout. | Endurecimento da função (Prompt 0). |
| S9 | Médio | Duas definições de "super admin": `has_role(ADMIN)` (global) e `is_sistur_admin` (ADMIN + org com UUID fixo). | Regras inconsistentes. | Decisão: **ADMIN = admin de plataforma**; `orgs.is_platform` substitui UUID fixo. |
| S10 | Médio | Ninguém impede que um SECURITY DEFINER futuro conceda ADMIN/ORG_ADMIN. | Regressão silenciosa. | Trigger `enforce_privileged_role_grants` em `user_roles`. |
| S11 | Médio | Usuários pendentes pertencem à org "Temporário" e enxergam perfis de outros pendentes. | Vazamento leve de PII. | `user_belongs_to_org` exige perfil aprovado e não bloqueado. |
| S12 | Baixo | Webhooks `handle-email-events` e `pms-oauth-callback` sem verificação de assinatura/estado forte; 8 edge functions não usam `_shared/auth.ts`. | Drift de autenticação. | Padronizar (Seção 11). |
| S13 | Baixo | `src/integrations/supabase/types.ts` desatualizado (RPCs do hardening de abril ausentes) — indício de que migrações manuais podem não ter sido aplicadas em produção. | Incerteza operacional. | Regenerar types e conferir `supabase_migrations` (checklist). |

### 2.3 Achados de produto/arquitetura

- **Licença por tempo** (7 dias) não reflete a estratégia "trial por consumo".
- **Plano preso ao papel** (`ROLE_TO_PLAN` em `manage-users`): papel de acesso e plano comercial são conceitos diferentes e devem ser separados.
- **Entitlements espalhados**: `licenses.features` JSON + `org_module_overrides` + `hasERPAccess`/`hasEDUAccess` no cliente. Falta uma função única "o que este usuário pode fazer".
- **Sem contabilização** de uso do Beni, treinamentos consumidos ou rodadas.
- **Orgs especiais por nome** ("Temporário", "Autônomo") são frágeis; devem virar tipo/flag.

---

## 3. Modelo-alvo de acesso

### 3.1 Camadas

```
Plataforma (ADMIN global, org is_platform)
 └─ Organização (tipo: PLATFORM | PUBLIC | ENTERPRISE | INDEPENDENT | PENDING | DEMO)
     ├─ Assinatura / Licença (plano, seats, status, origem: stripe | manual | isenção)
     ├─ Entitlements efetivos (plano ∪ overrides da org ∪ overrides do usuário)
     └─ Usuário (papel na org + system_access + consumo: Beni, treinamentos, rodadas)
```

### 3.2 Tipos de organização (substituem os nomes mágicos)

| `org_kind` | Hoje | Uso |
|---|---|---|
| `PLATFORM` | org "SISTUR" (`is_platform`) | Casa dos administradores globais. |
| `PUBLIC` | `org_type = PUBLIC` | Gestores públicos: plano **Territorial**. |
| `ENTERPRISE` | `org_type = PRIVATE` | Empresas: plano **Empresarial** (mín. 5 usuários). |
| `INDEPENDENT` | org "Autônomo" | **Independentes**: usuários sem empresa (estudantes, professores, consultores). Nome sugerido: "Independentes" (alternativas: "Conta Individual", "Profissionais Autônomos"). Cada usuário tem sua própria assinatura. |
| `PENDING` | org "Temporário" | Contas aguardando aprovação; sem acesso a dados. |
| `DEMO` | `is_demo` | Dados de demonstração; leitura via modo demo (mantido como está). |

### 3.3 Papéis (mantidos) e o que cada um faz

| Papel | Escopo | Pode |
|---|---|---|
| **ADMIN** | Plataforma | Tudo. Único que concede ADMIN/ORG_ADMIN, ativa licenças manuais, gerencia planos/cotas, modo demo em qualquer org. |
| **ORG_ADMIN** | Org | Gerir usuários da própria org (criar, papel não-privilegiado, bloquear, remover), ver consumo e assinatura da org, comprar seats/tokens. |
| **ANALYST** | Org | Criar/editar diagnósticos, projetos, relatórios. |
| **VIEWER** | Org | Ler dashboards e relatórios; fazer treinamentos. |
| **PROFESSOR** | Org/Independente | Turmas, trilhas, avaliações; treinamentos; Beni. |
| **ESTUDANTE** | Org/Independente | Treinamentos, certificados, jogos, 1 rodada didática. |

Regra de ouro: **papel** define *o que a pessoa pode operar*; **plano/entitlement** define *o que a organização contratou*. Um VIEWER numa org Territorial vê análise territorial; um ANALYST numa org Empresarial só cria diagnósticos empresariais.

### 3.4 Entitlements canônicos (retornados por `get_my_entitlements()`)

| Chave | Tipo | Descrição |
|---|---|---|
| `territorial_diagnostics` | bool | Rodadas/diagnósticos territoriais (RA/OE/AO, IGMA). |
| `enterprise_diagnostics` | bool | Diagnósticos empresariais. |
| `results_enabled` | bool | Gerar/ver resultados dos diagnósticos (falso em trial). |
| `projects` | bool | Gerenciamento de projetos. |
| `edu_all_trainings` | bool | Todos os treinamentos (senão, só comprados/trial). |
| `edu_classrooms` | bool | Turmas (professor). |
| `reports` / `integrations` / `consortia` / `observatory` | bool | Módulos existentes. |
| `beni_monthly_quota` | int | Perguntas/mês ao Beni (30 padrão, 60 Empresarial). |
| `assessment_credits` | int | Rodadas avulsas incluídas (1 para estudante). |
| `seats` | int | Usuários contratados (Empresarial/Territorial). |
| `trial` | obj | `{ active, training_consumed, assessment_used }`. |

### 3.5 Modo demo

Mantido: ADMIN ativa `toggle_demo_mode`; leitura via `get_effective_org_id()`; escrita sempre na org real (já corrigido no hardening de abril). Passa a exibir também um "plano demo" fictício para testar a UI de paywall.

---

## 4. Planos e precificação (visão de consultor de mercado)

### 4.1 Contexto brasileiro

- **Setor público municipal**: compra por contrato/empenho, raramente cartão. A Lei 14.133/2021 permite **dispensa de licitação** para serviços até um teto anual (≈ R$ 60–65 mil, atualizado por decreto). Manter o pacote municipal padrão **abaixo desse teto** acelera drasticamente a venda. Estados, consórcios e regiões turísticas contratam valores maiores via licitação ou adesão.
- **SaaS B2B por assento**: benchmarks BR entre R$ 79 e R$ 299/usuário/mês para ferramentas de gestão especializadas.
- **EdTech B2C**: assinaturas de R$ 29 a R$ 99/mês; cursos avulsos de nicho entre R$ 79 e R$ 297.
- **Pagamento**: Pix é o método dominante em B2C; cartão recorrente para assinaturas; boleto/NF-e para PJ. Stripe Brasil suporta cartão, **Pix e boleto**, e é a integração nativa do Lovable.

### 4.2 Tabela de planos proposta

| Plano | Público | Preço sugerido | Inclui | Beni | Trial |
|---|---|---|---|---|---|
| **Territorial** | Gestores públicos (PUBLIC) | **Sob consulta** ("Fale conosco"). Faixas internas na 4.3. | Análise territorial, projetos, treinamentos ilimitados p/ todos os usuários, observatório, consórcios, relatórios | 30/usuário/mês | 1 treinamento + 1 diagnóstico com resultado bloqueado |
| **Empresarial** | Empresas (ENTERPRISE) | **R$ 149/usuário/mês**, mínimo **5 usuários** (R$ 745/mês). Anual: **R$ 119/usuário/mês** (R$ 7.140/ano p/ 5). | Diagnóstico empresarial, projetos, treinamentos ilimitados, relatórios, integrações PMS | **60/usuário/mês** | 1 treinamento por usuário + 1 diagnóstico com resultado bloqueado |
| **Estudante** | Independentes | **R$ 49,90/mês** ou **R$ 449/ano**. Avulso: **R$ 79 / 129 / 199** por treinamento (Básico/Intermediário/Avançado, 12 meses de acesso). | Todos os treinamentos, certificados, jogos, fórum, **1 rodada didática** (territorial *ou* empresarial) | 30/mês | 1 treinamento (Fundamentos do SISTUR) |
| **Professor** | Independentes | **R$ 49,90/mês**; **isento** enquanto tiver ≥ 5 alunos com assinatura ativa vinculados ao seu código | Tudo do Estudante + turmas, diário, avaliações, trilhas | 30/mês | 1 treinamento |
| **Independente (opcional)** | Consultores sem empresa | **R$ 249/mês** (1 usuário) | Territorial + Empresarial limitados a 3 destinos/empresas ativos, projetos, treinamentos | 60/mês | Igual ao Empresarial |

Add-ons: **rodada avulsa** para estudantes R$ 99; **usuário adicional** Territorial R$ 99/mês; **pacotes Beni** (4.6).

### 4.3 Faixas internas do Territorial (não publicar; guiar a proposta comercial)

| Porte | Referência | Usuários incluídos |
|---|---|---|
| Município até 50 mil hab. | R$ 2.900/mês (R$ 34.800/ano) | 10 |
| Município 50–300 mil hab. | R$ 4.900/mês (R$ 58.800/ano — abaixo do teto de dispensa) | 15 |
| > 300 mil hab., estados, consórcios, regiões turísticas | a partir de R$ 9.900/mês | 30 |

Justificativa: o valor equivale a uma fração do custo de uma consultoria de plano diretor de turismo (R$ 80–300 mil), com entrega contínua e capacitação incluída.

### 4.4 Regras comerciais

1. **Empresarial**: cobrança por assento, mínimo 5; assentos adicionais a qualquer momento (proration Stripe); downgrade só na renovação.
2. **Professor isento**: recalculado mensalmente (pg_cron): conta alunos com `link_student_referral` **e** assinatura Estudante ativa no mês; ≥ 5 → cobrança do mês = R$ 0 (cupom 100% no Stripe ou `subscription.source = referral_waiver`). Cair abaixo de 5 → volta a cobrar no ciclo seguinte, com aviso por e-mail.
3. **Rodada didática do estudante**: 1 crédito (`assessment_credits = 1`), tipo escolhido no uso; consumido ao calcular; resultado visível (é didático). Marca d'água "Rodada didática — Estudante".
4. **Trial por consumo** (substitui os 7 dias):
   - Estudante/Professor: **1 treinamento** (o `is_foundation`, "Fundamentos do SISTUR") do início ao certificado; 10 perguntas Beni totais; sem prazo.
   - Empresarial/Territorial: cada usuário 1 treinamento; a org cria e **executa 1 diagnóstico**, mas a tela de resultado/relatório mostra "Resultados disponíveis no plano X" (teaser com pilares em blur). Projetos: criação bloqueada.
   - Trial termina quando o consumo se esgota (paywall imediato) ou quando assina.
5. **Territorial**: só ativação manual pelo ADMIN (contrato). O botão "Fale conosco" abre formulário → e-mail para comercial + registro em `sales_leads`.

### 4.5 Projeção ilustrativa (12 meses, cenário conservador)

| Segmento | Volume | Receita/mês |
|---|---|---|
| 8 municípios Territorial (média R$ 4.000) | 8 | R$ 32.000 |
| 20 empresas Empresarial (média 6 usuários) | 120 seats | R$ 17.880 |
| 400 estudantes assinantes | 400 | R$ 19.960 |
| 60 professores (20 isentos) | 40 pagantes | R$ 1.996 |
| Pacotes Beni + avulsos | — | ~R$ 3.000 |
| **Total** | | **≈ R$ 75 mil/mês** |

### 4.6 Tokens do Professor Beni

| Cota | Valor |
|---|---|
| Padrão (Estudante, Professor, Territorial, Independente) | **30 perguntas/mês** por usuário |
| Empresarial | **60 perguntas/mês** por usuário |
| Trial | 10 perguntas totais |
| Pacote 50 perguntas | **R$ 14,90** |
| Pacote 150 perguntas | **R$ 34,90** |
| Pacote org 500 perguntas (Empresarial/Territorial) | **R$ 99** (distribuído entre usuários da org) |

Custo estimado por pergunta no Lovable AI (Gemini Flash): R$ 0,01–0,06 → margem > 90 %. A cota mensal não acumula; saldo comprado vale 12 meses. Ordem de consumo: cota mensal → saldo comprado do usuário → saldo da org.

---

## 5. Sistema de tokens do Beni — desenho técnico

- Tabelas: `beni_quotas` (user_id, period `YYYY-MM`, monthly_allowance, used), `beni_credits` (user_id ou org_id, balance, expires_at, source), `beni_usage_log` (user_id, org_id, question_chars, model, cost_estimate, created_at).
- RPC `consume_beni_token(_org_id)` (SECURITY DEFINER, atômico com `SELECT … FOR UPDATE`): verifica cota mensal → créditos do usuário → créditos da org; retorna `{allowed, remaining_monthly, remaining_credits}` ou erro `beni_quota_exceeded`.
- `beni-chat` chama `consume_beni_token` **antes** de chamar o gateway; em falha do modelo, chama `refund_beni_token`.
- Reset mensal: pg_cron `0 3 1 * *` cria a linha do período com a `monthly_allowance` vinda de `get_my_entitlements()`.
- UI: contador "Beni: 27/30 este mês" no chat; CTA de compra ao esgotar; painel do ORG_ADMIN com consumo por usuário.
- Admin: ajustar cota por plano, por org e por usuário; conceder créditos manualmente; relatório de uso e custo.

---

## 6. Pagamentos e recursos do Lovable a alavancar

| Recurso Lovable | Uso no SISTUR |
|---|---|
| **Lovable Cloud** (Supabase gerenciado) | DB, Auth, RLS, edge functions, secrets, storage — já em uso. |
| **Integração Stripe nativa** | Gera `create-checkout`, `check-subscription`, `customer-portal` e webhook. Habilitar **Pix** e **boleto** na conta Stripe Brasil (exige CNPJ). Produtos: Empresarial mensal/anual (por assento, `quantity` = seats, mínimo 5), Estudante mensal/anual, Professor mensal, treinamentos avulsos (pagamento único), pacotes Beni (pagamento único), Independente. |
| **Stripe Customer Portal** | Troca de plano, seats, cartão, cancelamento — sem UI própria. |
| **Webhook Stripe → `subscriptions`** | Fonte da verdade do status; `licenses` passa a ser derivada/compatível. |
| **Lovable AI** | Já usado no Beni; a contabilização de tokens protege o custo de créditos de IA. |
| **pg_cron** | Reset mensal do Beni, recálculo da isenção do professor, expiração de créditos, lembretes. |
| **E-mail (Resend, já configurado)** | Recibos, isenção obtida/perdida, cota do Beni esgotada, lead Territorial. |
| **Security scan / RLS linter do Lovable** | Rodar após cada fase. |
| **GitHub sync** | Este documento e a migração de hardening já estão no repositório. |

Setor público: sem Stripe. Fluxo **manual**: lead → proposta → contrato → ADMIN cria a assinatura com `source = manual`, `seats`, vigência e anexa número do empenho; renovação por alerta 60/30 dias. Nota fiscal: emitir fora do sistema inicialmente; se quiser automatizar NF-e + boleto com conciliação, avaliar **Asaas** ou **Pagar.me** numa fase posterior (edge function própria).

---

## 7. Área administrativa (ADMIN global)

Aba **Comercial** em Configurações (ou rota `/admin/comercial`):

1. **Planos**: CRUD de `plans` (código, nome, público, preço mensal/anual, mínimo de seats, entitlements JSON, ids Stripe). Alterar preço cria nova versão (não altera assinantes ativos).
2. **Assinaturas**: lista por org/usuário, status Stripe, seats, próxima cobrança; **ativação manual** (Territorial), suspensão, extensão, notas e anexo do contrato.
3. **Overrides**: entitlements extras por org/usuário (ex.: piloto gratuito, +20 Beni/mês).
4. **Beni**: cotas por plano, créditos manuais, uso e custo por org/usuário/mês, top usuários.
5. **Trial e consumo**: quem está em trial, o que consumiu, conversão; reset manual de trial.
6. **Professores**: alunos vinculados, isentos no mês, histórico.
7. **Leads**: formulário "Fale conosco" do Territorial.
8. **Auditoria**: tudo acima grava em `audit_events` (já existe).

ORG_ADMIN vê a versão da própria org: assinatura, seats, consumo do Beni, compra de pacotes, convite por código.

---

## 8. Modelo de dados proposto

```sql
-- Organizações
ALTER TABLE orgs ADD COLUMN org_kind text CHECK (org_kind IN ('PLATFORM','PUBLIC','ENTERPRISE','INDEPENDENT','PENDING','DEMO'));

-- Catálogo de planos (versionado)
plans (id, code, version, name, audience, billing_model ['per_seat','flat','per_user_month','one_time','contact'],
       price_month_cents, price_year_cents, min_seats, entitlements jsonb, stripe_price_month, stripe_price_year, active)

-- Assinaturas (org OU usuário)
subscriptions (id, org_id null, user_id null, plan_code, plan_version, status ['trialing','active','past_due','canceled','suspended'],
               seats, source ['stripe','manual','referral_waiver','demo'], stripe_customer_id, stripe_subscription_id,
               current_period_start, current_period_end, contract_ref, activated_by, notes)

-- Overrides
entitlement_overrides (id, org_id null, user_id null, key, value jsonb, reason, expires_at, created_by)

-- Consumo
training_purchases (id, user_id, training_id, stripe_payment_intent, amount_cents, expires_at)
assessment_credits (user_id, credits_total, credits_used, last_used_kind)
trial_state (subject_id, subject_kind ['user','org'], training_consumed_at, assessment_run_at, converted_at)
beni_quotas / beni_credits / beni_usage_log (Seção 5)
sales_leads (id, org_name, contact, population_band, message, status)

-- Função central
get_my_entitlements() RETURNS jsonb  -- plano ∪ overrides org ∪ overrides usuário ∪ trial
```

`licenses` permanece durante a transição como projeção de `subscriptions` (view ou trigger), para não quebrar `LicenseContext`; remover na Fase 6.

---

## 9. O que já existe e é reaproveitado

- `professor_referral_codes`, `link_student_referral`, `get_professor_referral_count`, `professor_qualifies_free_license` → base da isenção do professor.
- `org_referral_codes`, `link_user_to_org_by_code` → convite de membros.
- `orgs.has_territorial_access` / `has_enterprise_access` → viram entitlements `territorial_diagnostics` / `enterprise_diagnostics`.
- `org_module_overrides` + `ModuleRoute` → viram `entitlement_overrides` por módulo.
- `edu_trainings.is_foundation` → o treinamento do trial.
- `licenses`, `LicenseContext`, `LicenseRoute` → mantidos como fachada até a Fase 6.
- Modo demo, `audit_events`, `manage-users`, `_shared/auth.ts`.

---

## 10. Roadmap por fases

| Fase | Entrega | Critério de aceite |
|---|---|---|
| **0 — Hardening** (1 semana) | Migração `20260904000000_rbac_hardening.sql`; `manage-users` endurecida; aprovação via RPC; bloqueio real; `AdminRoute platformOnly`; types regenerados. | Testes: usuário comum não altera `org_id`/`pending_approval`; onboarding só VIEWER/ESTUDANTE/PROFESSOR; anon não lê roles; bloqueado não loga; ORG_ADMIN não entra em /admin/semantica. |
| **1 — Modelo de planos** (1–2 sem.) | `org_kind`, `plans`, `subscriptions`, `entitlement_overrides`, `get_my_entitlements()`, `useEntitlements()`; `licenses` como projeção. | UI existente continua funcionando; entitlements refletem plano da org. |
| **2 — Stripe** (1–2 sem.) | Produtos/preços, checkout (cartão + Pix + boleto), portal, webhook; assinatura manual para Territorial; página de planos nova. | Compra Estudante/Empresarial ativa entitlements em < 1 min; cancelamento reflete. |
| **3 — Beni tokens** (1 sem.) | Cotas, créditos, `consume_beni_token`, UI de saldo, pacotes via Stripe, cron mensal. | 31ª pergunta bloqueia; pacote libera; Empresarial 60. |
| **4 — Trial por consumo + rodada única** (1 sem.) | `trial_state`, `assessment_credits`, gate de resultado, paywalls contextuais. | Trial acaba ao concluir treinamento; resultado bloqueado no trial Empresarial; estudante roda 1 rodada. |
| **5 — Admin comercial** (1–2 sem.) | Aba Comercial completa (Seção 7) + painel do ORG_ADMIN. | ADMIN ativa Territorial manual, ajusta cotas, vê uso e custo. |
| **6 — Limpeza** (1 sem.) | Remover trial por tempo, `ROLE_TO_PLAN`, nomes mágicos de org; observabilidade; docs. | Sem referências a "Temporário"/"Autônomo" por nome no código. |

---

## 11. Recomendações adicionais

1. **Testes de RLS automatizados** (pgTAP ou script SQL em CI) para os cenários da Fase 0 — hoje não existe nenhum teste de política.
2. **Conferir drift de migrações**: comparar `supabase_migrations.schema_migrations` com a pasta; as migrações manuais (`*_rls_audit_hardening.sql`, `*_add_licenses_table.sql`, `*_schedule_license_expiry_cron.sql`) podem não estar aplicadas.
3. **Regenerar `types.ts`** após cada fase (Lovable faz isso automaticamente ao migrar).
4. **Webhooks**: validar assinatura (Stripe `constructEvent`, Resend signing secret) e `state` assinado no OAuth do PMS.
5. **Padronizar auth das edge functions** em `_shared/auth.ts` (`requireUser`, `requireAdmin`, `requireOrgAdmin` novo).
6. **2FA/MFA para ADMIN** (Supabase Auth TOTP) e alerta de login admin.
7. **Rate limiting** no `beni-chat` e nas funções de busca (por usuário, via tabela de janela deslizante).
8. **LGPD**: exportação/anonimização de conta (`delete_user` já remove; adicionar pseudonimização em `audit_events`), consentimento já existe (`terms_acceptance`).
9. **Observabilidade comercial**: eventos `subscription_created`, `trial_consumed`, `beni_quota_exceeded`, `paywall_shown` em `usage_events` para funil.
10. **Sessões**: reduzir TTL do JWT para 15–30 min quando houver bloqueio/rebaixamento (o ban do Auth cobre o refresh).
11. **Separar papel de plano** também no `manage-users`: remover `ROLE_TO_PLAN` (Fase 6).
12. **Nomear a org de independentes** como "Independentes" e tratá-la por `org_kind`, nunca por nome.

---

## 12. Prompts para o Lovable

Instruções gerais para todos os prompts: cole um prompt por vez, na ordem; ao final de cada um, peça ao Lovable para rodar o *security scan* e regenerar os types. Cada prompt é autocontido.

### Prompt 0 — Hardening de acessos (Fase 0)

```text
Contexto: SISTUR (Vite + React + Supabase). Papéis em `user_roles` (enum app_role: ADMIN, ORG_ADMIN, ANALYST, VIEWER, ESTUDANTE, PROFESSOR). ADMIN é administrador de plataforma (global); ORG_ADMIN administra apenas a própria organização. Perfis em `profiles` (org_id, system_access ERP|EDU, pending_approval). Gestão de usuários pela edge function `manage-users`.

Objetivo: corrigir falhas críticas de acesso sem mudar a experiência dos usuários aprovados.

1) Aplique como nova migração o SQL do arquivo `supabase/migrations/20260904000000_rbac_hardening.sql` que está no repositório (é idempotente). Ele: cria `is_trusted_caller()`; adiciona `orgs.is_platform` e redefine `is_sistur_admin`; adiciona `profiles.blocked_at` e `blocked_reason`; torna `has_role`, `has_role_in_org`, `has_org_admin_role`, `user_belongs_to_org`, `get_user_org_id`, `has_system_access` seguros para chamadas anônimas e faz `user_belongs_to_org` exigir perfil aprovado e não bloqueado; revoga INSERT/DELETE de `profiles` para `authenticated` e limita UPDATE às colunas full_name, avatar_url, forum_show_identity, updated_at; recria as políticas de `user_roles` (leitura da própria linha ou da org; escrita só ADMIN); cria o trigger `enforce_privileged_role_grants` (ADMIN/ORG_ADMIN só podem ser concedidos/alterados por ADMIN ou service role); redefine `complete_user_onboarding` (apenas VIEWER para ERP, ESTUDANTE/PROFESSOR para EDU, cast correto para app_role); cria `admin_approve_access_request(_user_id, _role, _org_id)` e mantém `admin_approve_user(_user_id)` como wrapper. Se preferir reescrever, mantenha exatamente essas regras.

2) Edge function `manage-users`:
   - Na ação `service_create`, compare a chave com comparação em tempo constante e registre em `audit_events`; se `ADMIN_SETUP_KEY` não estiver definida, responda 404.
   - Valide `role` contra a lista ['ADMIN','ORG_ADMIN','ANALYST','VIEWER','ESTUDANTE','PROFESSOR'] em todas as ações.
   - ORG_ADMIN não pode alterar `system_access`, papel, bloqueio ou remoção de usuários ADMIN/ORG_ADMIN, e nunca pode agir sobre si mesmo; ADMIN não pode rebaixar nem bloquear a si mesmo.
   - Ação `block_user`: gravar `profiles.blocked_at = now()` / `blocked_reason` (ou NULL ao desbloquear), aplicar `auth.admin.updateUserById(user_id, { ban_duration: blocked ? '87600h' : 'none' })`, suspender/reativar a licença. NÃO usar mais `pending_approval` para bloqueio.
   - Ação `list`: retornar usuários com `pending_approval = false` incluindo bloqueados, com `is_blocked = blocked_at IS NOT NULL`.
   - Todas as ações de escrita inserem em `audit_events` (org_id do alvo, user_id do solicitante, event_type USER_ROLE_CHANGED | USER_BLOCKED | USER_UNBLOCKED | USER_DELETED | USER_ORG_CHANGED | USER_CREATED).
   - ORG_ADMIN pode ser atribuído tanto a usuários ERP quanto EDU.

3) Frontend:
   - `src/components/settings/PendingApprovalsPanel.tsx`: aprovar via `supabase.rpc('admin_approve_access_request', { _user_id, _role, _org_id: null })` (não escrever mais em `profiles`/`user_roles` direto); rejeitar via `manage-users` ação `delete_user`. Usar as listas de papéis de `src/lib/rbac.ts` (já existe no repositório) e nunca oferecer ADMIN na aprovação.
   - `src/contexts/ProfileContext.tsx`: incluir `blocked_at` em `UserProfile` e expor `isBlocked`. Em `ProtectedRoute`, `AdminRoute`, `ERPRoute`, `EduRoute`, `LicenseRoute`: se `isBlocked`, redirecionar para `/acesso-bloqueado` (nova página simples com botão Sair e contato). Extrair a cadeia comum de redirecionamentos (sem usuário → /auth; termos → /termos; onboarding → /onboarding; pendente → /pending-approval; bloqueado → /acesso-bloqueado) para uma função pura `resolveBaseRedirect()` em `src/components/layout/accessGate.ts` com testes Vitest.
   - `AdminRoute`: nova prop `platformOnly` (só ADMIN). Aplicar em /admin/edu, /admin/certificacoes, /admin/empacotamento, /admin/licencas, /admin/ingestoes, /admin/audit, /admin/report-logs, /admin/semantica. `/configuracoes` e `/metodologia` continuam aceitando ORG_ADMIN.
   - `src/hooks/useUserManagement.ts`: usar `isAdmin` do `useProfileContext()` em vez de chamar a RPC `has_role`.
   - `src/pages/Auth.tsx`: quando o erro de login contiver "banned", exibir "Sua conta está bloqueada. Entre em contato com o administrador."
   - Substituir as listas de papéis duplicadas em `UserManagement.tsx`, `OrgAdminUsersPanel.tsx` e `PendingApprovalsPanel.tsx` pelas constantes de `src/lib/rbac.ts` (`ROLES_BY_SYSTEM`, `assignableRoles`, `ROLE_LABELS`).

4) Regenere `src/integrations/supabase/types.ts`, rode lint, testes e build. Não altere o modo demo nem a lógica de licenças nesta etapa.

Critérios de aceite: um usuário autenticado comum recebe erro ao fazer PATCH em `profiles.org_id` ou `pending_approval`; `complete_user_onboarding` com `_role='ADMIN'` falha; chamada anônima a `has_role` retorna false; ORG_ADMIN acessando /admin/semantica é redirecionado; usuário bloqueado não consegue logar e, se logado, cai em /acesso-bloqueado; aprovação e rejeição no painel funcionam para usuários da org "Temporário".
```

### Prompt 1 — Modelo de planos e entitlements (Fase 1)

```text
Contexto: SISTUR usa `licenses` (plan: trial|estudante|professor|basic|pro|enterprise, features jsonb, trial de 7 dias) e `org_module_overrides`. Queremos separar papel (o que a pessoa opera) de plano (o que a organização contratou), sem quebrar a UI atual.

Implemente:

1) Migração:
   - `ALTER TABLE orgs ADD COLUMN org_kind text NOT NULL DEFAULT 'ENTERPRISE' CHECK (org_kind IN ('PLATFORM','PUBLIC','ENTERPRISE','INDEPENDENT','PENDING','DEMO'))`. Preencher: is_platform → PLATFORM; is_demo → DEMO; nome 'Temporário' → PENDING; nome 'Autônomo' → INDEPENDENT (e renomear para 'Independentes'); org_type PUBLIC → PUBLIC; demais → ENTERPRISE.
   - Tabela `plans` (id uuid, code text, version int, name text, audience text CHECK IN ('PUBLIC','ENTERPRISE','STUDENT','PROFESSOR','INDEPENDENT'), billing_model text CHECK IN ('per_seat','per_user_month','flat','one_time','contact'), price_month_cents int, price_year_cents int, min_seats int default 1, entitlements jsonb, stripe_price_month text, stripe_price_year text, active bool, created_at). UNIQUE(code, version). RLS: leitura por authenticated; escrita só has_role(auth.uid(),'ADMIN').
   - Seed dos planos: territorial (contact, min_seats 10, entitlements {territorial_diagnostics:true, projects:true, edu_all_trainings:true, reports:true, consortia:true, observatory:true, beni_monthly_quota:30, results_enabled:true}); empresarial (per_seat, 14900/mês, 11900/mês no anual, min_seats 5, {enterprise_diagnostics, projects, edu_all_trainings, reports, integrations, beni_monthly_quota:60, results_enabled:true}); estudante (per_user_month, 4990 / 44900 anual, {edu_all_trainings, assessment_credits:1, beni_monthly_quota:30}); professor (per_user_month, 4990, {edu_all_trainings, edu_classrooms, beni_monthly_quota:30}); independente (per_user_month, 24900, {territorial_diagnostics, enterprise_diagnostics, projects, edu_all_trainings, beni_monthly_quota:60, results_enabled:true, max_active_targets:3}); treinamento_avulso_basico/intermediario/avancado (one_time, 7900/12900/19900).
   - Tabela `subscriptions` (id, org_id uuid null, user_id uuid null, plan_code, plan_version, status CHECK IN ('trialing','active','past_due','canceled','suspended'), seats int default 1, source CHECK IN ('stripe','manual','referral_waiver','demo'), stripe_customer_id, stripe_subscription_id, current_period_start, current_period_end, contract_ref, activated_by uuid, notes, created_at, updated_at). CHECK (org_id IS NOT NULL OR user_id IS NOT NULL). RLS: usuário lê a própria; membros leem a da org (user_belongs_to_org); ORG_ADMIN lê/atualiza seats da própria org; escrita geral só ADMIN e service role.
   - Tabela `entitlement_overrides` (id, org_id null, user_id null, key text, value jsonb, reason text, expires_at, created_by, created_at). RLS: leitura pelo alvo e pela org; escrita só ADMIN.
   - Função `get_my_entitlements()` RETURNS jsonb (SECURITY DEFINER, STABLE): pega a org efetiva (`get_effective_org_id()`), a assinatura ativa da org (ou do usuário se a org for INDEPENDENT), faz merge: plano → overrides da org → overrides do usuário (não expirados) → estado de trial; ADMIN recebe todos os booleanos true e beni_monthly_quota 999; org DEMO devolve o plano 'empresarial' com results_enabled true. Inclui `seats`, `plan_code`, `subscription_status` e `org_kind`.
   - Compatibilidade: view `licenses_compat` ou trigger que mantém `licenses` coerente com `subscriptions` (plan mapeado, status, expires_at = current_period_end, features = entitlements booleanos) para o `LicenseContext` continuar funcionando.
   - Migrar dados: para cada licença ativa existente criar uma `subscriptions` equivalente com source='manual'.

2) Frontend:
   - Hook `useEntitlements()` (React Query, chave ['entitlements', userId, effectiveOrgId]) expondo `has(key)`, `quota(key)`, `planCode`, `orgKind`, `isTrial`, `refetch`.
   - Componente `EntitlementGate requires="projects" fallback={<Paywall feature="projects" />}` e página/modal `Paywall` que mostra o plano que libera a funcionalidade e o CTA correto (Fale conosco para PUBLIC; Assinar para os demais).
   - `LicenseRoute requiredFeature` passa a consultar `useEntitlements()` mantendo a assinatura da prop.
   - `OrgModulesContext.isModuleEnabled` passa a considerar também os entitlements (módulo desabilitado se o plano não inclui).

3) Gere testes Vitest para o merge de entitlements (função pura em `src/lib/entitlements.ts` que replica a regra do SQL) e para `EntitlementGate`.

Não implemente pagamento nesta etapa. Regenere types, rode lint/test/build e o security scan.
```

### Prompt 2 — Stripe, checkout e assinatura manual (Fase 2)

```text
Contexto: SISTUR já tem `plans`, `subscriptions` e `get_my_entitlements()`. Público brasileiro: cartão, Pix e boleto. Setor público (org_kind PUBLIC) não paga online: assinatura ativada manualmente por ADMIN.

Implemente usando a integração Stripe do Lovable:

1) Stripe: criar produtos e preços correspondentes a `plans` (empresarial mensal/anual por assento com quantidade = seats e mínimo 5; estudante mensal/anual; professor mensal; independente mensal; treinamentos avulsos e pacotes Beni como pagamento único). Guardar os ids em `plans.stripe_price_month/year` e em `plans.entitlements.stripe_one_time_price` para one_time. Habilitar Pix e boleto como métodos no Checkout (moeda BRL).

2) Edge functions (usar `_shared/auth.ts`):
   - `create-checkout` (requireUser): body { plan_code, interval 'month'|'year', seats?, training_id?, beni_pack? }. Cria/reutiliza `stripe_customer_id` (metadata user_id/org_id), monta a sessão (mode subscription ou payment), success_url /assinatura?status=ok, cancel_url /assinatura. Para plano empresarial exige ORG_ADMIN ou ADMIN e seats >= 5. Para PUBLIC responde 400 "contact_sales".
   - `customer-portal` (requireUser): retorna URL do portal.
   - `stripe-webhook` (verify_jwt = false, valida assinatura com STRIPE_WEBHOOK_SECRET): trata checkout.session.completed, customer.subscription.created/updated/deleted, invoice.paid, invoice.payment_failed, payment_intent.succeeded (one_time). Upsert em `subscriptions` (status, seats, períodos), `training_purchases` e `beni_credits`. Idempotente por event id (tabela `stripe_events`).
   - `check-subscription` (requireUser): sincroniza a assinatura atual do Stripe para `subscriptions` (fallback quando webhook atrasar).

3) Assinatura manual (Territorial e casos especiais): RPC `admin_set_manual_subscription(_org_id, _plan_code, _seats, _period_end, _contract_ref, _notes)` só ADMIN, grava `subscriptions` com source='manual' e `audit_events`. Tabela `sales_leads` (org_name, contact_name, email, phone, uf, population_band, message, status) com edge function `submit-sales-lead` (requireUser) que grava e envia e-mail ao comercial via Resend.

4) Página `/assinatura` nova (substitui a atual): mostra plano atual, uso de seats, próximos ciclos; cards dos planos vindos de `plans` (ativos) com preços formatados em BRL, toggle mensal/anual, botão Assinar (checkout) ou "Fale conosco" (PUBLIC → formulário de lead). Empresarial: seletor de seats (mín. 5) e preço calculado. Estudante: opção "assinar" ou "comprar este treinamento" (a compra avulsa também aparece na página do treinamento). Botão "Gerenciar assinatura" abre o portal.

5) Remover a ativação de trial por tempo (`activate_my_trial`) da UI; manter a função no banco até a Fase 4.

Secrets necessários: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET. Adicione testes para o mapeamento evento→assinatura (função pura). Regenere types, rode lint/test/build e security scan.
```

### Prompt 3 — Tokens do Professor Beni (Fase 3)

```text
Contexto: a edge function `beni-chat` responde perguntas via Lovable AI sem limite. Queremos cotas: 30 perguntas/mês por usuário (60 para org_kind ENTERPRISE com plano empresarial), 10 no trial, pacotes comprados (50 = R$ 14,90; 150 = R$ 34,90; 500 para org = R$ 99), cota mensal não acumula, créditos comprados valem 12 meses. ADMIN pode ajustar tudo.

Implemente:

1) Migração:
   - `beni_quotas` (user_id, period text 'YYYY-MM', monthly_allowance int, used int default 0, PK (user_id, period)).
   - `beni_credits` (id, user_id null, org_id null, balance int, initial int, source text CHECK IN ('purchase','admin_grant','promo'), stripe_payment_intent text, expires_at, created_at). CHECK (user_id IS NOT NULL OR org_id IS NOT NULL).
   - `beni_usage_log` (id, user_id, org_id, period, source CHECK IN ('monthly','user_credit','org_credit'), model text, prompt_chars int, completion_chars int, cost_estimate_cents int, created_at).
   - RPC `consume_beni_token()` SECURITY DEFINER: resolve org efetiva e `beni_monthly_quota` de `get_my_entitlements()`; garante a linha do período; com `SELECT ... FOR UPDATE` consome nesta ordem: cota mensal → créditos do usuário (mais antigos primeiro, não expirados) → créditos da org; retorna jsonb {allowed bool, source, remaining_monthly, remaining_user_credits, remaining_org_credits}; se nada disponível retorna allowed=false. RPC `refund_beni_token(_source)` para devolver quando o modelo falhar. RPC `get_beni_balance()` para a UI. RPCs de ADMIN: `admin_grant_beni_credits(_user_id|_org_id, _amount, _reason)`, `admin_set_beni_quota_override(...)` (usa `entitlement_overrides` chave beni_monthly_quota).
   - RLS: usuário lê as próprias linhas; ORG_ADMIN lê as da org; escrita só via RPC/service role.
   - pg_cron mensal (dia 1, 03:00 UTC) que cria as linhas do novo período para usuários ativos e expira créditos vencidos.

2) `beni-chat`: antes de chamar o gateway, `consume_beni_token()`; se allowed=false responder 402 {error:'beni_quota_exceeded', balance}; após resposta, gravar `beni_usage_log` com tamanhos e estimativa de custo; em erro do modelo, `refund_beni_token`.

3) Webhook Stripe: ao pagar um pacote Beni (price ids em `plans` com code beni_50, beni_150, beni_org_500), inserir em `beni_credits` com expires_at = now() + 12 meses.

4) UI: no chat do Beni, indicador "Beni: X/Y neste mês (+Z créditos)"; ao receber 402, mostrar modal com pacotes e botão de compra (checkout one_time); página /edu/perfil e /configuracoes mostram saldo; painel do ORG_ADMIN lista consumo por usuário do mês e compra de pacote da org.

5) Admin (Configurações → aba Comercial → Beni): cota por plano (edita `plans.entitlements.beni_monthly_quota`), overrides por org/usuário, concessão manual de créditos, tabela de uso e custo por mês/org/usuário, top 20 usuários.

Testes: função pura de ordem de consumo em `src/lib/beniQuota.ts` + Vitest. Regenere types, rode lint/test/build e security scan.
```

### Prompt 4 — Trial por consumo e rodada única do estudante (Fase 4)

```text
Contexto: hoje o trial é de 7 dias. Queremos trial por consumo: Estudante/Professor consomem 1 treinamento (o `edu_trainings.is_foundation = true`); Empresarial/Territorial: cada usuário 1 treinamento e a organização pode criar e executar 1 diagnóstico, mas não ver o resultado. Estudantes assinantes têm direito a 1 rodada didática (territorial OU empresarial) uma única vez.

Implemente:

1) Migração:
   - `trial_state` (subject_kind CHECK IN ('user','org'), subject_id uuid, training_consumed_at, assessment_run_at, converted_at, PK (subject_kind, subject_id)). Criada automaticamente para novos usuários (trigger em profiles) e novas orgs.
   - `assessment_credits` (user_id PK, credits_total int default 0, credits_used int default 0, last_used_kind text CHECK IN ('TERRITORIAL','ENTERPRISE'), last_used_at). Ao ativar assinatura estudante (webhook), garantir credits_total = 1.
   - `get_my_entitlements()` passa a incluir `trial: {active, training_consumed, assessment_used}` e `assessment_credits_remaining`. Regra: trial ativo quando não há assinatura ativa e (training_consumed_at IS NULL OU, para org PUBLIC/ENTERPRISE, assessment_run_at IS NULL).
   - RPC `consume_trial_training(_training_id)`: chamada ao concluir o primeiro módulo de um treinamento em trial; só aceita o treinamento is_foundation; marca training_consumed_at. RPC `consume_assessment_credit(_assessment_id, _kind)`: para estudante assinante, decrementa crédito e grava kind; erro `no_assessment_credits` se esgotado.
   - RLS em `assessments` (criação): permitida se `results_enabled` OU trial da org ainda sem assessment_run_at OU estudante com crédito. `calculate_assessment` (RPC/edge): se trial, marca assessment_run_at e grava `assessments.result_locked = true`; se estudante, consome crédito. Adicionar coluna `assessments.result_locked boolean default false` e `assessments.kind text CHECK IN ('TERRITORIAL','ENTERPRISE')`.
   - Remover `activate_my_trial` e `expire_trial_licenses` (e o cron) — trial não é mais por tempo. Usuários com trial por tempo ativo hoje: migrar para trial_state sem consumo.

2) Frontend:
   - Catálogo EDU: em trial, só o treinamento is_foundation abre; os demais mostram cadeado + Paywall (assinar ou comprar avulso). Treinamentos comprados (`training_purchases`) abrem normalmente.
   - Diagnósticos: botão "Nova rodada" chama a regra acima; na tela de resultado, se `result_locked`, mostrar teaser (pilares com blur, IGMA oculto) e Paywall "Resultados disponíveis no plano Empresarial/Territorial" (PUBLIC → Fale conosco).
   - Projetos: em trial, criação bloqueada com Paywall.
   - Estudante: card "Rodada didática" com escolha Territorial ou Empresarial, contador 1/1, e aviso de que é única; ao esgotar, oferta de rodada avulsa (plano `rodada_avulsa`, one_time, R$ 99) ou upgrade.
   - Página /assinatura: substituir a barra de dias do trial por "Seu trial: treinamento (0/1) · diagnóstico (0/1)".
   - Toda tela de paywall registra `usage_events` (event 'paywall_shown', feature, plan_code).

Testes: função pura `src/lib/trial.ts` (estado do trial a partir de trial_state + assinatura) com Vitest. Regenere types, rode lint/test/build e security scan.
```

### Prompt 5 — Área administrativa comercial (Fase 5)

```text
Contexto: SISTUR já possui `plans`, `subscriptions`, `entitlement_overrides`, tokens do Beni, `trial_state`, `assessment_credits`, `sales_leads`, `audit_events`. Só ADMIN (platform) acessa a área global; ORG_ADMIN vê a própria org.

Implemente a rota `/admin/comercial` (AdminRoute platformOnly, item de menu "Comercial" com requiresAdmin) com abas:

1) Planos: tabela de `plans` ativos e histórico de versões; editar cria nova versão (não altera assinantes); campos: nome, público, modelo de cobrança, preços mensal/anual (BRL), mínimo de seats, entitlements (editor JSON com validação de chaves conhecidas), ids Stripe; botão "Sincronizar com Stripe" (edge function `sync-stripe-prices`, ADMIN).
2) Assinaturas: lista com filtros (org_kind, plano, status, fonte), busca por org/usuário; detalhe com seats, períodos, Stripe links, contrato/empenho; ações: criar/editar assinatura manual (RPC `admin_set_manual_subscription`), suspender, reativar, estender período, alterar seats, cancelar; tudo em `audit_events`.
3) Overrides: CRUD de `entitlement_overrides` por org/usuário com motivo e expiração.
4) Beni: cotas por plano, overrides, concessão de créditos, uso e custo (mês/org/usuário), gráfico mensal (Recharts).
5) Trial e conversão: usuários/orgs em trial, o que consumiram, data; conversões por mês; reset de trial (RPC `admin_reset_trial`).
6) Professores: lista com alunos vinculados (`get_professor_referral_count`), isenção do mês, histórico; RPC `admin_recalculate_professor_waivers()` e cron mensal (dia 1, 04:00 UTC) que, para cada professor com ≥ 5 alunos com assinatura estudante ativa, aplica isenção (cupom 100% no Stripe via edge function `apply-professor-waiver` ou subscription.source='referral_waiver' para manuais) e envia e-mail; quem cair abaixo de 5 volta a pagar no próximo ciclo com e-mail de aviso.
7) Leads: `sales_leads` com status (novo, contato, proposta, ganho, perdido) e conversão em assinatura manual com um clique.
8) Métricas: MRR por plano, assinantes ativos, churn simples, receita de pacotes, custo estimado de IA.

Painel do ORG_ADMIN (Configurações → aba Assinatura): plano atual, seats usados/contratados, botão "Adicionar usuários" (portal/checkout com nova quantidade), consumo do Beni por usuário, compra de pacote da org, convite por código.

RLS/RPCs: todas as leituras agregadas por RPCs SECURITY DEFINER que verificam has_role(auth.uid(),'ADMIN') ou, para o painel da org, is_org_admin_of. Regenere types, rode lint/test/build e security scan.
```

### Prompt 6 — Onboarding por público e página pública de preços (Fase 5/6)

```text
Contexto: o onboarding pergunta "ERP ou EDU" e o papel. Queremos onboarding por público, coerente com os planos.

Implemente:

1) Onboarding em passos: (a) "Quem é você?" → Gestor público | Empresa | Estudante | Professor | Consultor independente; (b) conforme a escolha: nome da prefeitura/órgão + UF + faixa populacional (gera lead e conta pendente), ou nome da empresa + CNPJ (valida via `validate-cnpj` existente) + número de usuários, ou código de professor (estudante), ou nada (professor/independente); (c) termos. Mapeamento: Gestor público → org PUBLIC pendente de aprovação + lead; Empresa → org ENTERPRISE criada na hora com o usuário como ORG_ADMIN e trial por consumo; Estudante/Professor/Independente → org INDEPENDENT com papel correspondente e trial por consumo. Manter a aprovação manual só para PUBLIC e para quem pediu papel diferente do padrão. Usar `complete_user_onboarding` para os papéis permitidos e uma nova RPC `create_enterprise_org_for_onboarding(_name, _cnpj, _seats)` (SECURITY DEFINER, cria org ENTERPRISE, move o usuário, concede ORG_ADMIN — permitido pelo trigger porque roda como service role? Não: roda como usuário; portanto a RPC deve inserir o papel com a org criada e o trigger `enforce_privileged_role_grants` precisa aceitar `ORG_ADMIN` quando a org foi criada nesta mesma transação pelo próprio usuário — adicione essa exceção no trigger usando uma variável de sessão `set_config('sistur.onboarding_org', org_id, true)`).

2) Página pública `/planos` (sem login) com os cards dos planos, FAQ, comparativo de funcionalidades, CTA para cadastro; SEO básico. O plano Territorial mostra "Fale conosco".

3) Limpeza: remover `ROLE_TO_PLAN` e `DEFAULT_FEATURES` de `manage-users` (plano vem de subscriptions); remover referências por nome a 'Temporário'/'Autônomo' substituindo por `org_kind`; atualizar `src/lib/organizationVisibility.ts`; remover trial por tempo do `LicenseContext`; atualizar CLAUDE.md e docs.

Regenere types, rode lint/test/build e security scan.
```

---

## Apêndice A — Referências no repositório

- `supabase/migrations/20260904000000_rbac_hardening.sql` — migração da Fase 0 (idempotente).
- `supabase/tests/rbac/` — testes SQL comportamentais da migração (36 asserções: anônimo, pendente, membro, ADMIN, service role, bloqueado, idempotência). Rodar com `supabase/tests/rbac/run.sh` contra um PostgreSQL de rascunho.
- `src/lib/rbac.ts` + `src/lib/rbac.test.ts` — constantes e regras de papéis para a UI.
- `supabase/functions/manage-users/index.ts` — função a endurecer (Prompt 0).
- `supabase/functions/_shared/auth.ts` — helpers de autenticação a reutilizar.
- `supabase/functions/beni-chat/index.ts` — ponto de inserção das cotas (Prompt 3).
- `src/contexts/LicenseContext.tsx`, `src/components/layout/LicenseRoute.tsx` — fachada a manter até a Fase 6.

## Apêndice B — Glossário

| Termo | Significado |
|---|---|
| ADMIN | Administrador de plataforma (global). |
| ORG_ADMIN | Administrador de uma organização (tenant). |
| Entitlement | Capacidade contratada (plano + overrides), independente do papel. |
| Seat | Usuário contratado numa assinatura por assento. |
| Trial por consumo | Período de teste limitado por uso (1 treinamento, 1 diagnóstico), não por dias. |
| Rodada didática | Diagnóstico único incluído no plano Estudante. |
| Independentes | Organização virtual dos usuários sem empresa (antiga "Autônomo"). |
