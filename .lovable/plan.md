## Problema 1 — "Carregando para sempre" ao recalcular diagnóstico

**Causa raiz**: `calculate-assessment` é síncrona e em diagnósticos COMPLETE (100+ indicadores) ultrapassa o limite de tempo de Edge Function. O frontend espera a resposta que nunca chega.

### Solução: padrão assíncrono com job + polling

1. **Banco** — nova tabela `assessment_calc_jobs`:
   - `id`, `assessment_id`, `status` (`pending|running|completed|failed`), `error_message`, `result jsonb`, `started_at`, `finished_at`, `requested_by`.
   - RLS: usuário só vê jobs da própria org; ADMIN vê todos.
   - Index `(assessment_id, created_at desc)`.

2. **Edge function `calculate-assessment`** — refatorar para 2 modos:
   - Modo padrão (atual chamada do frontend): cria o job em `pending`, dispara o processamento via `EdgeRuntime.waitUntil(...)`, responde imediatamente `202 { job_id }`.
   - Worker interno (mesma função, mesmo arquivo): atualiza job para `running`, roda toda a lógica existente, grava resultado e marca `completed`/`failed` (sempre captura `try/catch` para nunca deixar job preso).

3. **Hook `useCalculateAssessment.ts`** — mudar para:
   - Chamar a função → receber `job_id`.
   - Polling a cada 2s na tabela `assessment_calc_jobs` (Realtime ou simples select).
   - Mostrar progresso "Calculando…" com tempo decorrido; após 5 min sem resposta, abortar e oferecer "Tentar novamente".
   - Sucesso → toast com `issues_created`/`recommendations_created` (igual hoje); erro → toast com `error_message` real.

4. **Limpeza** — job script (cron diário) marca como `failed` jobs `running` há mais de 10 min.

## Problema 2 — "Sem Plano de Turismo" no relatório de Barretos (dado preenchido como SIM)

**Causa raiz**: o valor de `OE007` está correto no banco (`value_raw = 1`). O bug está no **prompt do LLM em `generate-report`** que ou (a) não inclui `OE007` na tabela canônica injetada, ou (b) o LLM alucinou.

### Ação:
- Verificar `generate-report/index.ts` → garantir que a tabela canônica inclua indicadores BINARY com tradução explícita (`1 → "Sim, possui"`, `0 → "Não possui"`).
- Adicionar instrução obrigatória no system prompt: "Para indicadores BINARY (Plano de Turismo, COMTUR ativo, Fundo Municipal, etc.) NUNCA infira ausência sem consultar o valor numérico literal — `1=sim`, `0=não`."
- Regerar relatório de Barretos para confirmar.

## Versionamento
- Bump para **v1.61.1** com changelog dos dois fixes.

## Observação
Não vou tocar em nada além do necessário: o motor de cálculo em si continua igual — só muda o envelope (sync → async). Risco baixo.
