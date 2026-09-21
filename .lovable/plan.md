# Melhorias nos Diagnósticos Territorial e Empresarial

Implementação das 4 melhorias levantadas na varredura dos processos de diagnóstico.

## 1. Resiliência das fontes oficiais (cache municipal)

Quando uma API oficial (IBGE, DATASUS, STN, CADASTUR) falhar ou demorar demais durante o pré-preenchimento, o sistema passa a reaproveitar automaticamente o último dado oficial já validado para o mesmo município.

- O usuário vê o valor preenchido com a marca "reaproveitado de ciclo anterior" e o ano de referência.
- Nada é inventado: se não houver dado anterior, o indicador continua vazio para preenchimento manual.
- Resultado: rodadas deixam de ficar incompletas por instabilidade dos portais do governo.

## 2. Quórum mínimo em índices compostos

Índices que somam vários componentes (por exemplo o I-SEMT, que depende de IPCR, IIET e IPTL) só serão calculados quando houver pelo menos 2 dos 3 componentes disponíveis.

- Com dados insuficientes, o índice aparece como "Aguardando componentes" em vez de exibir uma nota parcial.
- O índice fica fora da média do pilar enquanto não houver quórum, evitando nota distorcida.

## 3. Proteção do dado digitado pelo usuário (Empresarial)

O pré-preenchimento automático ("Reviews + Perfil do Empreendimento") deixa de sobrescrever valores que a pessoa já digitou manualmente.

- O valor manual é preservado por padrão.
- Quando o valor encontrado online for diferente, aparece um aviso de divergência com as duas opções (manter o manual ou adotar o online).

## 4. Ficha de Conformidade Metodológica nos relatórios

Nova seção padronizada nos relatórios exportados (PDF/DOCX), listando por indicador: fonte, ano-base, método de coleta (automático/manual/estimado) e o percentual de dados auditados.

- Serve para prestação de contas a conselhos de turismo, bancos e auditorias ESG.

## Detalhes técnicos

- **Cache municipal:** fallback em `supabase/functions/_shared` + hooks de busca oficial (`useOfficialData.ts`, funções `search-*`): em erro/timeout, consultar `external_indicator_values` / `indicator_values` mais recente pelo `ibge_code` e devolver com `source_detail` marcando reaproveitamento; refletir o selo em `DataValidationPanel`.
- **Quórum composto:** aplicar a regra em `igma_composite_rules` / `compute_derived_indicators` e no cálculo em `calculate-assessment`; índice sem quórum grava `normalized_score = null` e é ignorado na média ponderada; estado exibido em `IndicadoresPanel.tsx`.
- **Proteção de dado manual:** em `src/lib/autoFillRunner.ts` e no upsert de `NovaRodadaDialogs.tsx`, checar `indicator_values.source` existente; só sobrescrever quando a origem for automática; divergências expostas em `EnterpriseDataEntryPanel`.
- **Ficha de conformidade:** nova seção em `supabase/functions/generate-report` alimentada por `assessment_indicator_audit` (+ `get_assessment_audit`), renderizada em `src/lib/exportReportDocx.ts` e no CSS de impressão.
- **Versão:** bump MINOR em `src/config/version.ts` (2.8.0) com entrada no changelog.
