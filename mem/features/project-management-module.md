---
name: Gerenciamento de Projetos
description: Módulo de projetos com diagnóstico → execução, governança, orçamento, IA e exportações
type: feature
---

Módulo end-to-end de projetos vinculados a diagnósticos. Lifecycle: diagnóstico (Modo Prescrição) → projeto com baseline de indicadores → fases/tarefas/marcos → governança (RACI + checkpoints) → capacitação EDU → orçamento → vínculos externos → IA sugere tarefas → exportações.

## Tabelas
- `projects`, `project_phases`, `project_tasks`, `project_milestones` — base.
- `project_indicator_links` — baseline_score (snapshot na criação) + target_score (padrão 0.67) por indicador.
- `project_task_raci`, `project_checkpoints` (com fluxo pending→submitted→approved/rejected), `project_edu_enrollments`.
- `project_budget_lines` — categoria, fase opcional, planned/actual em BRL, fonte, status.
- `project_external_links` — link_type ∈ {investment_opportunity, consortium, observatory_alert, issue}, external_id, label, notes.

## RLS
Todas usam padrão: ADMIN global OR membro da org do projeto (via `profiles.org_id = projects.org_id`). service_role bypass.

## Abas em ProjectDetailView
Visão Geral, Fases, Tarefas, Kanban (drag-and-drop nativo), Timeline (Gantt simplificado), Marcos, Indicadores (Trilha de Impacto baseline vs atual), Governança, Capacitação, Orçamento, Vínculos.

## Integrações
- **Modo Prescrição → /projetos**: deep-link `?fromAssessment=<id>&indicators=CODE1,CODE2` em CreateProjectDialog (lockedAssessmentId + prefilledIndicatorCodes) grava `project_indicator_links` automaticamente.
- **Portfólio agregado**: `useProjectsPortfolioImpact` cruza links vs `indicator_scores` atuais → improved/regressed/reachedTarget.
- **IA Sugerir Tarefas**: edge function `suggest-project-tasks` (Lovable AI / gemini-2.5-flash) consome indicadores+fases+tarefas existentes, retorna JSON com 4-8 sugestões, importadas via `useCreateTasks`. Trata 429/402.
- **Exportações**: `exportProjectCalendar` (.ics RFC5545 com marcos+tarefas planejadas) e `exportPortfolioCSV` (página /projetos).

## Constraints
- baseline_score só é capturado no momento da criação do projeto (não retroativo) — alinhado com `assessment-calculation-lifecycle` (snapshots).
- Checkpoints exigem evidência (URL ou nota) antes de submeter.
- Sugestões de IA devem evitar duplicar tarefas existentes (verificado por título no prompt).

Introduzido nas versões 1.66.16 (Frente 1) → 1.66.20 (Frente 5).