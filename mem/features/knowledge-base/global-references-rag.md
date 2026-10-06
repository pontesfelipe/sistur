---
name: Global references RAG
description: Busca por trechos nas Referências Globais — fatiamento, busca híbrida, uso no Beni e relatórios
type: feature
---
- Documentos de Referências Globais são fatiados (~1.000 caracteres, sobreposição 150, com página) e vetorizados ao enviar; botão Reindexar no painel.
- Professor Beni recebe os 3 trechos mais relevantes por pergunta (similaridade mínima 0,3) e cita documento e página em fala, sem markdown.
- Relatórios buscam trechos por pilar a partir dos indicadores em Atenção/Crítico.
- Resumo continua como visão geral; trechos dão precisão. Falha na busca nunca bloqueia resposta.
- PDFs grandes são lidos página a página (PNT 7 MB funciona).
