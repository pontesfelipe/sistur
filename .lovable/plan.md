# Rede de Hotéis (Brand → Multi-Unidades)

Hoje cada `enterprise_profile` está amarrado 1:1 a um único `destination` (município). Para suportar redes — uma marca com várias unidades em municípios diferentes e análise distinta por destino — vamos introduzir o conceito de **Marca/Rede** (`enterprise_brand`) e tratar cada `enterprise_profile` como uma **unidade** dessa marca.

## Modelo de dados

Nova tabela e ajustes (via migration, com GRANTs + RLS por `org_id`):

```text
enterprise_brands
├── id (uuid pk)
├── org_id (uuid, RLS)
├── name (ex.: "Rede Atlântica")
├── brand_type ('independent' | 'chain' | 'franchise' | 'collection')
├── headquarters_uf, website, notes
└── created_at / updated_at

enterprise_profiles  (alterações)
├── + brand_id (uuid, fk enterprise_brands, nullable p/ retrocompatibilidade)
├── + unit_name (ex.: "Atlântica Barretos Centro")
├── + is_flagship (bool)
└── destination_id continua: 1 unidade = 1 município
```

Backfill: para cada `enterprise_profile` existente, criar uma `enterprise_brand` "solo" usando o nome do empreendimento atual (sem quebrar diagnósticos já calculados). Remover o `UNIQUE(destination_id)` do upsert atual e passar a usar `UNIQUE(brand_id, destination_id)`.

## Fluxo de uso

1. **Configurações → Empreendimentos / Marcas** (nova aba): CRUD de marcas e listagem das unidades por município.
2. **Nova Rodada (Empresarial)**:
   - Step 1 ganha um seletor: *"Marca / Rede"* → escolher existente ou criar nova.
   - Step 2 (destino): filtra/sugere municípios onde a marca já tem unidades; permite adicionar nova unidade num município novo.
   - Step 4 (perfil): mantém o auto-fill por unidade — cada unidade tem seu próprio hotel name, reviews, OTAs, redes sociais, concorrentes locais.
3. **Diagnósticos**: cada unidade gera seu próprio `assessment` (já é por destino). Nada muda no engine.
4. **Nova visão "Rede"** (`/diagnosticos/rede/:brandId`):
   - Tabela comparativa das unidades (status RA/OE/AO, score global, ocupação, ADR, NPS).
   - Heatmap por pilar × unidade destacando pontos fortes/fracos.
   - Bloco de **análise de marca em contexto local**: para cada unidade, IA compara desempenho da marca *vs.* benchmark do município (turismo local, sazonalidade, concorrência), respondendo "onde a marca performa acima/abaixo do seu padrão" e "fatores territoriais que explicam".
   - Recomendações segmentadas: ações de marca (transversais) × ações locais (por unidade).

## Indicadores e cálculo

- Indicadores continuam por unidade (sem média artificial entre municípios).
- Nova view materializada `brand_rollup` com: nº de unidades, score médio ponderado por capacidade (quartos), dispersão (desvio padrão por pilar), unidades em estado Crítico/Atenção.
- Sazonalidade e ADR continuam locais; relatório de marca mostra a curva sobreposta por unidade.

## Mudanças de front-end

- `src/hooks/useEnterpriseBrands.ts` (novo) — CRUD de marcas.
- `src/hooks/useEnterpriseProfiles.ts` — adicionar `brand_id`, `unit_name`; novo seletor `getUnitsByBrand`.
- `src/components/enterprise/BrandSelector.tsx` (novo) — combobox criar/escolher marca, usado no wizard.
- `src/components/enterprise/EnterpriseProfileStep.tsx` — exibir contexto da marca, herdar campos que não mudam entre unidades (tipo de propriedade, certificações corporativas) como *defaults editáveis*.
- `src/pages/NovaRodadaForm.tsx` — incluir step "Marca/Rede" antes do destino quando tipo = empresarial.
- `src/pages/RedeDetalhe.tsx` (novo) — visão consolidada da rede.
- `src/pages/Destinos.tsx` / `Diagnosticos.tsx` — coluna "Marca" e filtro por marca.
- `src/components/diagnostics/IntegratedTerritorialView.tsx` — quando a unidade pertence a uma rede, mostrar contexto "marca vs território".

## Edge functions

- `generate-report` (modo empresarial): aceitar `brand_id` opcional e gerar relatório multi-unidade com seção comparativa.
- Novo helper `compute-brand-rollup` (RPC SQL) para alimentar a tabela comparativa sem N+1.

## Segurança / RLS

- `enterprise_brands`: RLS por `org_id` (mesmo padrão dos profiles), grants para `authenticated` + `service_role`.
- Política em `enterprise_profiles` mantida; adicionar checagem de que `brand_id` (se presente) pertence ao mesmo `org_id`.

## Migração e compatibilidade

- Migration cria `enterprise_brands`, adiciona colunas em `enterprise_profiles`, faz backfill 1:1 (uma marca "solo" por profile existente) e cria índices `(brand_id)`, `(brand_id, destination_id)`.
- Código antigo continua funcionando: profiles sem `brand_id` (caso surjam) caem no fluxo "solo".

## Entregáveis por fase

1. **Fase A — modelo + CRUD**: migration, hook de marcas, página de gestão em Configurações.
2. **Fase B — wizard**: BrandSelector no Step 1/2 da Nova Rodada Empresarial; defaults herdados da marca.
3. **Fase C — visão de rede**: `/diagnosticos/rede/:brandId` com tabela comparativa, heatmap e recomendações segmentadas.
4. **Fase D — relatório IA de marca**: extensão da `generate-report` com análise marca × território por unidade.

Confirmo se posso seguir já pela **Fase A + B** (base e wizard) neste ciclo, deixando C e D para o próximo, ou se prefere outra ordem.
