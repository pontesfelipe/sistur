# Prestação de contas ao COMTUR e controle do FUMTUR

O relatório executivo atual continua como "Status Report Técnico" para a equipe. Entram duas novidades: um relatório oficial para o COMTUR e o controle do Fundo Municipal de Turismo (FUMTUR).

## Fase 1 — Relatório de Prestação de Contas ao COMTUR
Novo botão "Prestação de contas ao COMTUR" no projeto, ao lado do relatório executivo. Antes de gerar, uma janela pede: número da reunião, data, período coberto, responsável técnico e cargo, e se o documento é para "apreciação" ou "aprovação".

Estrutura do documento (Word, formato ABNT, com cabeçalho da prefeitura/secretaria):
1. Identificação: município, órgão, projeto, período, reunião do conselho.
2. Objetivo e justificativa: por que o projeto existe, ligado aos indicadores do diagnóstico (pilar RA, OE ou AO).
3. Execução física: % concluído, marcos cumpridos e pendentes, atrasos com justificativa.
4. Execução financeira: previsto x realizado por fonte de financiamento (FUMTUR, convênio MTur, emenda etc.), com destaque para o que saiu do FUMTUR.
5. Resultados: indicadores antes x agora, usando a rodada mais recente do destino.
6. Pendências e próximos passos.
7. Parecer do conselho: espaço para votos (favoráveis, contrários, abstenções), deliberação (aprovado, aprovado com ressalvas, reprovado) e observações.
8. Assinaturas: responsável técnico, secretário(a) de turismo e presidente do COMTUR.

Os textos são montados por regras fixas a partir dos dados do projeto, sem IA, para que os mesmos dados deem sempre o mesmo documento.

## Fase 2 — Controle do FUMTUR
Nova área "FUMTUR" dentro de Projetos, por destino:
- **Cadastro do fundo:** lei de criação, número, conta bancária (apenas identificação) e saldo inicial do ano.
- **Receitas do fundo:** entradas por origem (repasse da prefeitura, ICMS Turístico, taxas, multas, doações, convênios), com data e valor.
- **Plano de Aplicação Anual:** quanto se pretende gastar por projeto/ação, com status "proposto → aprovado pelo COMTUR" e data da reunião que aprovou.
- **Despesas:** cada linha do orçamento de um projeto com fonte "FUMTUR" passa a contar no fundo, com nº do empenho e etapa (empenhado, liquidado, pago).
- **Painel do fundo:** saldo atual, receitas x despesas do ano, quanto do plano aprovado já foi usado, e alertas quando um gasto não está no plano aprovado ou passa do saldo.
- **Relatório anual do FUMTUR para o COMTUR:** mesmo formato da Fase 1, consolidando o ano.

## O que não entra agora
- Integração automática com Transferegov, TCEs ou sistemas contábeis da prefeitura (os dados são digitados).
- Assinatura digital dos documentos.

## Fechamento
Nova versão e changelog, tutorial de Projetos, artigos do Guia (COMTUR e FUMTUR) e memória do módulo atualizados.

## Detalhes técnicos
- Fase 1: `src/lib/comturReport.ts` (montagem dos textos, função pura) + exportação `.docx` usando a biblioteca `docx` já instalada e `src/lib/abntStyle.ts`; diálogo `ComturReportDialog.tsx`; testes do texto de execução financeira e da regra de pendências.
- Fase 2: tabelas novas `fumtur_funds`, `fumtur_revenues`, `fumtur_application_plan` (com RLS por organização e GRANTs); colunas opcionais em `project_budget_lines`: `commitment_number` e `execution_stage`. Saldo e alertas calculados em `src/lib/fumturLedger.ts`, com testes (saldo, gasto fora do plano, gasto acima do saldo).
- Não altera resultados de diagnóstico, então não entra em CALC_RULE_CHANGES.
- Sugestão: aprovar e executar Fase 1, depois Fase 2.
