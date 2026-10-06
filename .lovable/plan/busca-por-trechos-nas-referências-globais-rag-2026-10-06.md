# Busca por trechos nas Referências Globais (RAG)

## Objetivo
Quando alguém pergunta algo específico ao Professor Beni (ex.: "O que a política nacional diz sobre incentivo a pousadas históricas?"), o sistema encontra os 2–3 trechos mais relevantes dos documentos originais e os entrega à IA junto com a pergunta. O resumo continua sendo usado como visão geral; os trechos trazem a precisão.

## Como vai funcionar para o usuário
- Admin envia o documento em Referências Globais, como hoje. Depois de salvo, o sistema o divide em trechos automaticamente (status: "Indexando…" → "Pronto, N trechos").
- Botão "Reindexar" em cada documento (e para os 3 já enviados).
- Professor Beni cita a fonte na resposta em texto simples: "segundo o Plano Nacional de Turismo 2024–2027, página 42…".
- Relatórios técnicos também buscam trechos ligados aos indicadores em Atenção/Crítico de cada pilar.

## Etapas
1. Banco: tabela de trechos (documento, página, posição, texto, vetor), busca por similaridade e por palavras (português), acesso só leitura para usuários logados e escrita só pelo backend.
2. Indexação: função que lê o arquivo página a página (mesma leitura em partes do PDF grande), corta em trechos de ~1.000 caracteres com sobreposição, gera vetores em lotes e grava. Disparada ao salvar/reindexar; status visível no painel.
3. Busca: função que recebe a pergunta, gera o vetor, combina similaridade semântica + palavras-chave e devolve os 3 melhores trechos acima de um limite mínimo de relevância.
4. Professor Beni: antes de responder, busca trechos para a pergunta atual e injeta como "trechos de referência" com documento e página; sem markdown, conforme regra existente.
5. Relatórios: busca trechos por pilar/indicador crítico e anexa à seção de referências (com rastro de fonte).
6. Painel admin: contagem de trechos, data da indexação, erro se houver, e uma caixa "testar busca" para ver quais trechos voltam para uma pergunta.
7. Docs, metodologia, FAQ, versão e memória atualizados.

## Detalhes técnicos
- Extensão pgvector; tabela `global_reference_chunks` (reference_id FK cascade, page, chunk_index, content, embedding vector, tsv tsvector 'portuguese'), índice HNSW + GIN, GRANT select a authenticated / all a service_role, RLS.
- Colunas novas em `global_reference_files`: index_status, chunk_count, indexed_at, index_error.
- RPC `match_reference_chunks(query_embedding, query_text, k)` com pontuação híbrida (RRF).
- Embeddings via Lovable AI Gateway; lotes pequenos para respeitar memória do worker.
- `beni-chat` e `generate-report` chamam a busca; falha na busca não bloqueia a resposta (cai para só resumos).
- Custo: indexação é única por documento; cada pergunta gera 1 embedding curto.
