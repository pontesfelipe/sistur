# Diagnósticos por Estado (UF): duas rotas

O usuário poderá avaliar um estado de duas formas complementares, sem rankings públicos entre municípios.

## Rota 1 — Diagnóstico Estadual próprio (de cima para baixo)

- Novo tipo de território "Estado (UF)" ao criar um destino, ao lado de "Município".
- Ao criar uma rodada para um estado, o sistema usa um catálogo próprio de indicadores estaduais nos três pilares:
  - RA: áreas protegidas estaduais, saneamento médio, PIB estadual, emprego no turismo (CAGED por UF).
  - OE: malha aérea do estado (ANAC), leitos e prestadores CADASTUR somados, rodovias e saúde por 10 mil habitantes.
  - AO: chegadas internacionais (Polícia Federal), regiões turísticas e municípios no Mapa do Turismo, plano estadual de turismo, conselho e fundo estaduais.
- Mesmas réguas de status (Adequado ≥67%, Atenção 34–66%, Crítico ≤33%), mesmo motor IGMA e mesmos níveis Essencial/Estratégico/Integral.
- Prescrições EDU e projetos funcionam igual, com público-alvo estadual (gestores da secretaria estadual).

## Rota 2 — Panorama Estadual consolidado (de baixo para cima)

- Nova página "Panorama do Estado" dentro de Consórcios/Regiões.
- Mostra, para uma UF, a média RA/OE/AO dos municípios que aceitaram participar (mesma regra de consentimento dos consórcios) e a distribuição de status por região turística.
- Lista privada só para quem tem acesso estadual; nada é público.
- Destaca os gargalos mais frequentes no estado e quantos municípios os compartilham.

## Integração entre as rotas

- Na tela do diagnóstico estadual, um quadro "O que dizem os municípios" mostra o panorama da Rota 2 ao lado das notas estaduais.

## Ordem de entrega

1. Confirmar quais dados oficiais já existem agregados por UF e o que falta buscar.
2. Rota 1: tipo Estado, catálogo estadual, cálculo e telas.
3. Rota 2: panorama consolidado com consentimento.
4. Quadro integrado, documentação (Metodologia, FAQ, Guia), versão e aviso de recálculo.

## Detalhes técnicos

- Destinos: campo de escala (municipal/estadual); indicadores com escopo de escala para filtrar o catálogo.
- Cálculo estadual no mesmo edge function de cálculo, com ramificação por escala; registrar em `calcRulesChanges.ts`.
- Ingestões estaduais sempre via `trigger-ingestion`.
- Panorama: função security-definer seguindo o padrão de `get_consortium_comparison`, filtrando por UF e consentimento; RLS em toda tabela nova.
- Papel de acesso estadual reaproveitando `consortium_user_roles` (um "consórcio" do tipo estado).
- Testes das réguas e da agregação estadual.
