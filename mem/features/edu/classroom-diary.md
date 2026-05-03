---
name: EDU Classroom Diary
description: Diário de Classe consolidado por sala — presença, atividades, notas e alertas
type: feature
---
**Painel:** `ClassroomDiaryPanel` (em `src/components/edu/`), exibido no detalhe da sala em `/professor/dashboard`.

**Fonte:** RPC `get_classroom_diary(p_classroom_id)` (SECURITY DEFINER, search_path=public). Permissão: professor dono da sala, ADMIN ou ORG_ADMIN. Agrega:
- `edu_learning_sessions` → total_sessions, attendance_days (DISTINCT date), total_active_minutes, last_seen_at
- `classroom_assignments` + `assignment_progress` (status='completed') → assignments_total / completed
- `exam_attempts` → MAX(score_pct), COUNT
- `edu_fraud_flags` (status='pending') → fraud_flags

**KPIs:** total alunos, ativos em 7 dias, conclusão média, nota média (best_score), alertas pendentes.
**Export:** CSV UTF-8 com BOM, separador `;` (Excel-BR).
