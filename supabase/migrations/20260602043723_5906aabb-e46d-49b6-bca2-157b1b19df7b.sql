
CREATE TABLE IF NOT EXISTS public.report_semantic_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'global' CHECK (scope IN ('global','org')),
  org_id UUID NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  section_header TEXT NULL,
  applies_to TEXT NOT NULL DEFAULT 'both' CHECK (applies_to IN ('territorial','enterprise','both')),
  injection_order INT NOT NULL DEFAULT 100,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  version INT NOT NULL DEFAULT 1,
  created_by UUID NULL,
  updated_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rse_category ON public.report_semantic_entries(category);
CREATE INDEX IF NOT EXISTS idx_rse_active_scope ON public.report_semantic_entries(active, scope);
CREATE INDEX IF NOT EXISTS idx_rse_org ON public.report_semantic_entries(org_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_semantic_entries TO authenticated;
GRANT ALL ON public.report_semantic_entries TO service_role;

ALTER TABLE public.report_semantic_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view semantic entries" ON public.report_semantic_entries;
CREATE POLICY "Authenticated can view semantic entries"
ON public.report_semantic_entries FOR SELECT TO authenticated
USING (scope = 'global' OR org_id IN (SELECT org_id FROM public.profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins can insert semantic entries" ON public.report_semantic_entries;
CREATE POLICY "Admins can insert semantic entries"
ON public.report_semantic_entries FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'ADMIN'));

DROP POLICY IF EXISTS "Admins can update semantic entries" ON public.report_semantic_entries;
CREATE POLICY "Admins can update semantic entries"
ON public.report_semantic_entries FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'ADMIN'));

DROP POLICY IF EXISTS "Admins can delete semantic entries" ON public.report_semantic_entries;
CREATE POLICY "Admins can delete semantic entries"
ON public.report_semantic_entries FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'ADMIN'));

CREATE TABLE IF NOT EXISTS public.report_semantic_entry_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES public.report_semantic_entries(id) ON DELETE CASCADE,
  entry_key TEXT NOT NULL,
  version INT NOT NULL,
  content_before TEXT NULL,
  content_after TEXT NOT NULL,
  active_before BOOLEAN NULL,
  active_after BOOLEAN NOT NULL,
  changed_by UUID NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rseh_entry ON public.report_semantic_entry_history(entry_id, changed_at DESC);

GRANT SELECT, INSERT ON public.report_semantic_entry_history TO authenticated;
GRANT ALL ON public.report_semantic_entry_history TO service_role;

ALTER TABLE public.report_semantic_entry_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view semantic history" ON public.report_semantic_entry_history;
CREATE POLICY "Admins can view semantic history"
ON public.report_semantic_entry_history FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'ADMIN'));

DROP POLICY IF EXISTS "Admins can insert semantic history" ON public.report_semantic_entry_history;
CREATE POLICY "Admins can insert semantic history"
ON public.report_semantic_entry_history FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'ADMIN'));

-- BEFORE UPDATE: bump version + touch timestamp
CREATE OR REPLACE FUNCTION public.fn_rse_before_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.content IS DISTINCT FROM OLD.content OR NEW.active IS DISTINCT FROM OLD.active
     OR NEW.title IS DISTINCT FROM OLD.title OR NEW.injection_order IS DISTINCT FROM OLD.injection_order
     OR NEW.applies_to IS DISTINCT FROM OLD.applies_to OR NEW.section_header IS DISTINCT FROM OLD.section_header
     OR NEW.category IS DISTINCT FROM OLD.category THEN
    NEW.version := OLD.version + 1;
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

-- AFTER INSERT/UPDATE: record history
CREATE OR REPLACE FUNCTION public.fn_rse_after_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.report_semantic_entry_history(
      entry_id, entry_key, version, content_before, content_after, active_before, active_after, changed_by
    ) VALUES (NEW.id, NEW.key, NEW.version, NULL, NEW.content, NULL, NEW.active, NEW.created_by);
  ELSIF TG_OP = 'UPDATE' AND NEW.version IS DISTINCT FROM OLD.version THEN
    INSERT INTO public.report_semantic_entry_history(
      entry_id, entry_key, version, content_before, content_after, active_before, active_after, changed_by
    ) VALUES (NEW.id, NEW.key, NEW.version, OLD.content, NEW.content, OLD.active, NEW.active, NEW.updated_by);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rse_before_update ON public.report_semantic_entries;
CREATE TRIGGER trg_rse_before_update BEFORE UPDATE ON public.report_semantic_entries
FOR EACH ROW EXECUTE FUNCTION public.fn_rse_before_update();

DROP TRIGGER IF EXISTS trg_rse_after_change ON public.report_semantic_entries;
CREATE TRIGGER trg_rse_after_change AFTER INSERT OR UPDATE ON public.report_semantic_entries
FOR EACH ROW EXECUTE FUNCTION public.fn_rse_after_change();

-- SEED
INSERT INTO public.report_semantic_entries (key, category, title, section_header, applies_to, injection_order, content) VALUES
('methodology.base_sistur', 'methodology', 'Fundamentos teóricos de Mario Beni', 'FUNDAMENTOS TEÓRICOS DE MARIO BENI', 'both', 10,
$sl$O turismo deve ser compreendido como um sistema aberto (SISTUR) composto por subsistemas interdependentes. O território é a base de toda atividade turística. A governança pública é condição para o desenvolvimento turístico efetivo. O marketing turístico só deve ser acionado após consolidação da base territorial e institucional.$sl$),

('methodology.pillars', 'methodology', 'Os três eixos SISTUR', 'OS TRÊS EIXOS SISTUR', 'both', 20,
$sl$1. I-RA — Relações Ambientais: Contexto territorial, meio ambiente, dados demográficos, segurança, saneamento
2. I-OE — Organização Estrutural: Infraestrutura turística, serviços, mercado, qualificação profissional
3. I-AO — Ações Operacionais: Governança pública, planejamento, orçamento, capacidade institucional$sl$),

('classification.scale_5_levels', 'classification', 'Régua oficial de classificação (5 níveis)', 'CLASSIFICAÇÃO (régua oficial 5 níveis)', 'both', 30,
$sl$- 🟢 EXCELENTE (≥90%): desempenho de referência, padrão a ser preservado
- 🔵 FORTE (80-89%): desempenho consolidado, com margem para excelência
- 🟡 ADEQUADO (67-79%): atende ao mínimo, com oportunidades pontuais de melhoria
- 🟠 ATENÇÃO (34-66%): exige intervenção planejada para evitar degradação
- 🔴 CRÍTICO (≤33%): requer ação imediata e priorização máxima
Use SEMPRE estas faixas e rótulos, com a vírgula decimal brasileira (ex.: "67,3% — ADEQUADO"). Nunca use "BOM" — o termo oficial é "ADEQUADO".$sl$),

('extension.mst', 'mst_extension', 'Extensão Mandala da Sustentabilidade no Turismo (MST)', 'EXTENSÃO MANDALA DA SUSTENTABILIDADE NO TURISMO (MST) — quando ativada via opt-in', 'both', 40,
$sl$Quando indicadores com prefixo "MST_" aparecerem nos dados (ex: MST_ACC_NBR9050, MST_TBC, MST_5G_WIFI, MST_PNQT_QUAL, MST_TSE_TURNOUT, MST_INCLUSAO_GESTAO, MST_SENSIBILIZACAO, MST_BIGDATA, MST_DIGITAL_PROMO), trate-os como dimensões complementares baseadas em Tasso, Silva & Nascimento (2024) — Mandala da Sustentabilidade no Turismo. Eles entram no score do pilar com peso igual aos demais indicadores. NA SEÇÃO DE GARGALOS, identifique-os explicitamente com o prefixo "🌀 [MST]" e cite a dimensão (Acessibilidade, TBC, Conectividade Digital, Qualificação PNQT, Participação Cívica, Inclusão na Gestão, Sensibilização, Big Data Turístico, Promoção Digital). Se nenhum MST_ aparecer, NÃO mencione a Mandala — o diagnóstico não foi expandido.$sl$),

('sources.transparency_rules', 'sources', 'Fontes de dados — transparência e rastreabilidade', 'FONTES DE DADOS — TRANSPARÊNCIA E RASTREABILIDADE', 'both', 50,
$sl$Os dados do diagnóstico são coletados automaticamente de fontes oficiais e complementados por dados locais. Cada indicador possui rastreabilidade completa de proveniência:
- IBGE (Agregados e Pesquisas): População, PIB per capita, Densidade, Área, IDH, IDEB, Índice de Gini, Incidência de pobreza, Taxa de mortalidade infantil, Mortalidade geral. Confiabilidade: ALTA (5/5).
- DATASUS: Leitos hospitalares, Cobertura de saúde. Confiabilidade: ALTA (5/5).
- STN / Tesouro Nacional: Receita própria, Despesa com turismo. Confiabilidade: ALTA (5/5).
- CADASTUR / dados.gov.br: Guias de turismo, Agências de turismo, Meios de hospedagem. Confiabilidade: ALTA (4/5 — atualização trimestral).
- Mapa do Turismo Brasileiro (API REST mapa.turismo.gov.br): Categoria (A-E), Região turística, Empregos formais em turismo, Estabelecimentos turísticos, Visitantes nacionais e internacionais, Arrecadação turística, Conselho municipal de turismo. Confiabilidade: ALTA (5/5).
- Dados de preenchimento manual: Taxa de escolarização e quaisquer indicadores que não retornem valor oficial válido no momento da coleta.
- Base de Conhecimento (KB): Documentos locais do destino (PDFs, relatórios, planos diretores) e referências nacionais com resumos extraídos por IA.$sl$),

('sources.citation_rules', 'sources', 'Regra crítica de citação de fontes', 'REGRA CRÍTICA E INEGOCIÁVEL DE FONTES', 'both', 60,
$sl$1. CADA dado numérico mencionado no relatório DEVE ter a fonte entre parênteses imediatamente após o valor. Exemplo: "População: 45.321 hab. (IBGE, 2022)"
2. TODAS as tabelas de indicadores DEVEM conter uma coluna "Fonte" indicando a origem do dado (IBGE, DATASUS, STN, CADASTUR, Mapa do Turismo, Preenchimento Manual, etc.)
3. Se houver snapshots de proveniência, use-os para identificar EXATAMENTE de onde cada valor veio, incluindo o ano de referência
4. Se o dado veio de preenchimento manual, indique CLARAMENTE: "(Fonte: Preenchimento manual)"
5. Quando documentos da Base de Conhecimento informarem contexto adicional, referencie-os pelo nome
6. O relatório DEVE terminar com uma seção "## Referências" em formato ABNT NBR 6023 listando TODAS as fontes oficiais consultadas
7. NUNCA apresente um dado sem citar a fonte — se a fonte for desconhecida, indique "(Fonte: Não identificada)"$sl$),

('sources.attribution_rules', 'sources', 'Regras de atribuição correta de fonte (anti-troca)', 'REGRAS DE ATRIBUIÇÃO CORRETA DE FONTE (anti-troca de origem)', 'both', 70,
$sl$- "Leitos de Hospedagem" / "Meios de hospedagem" / "Capacidade hoteleira" → fonte CADASTUR (Ministério do Turismo). NUNCA atribua a DATASUS.
- "Leitos hospitalares SUS" / "Cobertura de saúde" → fonte DATASUS. NUNCA atribua a CADASTUR.
- "CAPAG" → fonte STN/Tesouro Nacional. Use a classificação A/B/C/D EXATAMENTE como aparece na TRILHA DE AUDITORIA — NÃO troque B por C nem C por B.
- "Permanência média" / "Gasto médio diário" / "Receita turística" → fonte CADASTUR/MTur ou base de referência interna. Use o valor EXATO da TRILHA DE AUDITORIA.
- "Emissão de gases de efeito estufa" → fonte SEEG/MapBiomas ou Manual. Use o valor numérico EXATO da auditoria.$sl$),

('glossary.IGMA', 'glossary', 'IGMA — nomenclatura obrigatória', 'IGMA — NOMENCLATURA OBRIGATÓRIA', 'both', 80,
$sl$- A primeira menção a "IGMA" no relatório DEVE expandir a sigla: "Índice de Gestão Municipal Ambiental (IGMA)".
- A partir da segunda menção, pode usar apenas "IGMA". Sempre que aparecer uma flag IGMA, explique o que ela mede em uma frase.$sl$),

('glossary.contextual_indicators', 'glossary', 'Indicadores contextuais (peso 0)', 'INDICADORES CONTEXTUAIS (peso 0)', 'both', 90,
$sl$- Indicadores como "População", "Área Territorial" e "Densidade Demográfica" têm peso 0 e são CONTEXTUAIS — apenas caracterizam o destino.
- Quando aparecerem na trilha de auditoria com source_type terminando em "_CONTEXTUAL" (ou normalized_score = 0 e weight = 0), apresente-os SOMENTE na "Ficha Técnica" / "Caracterização do Destino" como dados informativos.
- NUNCA atribua status a indicador contextual. NUNCA inclua na seção de gargalos. NUNCA inclua nas tabelas de pontuação por eixo.$sl$),

('bibliography.beni_canonical', 'bibliography', 'Bibliografia canônica — Mario Beni / SISTUR', 'REFERÊNCIAS CANÔNICAS — USAR EXATAMENTE ESTAS DATAS E TÍTULOS (NUNCA INVENTAR ANO)', 'both', 100,
$sl$Obrigatórias quando citar Mario Beni / SISTUR:
- BENI, Mario Carlos. Análise estrutural do turismo. São Paulo: SENAC, 1997. (PRIMEIRA edição — origem do modelo SISTUR. Ano: 1997, NÃO 2001, NÃO 2021.)
- BENI, Mario Carlos. Análise estrutural do turismo. 13. ed. São Paulo: SENAC, 2007. (edição revisada/ampliada de referência mais usada na academia)
- BENI, Mario Carlos. Política e planejamento de turismo no Brasil. São Paulo: Aleph, 2006.
- BENI, Mario Carlos. Globalização do turismo: megatendências do setor e a realidade brasileira. São Paulo: Aleph, 2003.

Outras obras de apoio (citar somente se realmente usar):
- TASSO, J. P. F.; SILVA, L. C. da; NASCIMENTO, A. (Org.). Mandala da Sustentabilidade no Turismo. Brasília: UnB, 2024.
- BRASIL. Ministério do Turismo. Plano Nacional de Turismo 2024–2027. Brasília: MTur, 2024.
- BRASIL. Constituição da República Federativa do Brasil de 1988. (Art. 198 — saúde 15%; Art. 212 — educação 25%).$sl$),

('anti_hallucination.rules', 'anti_hallucination', 'Política Zero Alucinação', 'REGRAS DURAS — POLÍTICA "ZERO ALUCINAÇÃO"', 'both', 110,
$sl$1. NUNCA invente, suponha, estime ou extrapole NADA. Se um dado/ano/número/fonte não estiver presente nas seções de contexto entregues, você NÃO pode usá-lo.
2. NUNCA atribuir o modelo SISTUR a 2021, 2020 ou qualquer ano diferente de 1997 (origem) ou 2007 (edição revisada).
3. NUNCA inventar título, editora ou ano de obra de Beni. Se não tiver certeza, use a edição de 1997 ou 2007 desta lista.
4. Ao citar Beni no corpo do texto: (BENI, 1997) para o modelo original; (BENI, 2007) para a edição revisada.
5. Toda obra citada no texto DEVE aparecer na seção "Referências" no formato ABNT NBR 6023 desta lista.
6. NÚMEROS: cada percentual, valor monetário, contagem ou ano referente ao destino DEVE corresponder exatamente a uma linha da TABELA DE AUDITORIA ou da seção VALORES BRUTOS. Se não houver dado validado, escreva "[dado não disponível na base validada]".
7. ANOS DE REFERÊNCIA: use o ano que aparece na trilha de auditoria. Se ausente, omita o ano em vez de inventar.
8. FONTES: toda tabela/afirmação numérica DEVE indicar a fonte exatamente como aparece na trilha de auditoria.
9. STATUS / CLASSIFICAÇÃO: use SOMENTE a régua oficial (CRÍTICO/ATENÇÃO/ADEQUADO/FORTE/EXCELENTE).
10. COMPARAÇÕES com outros municípios/regiões: somente se constar dos BENCHMARKS OFICIAIS injetados.
11. Se faltar dado para uma seção inteira, escreva "Seção sem dados validados suficientes para análise neste ciclo.".
12. Em caso de dúvida, PREFIRA OMITIR a inventar.
13. CITAÇÃO DE PÁGINA: só inclua número de página se o trecho estiver LITERALMENTE presente na BASE DE CONHECIMENTO com a página explicitamente registrada. Caso contrário, cite somente autor e ano.$sl$),

('formatting.brazilian_numbers', 'formatting', 'Formatação numérica — padrão brasileiro', 'FORMATAÇÃO NUMÉRICA — PADRÃO BRASILEIRO (OBRIGATÓRIO)', 'both', 200,
$sl$- Usar VÍRGULA como separador decimal: 65,3% (CORRETO) — NÃO 65.3%
- Usar PONTO como separador de milhar: 45.321 habitantes (CORRETO) — NÃO 45,321
- Exemplos corretos: "População: 45.321 hab.", "Score: 67,5%", "PIB per capita: R$ 32.450,00", "Área: 1.234,56 km²"
- NUNCA usar o formato americano/inglês com ponto decimal e vírgula de milhar
- Esta regra aplica-se a TODOS os números no relatório, sem exceção$sl$),

('formatting.abnt_post_textual', 'formatting', 'Estrutura pós-textual ABNT', 'ESTRUTURA PÓS-TEXTUAL — OBRIGATÓRIO', 'territorial', 210,
$sl$1. REFERÊNCIAS (NBR 6023): lista em ordem alfabética de todas as fontes citadas
   Formato para dados oficiais:
   - INSTITUTO BRASILEIRO DE GEOGRAFIA E ESTATÍSTICA (IBGE). Nome do dado. Ano. Disponível em: URL.
   - BRASIL. Ministério do Turismo. Mapa do Turismo Brasileiro. Ano.
   - BRASIL. Ministério da Saúde. DATASUS. Nome do indicador. Ano.
   - BRASIL. Secretaria do Tesouro Nacional (STN). Dados fiscais. Ano.
   - BRASIL. Ministério do Turismo. CADASTUR. Dados de registro. Ano.
2. APÊNDICE (se houver notas adicionais ou metodologia estendida)
3. GLOSSÁRIO com termos técnicos do SISTUR (RA, OE, AO, IGMA, I-SISTUR)$sl$),

('formatting.language_style', 'formatting', 'Linguagem técnica impessoal', 'LINGUAGEM', 'both', 220,
$sl$- Impessoal: "Verifica-se que..." em vez de "Verificamos que..."
- Verbos na 3ª pessoa ou voz passiva
- Termos técnicos na primeira menção com definição entre parênteses
- Siglas: por extenso na primeira menção, ex: "Relações Ambientais (RA)"$sl$)
ON CONFLICT (key) DO NOTHING;
