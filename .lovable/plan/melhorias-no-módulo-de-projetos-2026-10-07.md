# Melhorias no módulo de Projetos

Hoje o usuário escolhe entre Cascata, SAFe, Scrum e Kanban na criação do projeto sem nenhuma orientação, e o padrão é sempre Cascata. O plano junta a nova ajuda para escolher a metodologia com as 4 frentes sugeridas antes.

## Etapa 1 — Assistente "Qual metodologia usar?" (prioridade)
Na tela de criação do projeto, um botão "Me ajude a escolher" abre 6 perguntas curtas:
1. O escopo está bem definido ou pode mudar no caminho?
2. Há prazo ou convênio com etapas fixas (ex.: recursos do MTur ou de emendas parlamentares, licitação)?
3. Tamanho da equipe e quantos órgãos ou parceiros participam?
4. É obra ou estrutura física, ou é serviço, campanha ou capacitação?
5. Com que frequência a equipe consegue se reunir?
6. O trabalho chega em fluxo contínuo (demandas, manutenção) ou em entregas?

O sistema também usa o que já sabe: o pilar dos indicadores ligados ao projeto (ex.: OE costuma pedir obras e etapas fixas), o tipo de diagnóstico (territorial ou empresarial) e o orçamento.

Resultado: a metodologia recomendada, com uma frase explicando por quê ("Recomendamos Cascata porque o projeto depende de convênio com etapas fixas e obra física"), mais a segunda opção e quando ela faria sentido. O usuário sempre pode escolher outra. A sugestão é feita por regras fixas e explicáveis, não por IA, para dar sempre a mesma resposta para as mesmas respostas.

Cada metodologia ganha um cartão "quando usar / quando evitar" com exemplos do turismo (sinalização turística → Cascata; campanha de divulgação → Scrum; atendimento no centro de informações → Kanban; programa regional com vários municípios → SAFe).

## Etapa 2 — Relatório executivo para Prefeito/COMTUR
Botão "Relatório executivo" no projeto: 1–2 páginas em PDF com situação, % concluído, marcos, orçamento previsto x realizado, riscos e indicadores antes x agora, em linguagem simples.

## Etapa 3 — Comprovação de eficácia (antes x depois)
Quando o destino tiver nova rodada de diagnóstico, o projeto compara automaticamente os indicadores com o novo resultado (hoje compara só com o diagnóstico de origem), mostrando se melhorou, piorou ou atingiu a meta.

## Etapa 4 — Fontes de financiamento
No Orçamento, cada linha pode indicar a fonte (recurso próprio, convênio MTur, emenda, parceria privada, consórcio), com resumo por fonte e prazos de prestação de contas como marcos.

## Etapa 5 — Usabilidade do dia a dia
Checklists dentro das tarefas, destaque em vermelho para tarefas vencidas e checkpoints pendentes, filtro "minhas tarefas" no Kanban.

## Fechamento
Nova versão no changelog, atualização do tutorial de Projetos e da base do Guia (bot de suporte) com o artigo "Como escolher a metodologia".

## Detalhes técnicos
- Regras do assistente em `src/lib/methodologyAdvisor.ts` (função pura com pontuação por metodologia e motivos), com testes em `src/lib/__tests__/methodologyAdvisor.test.ts` cobrindo um caso típico de cada metodologia.
- Guardar respostas e recomendação no projeto (colunas `methodology_answers` jsonb e `methodology_recommended` em `projects`) para auditoria.
- Etapa 3 reutiliza `useProjectIndicatorImpact`, buscando a rodada calculada mais recente do mesmo destino.
- Etapa 4 usa o campo de fonte já existente em `project_budget_lines`, padronizando as opções.
- Não altera resultados de diagnóstico, então não entra em CALC_RULE_CHANGES.
- Pode ser feito por etapas; sugiro aprovar e começar pela Etapa 1.
