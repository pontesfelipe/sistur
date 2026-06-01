---
name: Observatório Turístico Permanente
description: Módulo separado do diagnóstico para monitoramento contínuo de fluxo, ocupação, eventos, receita e empregos no destino. Produto recorrente anual.
type: feature
---

# Observatório Turístico Permanente

Módulo independente do ERP diagnóstico, focado em acompanhamento contínuo (recorrente anual).

## Tabelas
- `observatory_metrics` — catálogo público de métricas (5 categorias × 15 métricas seed)
- `observatory_measurements` — medições por org/métrica/ano/mês (UNIQUE composta)
- `observatory_events` — calendário de eventos turísticos com impacto estimado e realizado

## Categorias de métricas
`fluxo`, `ocupacao`, `eventos`, `receita`, `empregos`.

## Acesso
- Membros da org (via `profiles.org_id` → helper `user_in_org`)
- ADMIN global bypass
- `get_effective_org_id()` para Modo Demo
- Catálogo de métricas: leitura pública

## RPC
- `get_observatory_summary(_org_id, _year)` — agrega total/avg/data_points por métrica

## UI
- Rota: `/observatorio` (ERPRoute)
- Sidebar: ERP → Observatório (icon Activity)
- Hook: `src/hooks/useObservatorio.ts`
- Página: `src/pages/Observatorio.tsx` (tabs Indicadores + Eventos)

## Distinção do Diagnóstico
- Diagnóstico = avaliação cíclica de capacidade (RA/OE/AO via IGMA)
- Observatório = monitoramento permanente de outputs do destino (fluxo, receita, etc.)
- Não alimenta scores do I-SISTUR — é dataset paralelo para relatórios e tomada de decisão.

## Versão
- Introduzido em v1.58.0