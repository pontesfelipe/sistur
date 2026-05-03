---
name: EDU Syllabus and Transcript
description: Plano de ensino formal nos cursos e Histórico Escolar (boletim) consolidado do aluno
type: feature
---
**Plano de Ensino (`edu_trainings`)**: campos `ementa`, `competencias[]`, `habilidades[]`, `carga_horaria_teorica`, `carga_horaria_pratica`, `bibliografia_basica[]`, `bibliografia_complementar[]`, `metodologia`, `criterios_avaliacao`, `prerequisitos[]`. Renderizado em `SyllabusPanel` na página do treinamento.

**Histórico Escolar**: rota `/edu/boletim` (`EduHistoricoEscolar`). Usa RPC `get_student_transcript(p_user_id)` (SECURITY DEFINER) — retorna por curso: status, progresso, melhor nota (`MAX(score_pct)` em `exam_attempts`), tentativas e certificado. Permissão: próprio aluno; ADMIN/ORG_ADMIN/PROFESSOR podem consultar terceiros.

**Stats client-side** (`transcriptStats`): total, concluídos, em andamento, certificados emitidos, carga horária somada (minutos/60) e média ponderada por carga horária.