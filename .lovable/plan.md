# Mover "Validação cruzada" para fora do relatório

## Objetivo

Hoje o aviso "⚠️ Validação cruzada" é concatenado no final do markdown do relatório (rodapé/apêndice), então aparece dentro do documento, no DOCX e em qualquer exportação. Você quer que o conteúdo do relatório fique **limpo**, e que esse aviso apareça **apenas como uma mensagem de texto na interface**, ao lado do relatório — não dentro dele.

## O que muda

### 1. Edge function `supabase/functions/generate-report/index.ts`

- **Remover** a concatenação do `footerBanner` em `finalContent` (linhas ~1875–1876). O `finalContent` salvo em `generated_reports.report_content` passa a ser apenas o texto narrativo, sem nenhum bloco de validação.
- **Manter intacta** a persistência em `report_validations` (status, `auto_corrections`, `deterministic_issues`, `ai_issues`, `total_issues`). É de lá que a UI vai ler.
- Manter o `audit_events` como está.

Resultado: nada mais aparece dentro do markdown do relatório, nem em DOCX/PDF exportados.

### 2. Página `src/pages/Relatorios.tsx`

Ao carregar/gerar um relatório:

- Buscar o registro mais recente em `report_validations` para o `report_id` (ou `assessment_id` quando ainda não houver report_id).
- Se `status !== 'ok'` **ou** `total_issues > 0` **ou** `auto_corrections.length > 0`, renderizar **fora do container do relatório** (acima do conteúdo do documento, junto às ações de exportar/copiar) um componente leve do tipo `Alert` do shadcn, com:
  - Título: "Validação cruzada de fontes"
  - Texto curto: "O sistema conferiu os valores citados contra a tabela de auditoria antes de gerar este relatório. Foram aplicadas N correções automáticas e M itens precisam de revisão manual."
  - Botão "Ver detalhes" → abre um `Dialog` listando as `auto_corrections` (indicador, valor anterior → valor aplicado) e os `issues` remanescentes.
- Se não houver divergência nenhuma, **não exibir nada** (silencioso).

Esse Alert vive na UI, não entra no markdown nem em nenhum export.

### 3. Exportações (DOCX/PDF/copiar)

- Como o banner some do `finalContent`, `src/lib/exportReportDocx.ts` e a cópia de texto puro automaticamente passam a sair limpos. Sem mudança adicional necessária.

### 4. Versão e changelog

- Bump para **v1.38.27** em `src/config/version.ts` com a nota: "Validação cruzada movida para mensagem na interface; conteúdo do relatório agora sai limpo, sem banner técnico."

## Arquivos afetados

- `supabase/functions/generate-report/index.ts` — remover concatenação do footerBanner (mantendo a persistência da validação).
- `src/pages/Relatorios.tsx` — buscar `report_validations` e exibir Alert+Dialog fora do bloco do relatório.
- `src/config/version.ts` — bump de versão e nota de release.

## Não muda

- Cálculo, regras de autocorreção, persistência em `report_validations`, audit events, modelo de geração, prompt do LLM, formatação de moeda, citações Beni, estrutura flexível de subseções (v1.38.26).

## Confirmações rápidas antes de implementar

1. Concordo em **não mostrar nada** quando não há divergência (silencioso). OK?
2. O detalhamento (lista item-a-item das correções) deve abrir num **Dialog** ao clicar em "Ver detalhes", certo? Alternativa seria sempre expandido inline.
