
# Semantic Layer para Geração de Relatórios

## Objetivo

Hoje todo o "conhecimento semântico" usado no `generate-report` (fundamentos de Beni, régua de classificação, regras de fontes, bibliografia canônica, política zero-alucinação, glossário IGMA, regras MST, atribuição de fontes, formatação ABNT) está **hardcoded** em ~900 linhas de strings dentro de `supabase/functions/generate-report/index.ts`.

A Semantic Layer transforma isso em **dados versionados em banco**, editáveis por ADMIN, e injetados dinamicamente no prompt. Assim a Christiana / equipe pode ajustar tom, adicionar novas regras, expandir bibliografia ou criar definições de novos indicadores sem depender de novo deploy.

## Conceito

Cada "entrada semântica" é uma peça nomeada de conhecimento com:
- **chave canônica** (ex.: `methodology.base`, `classification.scale`, `sources.attribution_rules`, `bibliography.beni`, `glossary.IGMA`, `pillar.RA.definition`, `indicator.IPTL.semantic`)
- **categoria** (methodology, classification, sources, bibliography, glossary, pillar, indicator, formatting, anti_hallucination, mst_extension)
- **conteúdo** (markdown/texto)
- **escopo** (`global` ou por `org_id`, para permitir override por organização no futuro)
- **ativo / versão / atualizado por / quando**
- **ordem de injeção** (controla onde entra no prompt)
- **aplica-se a** (territorial, enterprise, ambos)

O prompt final passa a ser **montado dinamicamente** concatenando todas as entradas ativas na ordem definida, em vez de ler constantes fixas.

## O que entra na Semantic Layer (seed inicial — vindo do código atual)

Seed pré-carregado com tudo que já existe hoje, para não regredir nada:
1. `methodology.base_sistur` — fundamentos de Mario Beni (sistema aberto, território, governança)
2. `methodology.pillars.RA` / `.OE` / `.AO` — definição de cada eixo
3. `classification.scale_5_levels` — régua oficial (CRÍTICO/ATENÇÃO/ADEQUADO/FORTE/EXCELENTE) com faixas
4. `formatting.brazilian_numbers` — regras de vírgula decimal, ponto de milhar, R$
5. `formatting.abnt_references` — ABNT NBR 6023, ABNT NBR 10520
6. `sources.transparency_rules` — IBGE/DATASUS/STN/CADASTUR/Mapa do Turismo/KB
7. `sources.attribution_rules` — anti-troca de origem (leitos hospedagem vs SUS, CAPAG, permanência média etc.)
8. `bibliography.beni_canonical` — Beni 1997, 2003, 2006, 2007 + regras de citação
9. `bibliography.support` — Tasso/MST 2024, PNT 2024–2027, CF/88
10. `anti_hallucination.rules` — política zero alucinação (13 regras)
11. `glossary.IGMA` — expansão obrigatória da sigla
12. `glossary.contextual_indicators` — peso 0, ficha técnica
13. `extension.mst` — opt-in da Mandala da Sustentabilidade
14. `indicator.<code>.semantic` — uma entrada por indicador-chave (IPTL, IPCR, IIET, I_SEMT, IDEB, CAPAG, NPS, etc.) com: o que mede, fórmula em linguagem natural, fonte, direção, faixas, como interpretar no relatório, armadilhas comuns

Cada item vira uma linha em `report_semantic_entries`.

## Estrutura de Banco

```text
report_semantic_entries
├─ id, key, category, scope (global|org), org_id (nullable)
├─ title, content (markdown), applies_to (territorial|enterprise|both)
├─ injection_order (int), section_header (texto opcional p/ agrupar no prompt)
├─ active (bool), version (int), created_by, updated_by, created_at, updated_at

report_semantic_entry_history (snapshots a cada edição — auditoria)
├─ id, entry_id, version, content_before, content_after, changed_by, changed_at
```

RLS:
- SELECT: qualquer usuário autenticado da org (entries `global` + da própria org)
- INSERT/UPDATE/DELETE: somente ADMIN; ORG_ADMIN pode editar apenas escopo `org` da sua organização

GRANTs explícitos para `authenticated` e `service_role` (regra de projeto).

## Mudança no Edge Function `generate-report`

1. Substituir as constantes `BASE_METHODOLOGY`, `CANONICAL_REFERENCES`, `MEC_FORMATTING_RULES` etc. por uma função `loadSemanticLayer(supabase, { orgId, mode })` que:
   - Lê entries `active=true` (global + org), filtra por `applies_to`, ordena por `category` e `injection_order`.
   - Monta um bloco markdown por categoria com `section_header`.
   - Retorna string final para concatenar no `systemPrompt`.
2. **Fallback de segurança**: se a layer estiver vazia / falhar a query, usar as constantes atuais embarcadas como default (sem regressão).
3. Cache em memória do edge function por execução (~mesma invocação do job).
4. Para indicadores específicos, injetar somente entries de indicadores que **realmente aparecem** na trilha de auditoria do destino (evita inflar tokens).

## UI Admin — nova página `/admin/semantica`

Rota protegida por `AdminRoute`. Componentes:
- **Listagem** com filtros por categoria, escopo, status, busca textual e badge de "modificado em".
- **Editor** lado a lado: campo `key` (readonly após criação), `title`, `category`, `applies_to`, `scope`, `injection_order`, editor de markdown com preview.
- **Diff de versões** mostrando histórico (`report_semantic_entry_history`).
- **Ações**: ativar/desativar, duplicar para criar variante por org, restaurar versão anterior, exportar JSON da layer.
- **Preview do prompt final**: botão "Visualizar prompt resultante (Territorial / Enterprise)" que chama um endpoint read-only que retorna a string completa que seria injetada, para validação antes de salvar.

Acesso via link no `AdminMenu`/`AppSidebar` (ADMIN-only) ao lado de "Logs de Relatórios".

## Migração / Roll-out

1. Migration cria as duas tabelas + GRANTs + RLS + trigger de versão/auditoria.
2. Migration faz **seed** com todo o conteúdo atual extraído do `generate-report/index.ts` (≈ 14 entries iniciais + uma por indicador IGMA conhecido).
3. Edge function passa a usar a layer; constantes antigas viram fallback.
4. UI Admin liberada para ADMIN.
5. Bump de versão em `src/config/version.ts` (MINOR — nova funcionalidade), com entrada em `VERSION_HISTORY`.

## Fora do escopo desta entrega

- Multitenant override completo (apenas estrutura preparada; UI inicial só edita `global`).
- A/B testing de prompts.
- Versionamento por branch / publicar/draft (entra como "active toggle" + histórico).
- Edição pelo ORG_ADMIN (apenas leitura nesta fase).

## Critérios de aceitação

- ADMIN consegue editar a régua de classificação, salvar, e o próximo relatório gerado reflete a alteração — sem deploy.
- Desativar uma entrada remove a seção do prompt no relatório seguinte.
- Histórico mostra quem alterou o quê e quando, com diff.
- Se a tabela for esvaziada por engano, o relatório ainda é gerado usando o fallback embutido.
- Nenhum relatório existente quebra — comportamento padrão (com seed) é idêntico ao atual.
