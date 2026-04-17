/**
 * Controle de Versão do SISTUR
 * 
 * Formato: MAJOR.MINOR.PATCH
 * - MAJOR: Mudanças incompatíveis ou grandes reformulações (1.0.0)
 * - MINOR: Novas funcionalidades compatíveis (.1, .2, .3)
 * - PATCH: Correções de bugs e micro ajustes (.0.1, .0.2)
 * 
 * Changelog deve ser atualizado a cada versão
 */

export const APP_VERSION = {
  major: 1,
  minor: 30,
  patch: 3,
  get full() {
    return `${this.major}.${this.minor}.${this.patch}`;
  },
  get short() {
    return `v${this.major}.${this.minor}`;
  }
};

export const VERSION_HISTORY = [
  {
    version: "1.30.3",
    date: "2026-04-17",
    type: "patch" as const,
    changes: [
      "Pré-preenchimento MST: edge functions ingest-tse e ingest-anatel agora persistem MST_TSE_TURNOUT (comparecimento eleitoral) e MST_5G_WIFI (cobertura 5G/4G/Wi-Fi público) em external_indicator_values quando org_id é fornecido. Antes os dados ficavam apenas no cache e nunca chegavam à tela de validação",
      "useFetchOfficialData ganha parâmetro includeMandala que dispara ingest-tse e ingest-anatel em paralelo com IBGE/CADASTUR/Mapa do Turismo/ANA. Diagnósticos sem o opt-in MST continuam sem invocar essas fontes (sem custo extra)",
      "DataValidationPanel: badge '🌀 MST' adicionado nas linhas da tabela para indicadores com prefixo MST_, com tooltip explicando a origem (Tasso, Silva & Nascimento, 2024). SOURCE_INFO ganha entradas TSE (🗳️) e ANATEL (📡)",
      "AssessmentCard: novo badge '🌀 MST' no cabeçalho dos cards de diagnóstico quando expand_with_mandala = true, tornando visível em /diagnosticos quais rodadas estão usando a extensão Mandala",
      "NovaRodadaDialogs e DiagnosticoDetalhe: prop includeMandala propagada para DataValidationPanel para que o pré-preenchimento respeite o opt-in da rodada",
    ],
  },
  {
    version: "1.30.2",
    date: "2026-04-17",
    type: "patch" as const,
    changes: [
      "Autopreenchimento do indicador AO001 (Fluxo Turístico Anual): a edge function fetch-official-data agora deriva automaticamente AO001 = visitantes nacionais + visitantes internacionais a partir do Mapa do Turismo, tanto na rota REST API quanto no fallback de banco. Antes o agregado nunca era criado e o indicador aparecia vazio na tela de preenchimento mesmo com os dados-fonte (igma_visitantes_nacionais e igma_visitantes_internacionais) já ingeridos",
      "Backfill aplicado em 6 municípios que já tinham visitantes ingeridos (3505500, 3507100, 3509700, 3522109, 4108304, 5002209) — AO001 calculado e gravado em external_indicator_values com source MAPA_TURISMO e validated=false para revisão pelo gestor",
    ],
  },
  {
    version: "1.30.1",
    date: "2026-04-17",
    type: "patch" as const,
    changes: [
      "Roteamento pós-login por papel: ao acessar '/', usuários ESTUDANTE (sem ERP) vão direto para '/edu' (Minha Jornada), PROFESSOR (sem ERP) vão para '/professor' (Gestão de Turmas) e ADMIN/ORG_ADMIN/usuários com acesso ERP continuam no Dashboard ERP. Antes apenas estudantes eram redirecionados, professores caíam em telas inadequadas",
      "ProtectedRoute: ORG_ADMIN agora também faz bypass da checagem de licença (igual ao ADMIN), evitando que administradores de organização sejam empurrados para a página de assinatura caso a licença esteja momentaneamente indisponível",
    ],
  },
  {
    version: "1.30.0",
    date: "2026-04-17",
    type: "minor" as const,
    changes: [
      "Mandala MST integrada ao motor de cálculo: os 9 indicadores complementares (MST_ACC_NBR9050, MST_TBC, MST_5G_WIFI, MST_PNQT_QUAL, MST_TSE_TURNOUT, MST_INCLUSAO_GESTAO, MST_SENSIBILIZACAO, MST_BIGDATA, MST_DIGITAL_PROMO) agora participam do cálculo de pilar com peso igual aos demais e geram issues + prescrições automaticamente quando o opt-in expand_with_mandala estiver ativo",
      "Mapeamento EDU para MST: 14 entradas adicionadas em edu_indicator_training_map ligando cada indicador MST a treinamentos existentes (acessibilidade, governança regional, transformação digital, comunitário) ou a 4 novos treinamentos placeholder MST (TBC, Sensibilização, Big Data Turístico, Promoção Digital) — gargalos MST agora produzem recomendações de capacitação como qualquer outro indicador",
      "generate-report: BASE_METHODOLOGY ganha bloco MST que orienta a IA a marcar gargalos MST com '🌀 [MST]' e citar a dimensão (Acessibilidade, TBC, Conectividade, etc.). Diagnósticos sem opt-in continuam sem qualquer menção à Mandala",
      "generate-project-structure: prompt instrui a IA a prefixar tarefas derivadas de indicadores MST com '🌀 MST:' e elevar a prioridade para pelo menos 'high' quando o status for CRITICO — projetos gerados por IA agora cobrem dimensões da Mandala explicitamente",
      "Cobertura completa do ciclo: ativando MST no Step 3 da Nova Rodada, o destino tem cálculo, gargalos, prescrições EDU, projeto gerado por IA e relatório PDF cobrindo automaticamente as 9 dimensões complementares da Mandala da Sustentabilidade no Turismo",
    ],
  },
  {
    version: "1.29.1",
    date: "2026-04-17",
    type: "patch" as const,
    changes: [
      "Documentação: página Metodologia ganha seção dedicada à Mandala da Sustentabilidade no Turismo (MST) com os 9 indicadores complementares mapeados em RA/OE/AO, automação via TSE/Anatel/CADASTUR e nota sobre a Mandala do Destino",
      "FAQ: 4 novas perguntas cobrindo o que é a MST, como ativar via opt-in no Step 3 da Nova Rodada, quais indicadores são automatizados nos 15 destinos âncora e o que é o componente Mandala do Destino no Dashboard",
      "Sem mudanças funcionais — apenas atualização de documentação e FAQ para alinhar a base de conhecimento com as features lançadas em v1.28.0 e v1.29.0",
    ],
  },
  {
    version: "1.29.0",
    date: "2026-04-17",
    type: "minor" as const,
    changes: [
      "Caches oficiais MST: novas tabelas tse_turnout_cache (comparecimento eleitoral por município/ano) e anatel_coverage_cache (cobertura 5G/4G/Wi-Fi público) — populadas com 15 destinos turísticos âncora (capitais + Foz do Iguaçu, Olinda, Ribeirão Preto, Uberlândia)",
      "Edge functions ingest-tse e ingest-anatel agora retornam dados reais via cache (collection_method='AUTOMATIC') em vez de exigir entrada manual para esses 15 municípios",
      "Filtro 'Mandala' adicionado ao painel de Indicadores: 'Núcleo SISTUR' vs '🌀 Mandala MST' para visualização segregada do catálogo",
      "DiagnosticoDetalhe agora respeita assessment.expand_with_mandala: indicadores MST só aparecem quando o opt-in foi ativado na criação da rodada — diagnósticos legados continuam vendo apenas o núcleo SISTUR",
      "Novo componente MandalaDestino no Dashboard Territorial: visualização circular dos 3 conjuntos de Mario Beni (RA/OE/AO) com seus subsistemas explícitos (Ecológico/Social/Econômico/Cultural, Superestrutura/Infraestrutura, Mercado/Oferta/Demanda/Distribuição). Quando MST está ativo, anel externo mostra Tecnologia, Inclusão, TBC e Sensibilização",
      "Score Final SISTUR exibido no centro da Mandala como média dos pilares — sem ranking público, em conformidade com a constraint i-sistur-internal-only",
    ],
  },
  {
    version: "1.28.0",
    date: "2026-04-17",
    type: "minor" as const,
    changes: [
      "Mandala da Sustentabilidade no Turismo (MST): expansão opcional do diagnóstico baseada em Tasso, Silva & Nascimento (2024). Toggle no Step 3 do fluxo Nova Rodada permite incluir 9 indicadores complementares (4 RA, 3 OE, 2 AO) cobrindo acessibilidade NBR 9050, comparecimento eleitoral, qualificação PNQT, conectividade 5G/Wi-Fi, promoção digital, Big Data turístico, TBC, inclusão na gestão e sensibilização",
      "Banco: novas colunas indicators.is_mandala_extension e assessments.expand_with_mandala (não-destrutivo, default false). Diagnósticos antigos não são afetados",
      "Edge functions de automação: ingest-tse (comparecimento eleitoral), ingest-anatel (conectividade 5G/Wi-Fi) e ingest-cadastur estendido para extrair MST_PNQT_QUAL e MST_ACC_NBR9050",
      "useIndicators ganha parâmetro includeMandala para filtrar/incluir indicadores MST conforme contexto. Tabela de indicadores exibe badge '🌀 MST' nos 9 indicadores da extensão",
      "Score Final SISTUR e classificação preservados sem MST para garantir comparabilidade entre diagnósticos com/sem expansão",
    ],
  },
  {
    version: "1.27.3",
    date: "2026-04-17",
    type: "patch" as const,
    changes: [
      "Configurações > Ferramentas: novo painel 'Ajuste de Pesos dos Indicadores' (admin-only) para calibrar pesos por pilar (RA/OE/AO) com edição inline, validação de soma 100%, ações Igualar / Normalizar 100% / Reverter / Salvar e indicação visual de pilares editados",
    ],
  },
  {
    version: "1.27.2",
    date: "2026-04-17",
    type: "patch" as const,
    changes: [
      "Etapa A — Score Final SISTUR (FORMULAS_MATEMÁTICAS.docx): novas colunas assessments.final_score e assessments.final_classification populadas automaticamente em cada cálculo. Fórmula canônica: Final = (RA × 0,35) + (OE × 0,30) + (AO × 0,35)",
      "Classificação em 5 faixas conforme documento metodológico: Crítico (0,00–0,39), Insuficiente (0,40–0,54), Em Desenvolvimento (0,55–0,69), Bom (0,70–0,84), Excelente (0,85–1,00)",
      "Etapa B — Calibração de pesos: indicators.weight normalizado para somar exatamente 1,0 por pilar (RA/OE/AO), com proporção relativa preservada. Pesos originais arquivados em indicators.weight_legacy para auditoria",
      "Etapa C — Memória de cálculo: generate-report passa a incluir o Score Final SISTUR e classificação na tabela de identificação do relatório, com nota metodológica explícita (uso interno, sem ranking público, em conformidade com a constraint i-sistur-internal-only)",
      "Edge function calculate-assessment retorna final_score e final_classification no payload de resposta para uso direto no frontend",
    ],
  },
  {
    version: "1.27.1",
    date: "2026-04-17",
    type: "patch" as const,
    changes: [
      "Validação E2E: motor 'calculate-assessment' agora popula automaticamente as 3 camadas de dados (value_raw, value_normalized, score_pct) + metadados (polarity, normalization_method, confidence_level) em cada cálculo — antes apenas o backfill histórico estava preenchido",
      "Confidence level dinâmico no recálculo: indicadores de fontes API (IBGE, DATASUS, CADASTUR, SISMAPA, INEP, STN) recebem 1.0 e fontes manuais recebem 0.7 automaticamente",
      "Indicadores compostos (ex: I_SEMT, IIET) ganharam metadata explícita: normalization_method='composite_weighted' e confidence_level=0.85",
    ],
  },
  {
    version: "1.27.0",
    date: "2026-04-17",
    type: "minor" as const,
    changes: [
      "Etapa 3 (Fontes Turismo): indicador 'Leitos por Habitante' (igma_leitos_por_habitante) corrigido de DATASUS → CADASTUR — refere-se a leitos de meios de hospedagem, não a leitos hospitalares SUS. Indicador hospitalar renomeado para 'Leitos hospitalares SUS por mil habitantes' para eliminar ambiguidade",
      "Etapa 4 (Confiança): backfill aplicado em indicator_scores.confidence_level (Automática=1.0, Manual=0.7, Estimada=0.4) + populadas as colunas polarity e normalization_method a partir do indicador-mãe",
      "Etapa 5 (Padronização): novo indicador canônico cadunico_baixa_renda_pct (RA, polaridade LOW_IS_BETTER, fonte CADUNICO/MDS, faixa 0–60%) elimina a ambiguidade de 'população baixa renda' que estava como Manual genérico",
      "Nova view indicator_scores_enriched (security_invoker): consolida pipeline raw→normalized→score, polaridade aplicada, fonte e selo de auditoria (verificado / auditoria_pendente / baixa_confianca) — pronta para uso em dashboards e relatórios",
      "Etapa 6 (Relatório): generate-report agora envia ao prompt da IA, para cada indicador, três camadas explícitas: Bruto (com unidade formatada), Índice (0–1) e Score% (0–100), além de Polaridade aplicada, Fonte e selo visual de auditoria (✓ verificado / ⚠ auditoria pendente / ✗ baixa confiança) — corrige as divergências de Foz do Iguaçu",
      "Resultado prático: o LLM e o leitor humano agora distinguem claramente IDH 0,751 (índice) de 0,8% (porcentagem) e veem se a fonte é Cadastur, IBGE ou entrada manual pendente de validação",
    ]
  },
  {
    version: "1.26.0",
    date: "2026-04-17",
    type: "minor" as const,
    changes: [
      "Etapa 1 (Fundação Auditável): tabela indicator_scores expandida com value_raw (valor original), value_normalized (escala 0-1), score_pct (0-100), polarity (HIGH/LOW_IS_BETTER) e normalization_method aplicado — fim da confusão entre 'IDH 0,751' e '0,8%'",
      "Coluna confidence_level adicionada para sinalizar fontes manuais (0.7) vs automáticas (1.0) vs estimadas (0.4) — base para selos de auditoria",
      "Etapa 2 (Memória de Cálculo): nova tabela indicator_calculation_trail com fórmula textual, variáveis usadas (JSONB), fontes consultadas, ano/data de referência e snapshot das 3 etapas do pipeline (raw → normalized → score) — padrão acadêmico auditável",
      "Backfill automático: scores existentes copiados para value_normalized + score_pct preservando histórico calculado",
      "RLS multi-tenant aplicada a indicator_calculation_trail (visualização por org/demo, escrita restrita a ANALYST/ADMIN)",
      "Próximas etapas: 3 (migrar fontes turismo p/ Cadastur+SISMAPA), 4 (selos de confiança na UI), 5 (CADUNICO baixa renda), 6 (relatório com 3 colunas Bruto/Índice/Score)",
    ]
  },
  {
    version: "1.25.0",
    date: "2026-04-16",
    type: "minor" as const,
    changes: [
      "Nova flag interna value_format nos indicadores (13 categorias: PERCENTAGE, RATIO, INDEX_SCORE, CURRENCY, CURRENCY_THOUSANDS, CURRENCY_MILLIONS, COUNT, RATE_PER_CAPITA, DURATION, AREA, BINARY, CATEGORICAL, NUMERIC) — define como cada número deve ser interpretado em relatórios, dashboards e formulários",
      "Auto-inferência aplicada aos 130+ indicadores existentes a partir da unidade já cadastrada (% → PERCENTAGE, R$ → CURRENCY, IQA → INDEX_SCORE, etc.)",
      "Motor de relatório (generate-report) agora formata cada valor bruto seguindo a flag (R$ X,XX para moeda, X,X% para porcentagem, X mi para milhões) e inclui o formato como metadado no prompt da IA — fim das interpretações ambíguas (ex: 0,75 lido como 75% vs 0,75 unidades)",
      "Formatador centralizado em src/lib/indicatorValueFormat.ts (formatIndicatorValue, formatIndicatorValueWithUnit) — single source of truth para exibição numérica em todo o sistema",
      "formatIndicatorValueBR refatorado para delegar à flag value_format quando presente; mantém fallback por unidade para retrocompatibilidade",
    ]
  },
  {
    version: "1.24.3",
    date: "2026-04-16",
    type: "patch" as const,
    changes: [
      "Correção do IQA (Índice de Qualidade da Água): cadastrado o indicador 'ana_iqa' no catálogo territorial — agora os valores capturados pela integração ANA/Hidroweb passam a ser injetados corretamente no preenchimento do diagnóstico (caso reportado: Itanhaém/SP)",
      "Arquivamento do indicador duplicado 'RA002' (IQA manual) para evitar duplicidade — valores históricos foram migrados para 'ana_iqa' preservando o IQA de diagnósticos anteriores",
      "Auditoria completa de escopo: 26 indicadores ENT_* corretamente classificados como 'enterprise' e 107 indicadores 'territorial' (sem mais escopo 'both' incorreto)",
    ]
  },
  {
    version: "1.24.2",
    date: "2026-04-16",
    type: "patch" as const,
    changes: [
      "Correção de escopo: 6 indicadores Enterprise (ENT_REVIEW_SCORE, ENT_NPS, ENT_HORAS_TREINO, ENT_FORNECEDORES_LOCAIS, ENT_EMPREGO_LOCAL, ENT_CERTIFICACAO_AMB) deixaram de aparecer no diagnóstico Territorial — esses indicadores são exclusivos da análise empresarial (hospedagem/empresa) e não fazem sentido para a avaliação agregada do destino",
    ]
  },
  {
    version: "1.24.1",
    date: "2026-04-16",
    type: "patch" as const,
    changes: [
      "Documentação: Metodologia atualizada para 8 fontes oficiais integradas (inclusão da ANA/Hidroweb/Qualiágua para IQA municipal alimentando o pilar RA)",
      "FAQ ERP: nova pergunta sobre integração ANA/IQA e atualização da pergunta de fontes oficiais (8 fontes, 25+ indicadores)",
      "FAQ EDU: 5 novas perguntas cobrindo o fluxo completo de provas — agendamento pelo professor, acesso via Minhas Atividades, painel Acompanhar com KPIs e ações em massa, provas finais por pilar nas trilhas, e sistema anti-fraude",
    ]
  },
  {
    version: "1.24.0",
    date: "2026-04-16",
    type: "minor" as const,
    changes: [
      "Professor: novo painel 'Acompanhar' por atividade — drill-down com KPIs (conclusão, aprovação, nota média) e status individual por aluno (não iniciou, em andamento, aguarda correção, reprovado, esgotou tentativas, aprovado)",
      "Professor: filtro por status clicando nos chips de breakdown",
      "Ações em massa: enviar lembrete (todos pendentes / não iniciaram / não entregaram), prorrogar prazo, liberar tentativas extras",
      "RPCs server-authoritative: get_assignment_progress, extend_assignment_due_date, grant_extra_attempts, send_assignment_reminder",
      "Notificações automáticas em edu_notifications para alunos-alvo em prorrogação, tentativas extras e lembretes",
    ]
  },
  {
    version: "1.23.0",
    date: "2026-04-16",
    type: "minor" as const,
    changes: [
      "Professor: novo diálogo de atribuição de provas/trilhas/treinamentos com agendamento data+hora (liberação e prazo)",
      "Professor: atribuição individual — selecionar alunos específicos da turma ou enviar para todos",
      "Professor: regras específicas opcionais por prova (tempo, tentativas, nota mínima) sem alterar o ruleset global",
      "Aluno: nova página /edu/minhas-atividades listando todas as atribuições com janela, prazo e status",
      "Segurança: RPC server-authoritative can_student_start_assignment valida matrícula, alvo, janela e tentativas antes de iniciar prova",
      "Notificações: alunos-alvo recebem aviso automático na central ao serem atribuídos",
      "RLS: aluno só vê atividades em que está matriculado E é alvo (target_user_ids)",
    ]
  },
  {
    version: "1.22.0",
    date: "2026-04-16",
    type: "minor" as const,
    changes: [
      "EDU: trilhas formativas agora podem ter prova final por pilar coberto (RA/OE/AO)",
      "Nova tabela edu_track_exam_rulesets liga cada trilha a um ruleset por pilar (20 questões, 70% nota mínima, 60min, 2 tentativas)",
      "Backfill automático: todas as trilhas pré-prontas existentes receberam provas finais por pilar",
      "Novo checkbox 'Gerar provas finais automaticamente' (marcado por padrão) ao criar trilha — opcional",
      "Botão 'Gerar provas' no detalhe da trilha permite gerar/regenerar provas a qualquer momento (admin/criador)",
      "Painel 'Provas Finais da Trilha' lista provas disponíveis por pilar com config (questões/nota/tempo)",
    ]
  },
  {
    version: "1.21.15",
    date: "2026-04-16",
    type: "patch" as const,
    changes: [
      "Removidas políticas RLS permissivas (anon/true) em test_flow_registry, system_health_checks e test_registry_sync_log",
      "Acesso a tabelas de sistema restrito a ADMIN e service_role exclusivamente",
      "Removido SELECT público em lms_certificates — verificação pública via RPC verify_certificate_by_code",
      "Removido SELECT direto de org_admin em investor_profiles — acesso PII restrito ao dono do perfil (view segura mantida)",
      "Simplificada extração de indicadores em generate-project-structure (consistência código/objeto)",
    ]
  },
  {
    version: "1.21.14",
    date: "2026-04-15",
    type: "patch" as const,
    changes: [
      "Adicionadas dicas de preenchimento ('Como obter') abaixo de cada indicador territorial no formulário de preenchimento",
      "Expandido catálogo de orientações (INDICATOR_GUIDANCE) com 25+ indicadores territoriais: saneamento, educação, saúde, economia, governança, IGMA, finanças e segurança",
      "Indicadores Enterprise e Territorial agora possuem orientação uniforme durante o preenchimento",
    ]
  },
  {
    version: "1.21.13",
    date: "2026-04-15",
    type: "patch" as const,
    changes: [
      "Motor de cálculo agora cria automaticamente snapshots de proveniência (diagnosis_data_snapshots) ao calcular diagnósticos",
      "Todos os dados oficiais integrados (IBGE, SIDRA, CADASTUR, Mapa do Turismo, DATASUS, STN) são persistidos para uso em relatórios e análises",
      "Relatórios agora reconhecem fontes IBGE_CENSO, IBGE_SIDRA e INEP nos rótulos de proveniência",
      "Eliminada dependência de congelamento manual: proveniência é registrada automaticamente no cálculo",
    ]
  },
  {
    version: "1.21.12",
    date: "2026-04-15",
    type: "patch" as const,
    changes: [
      "Novos indicadores automáticos via SIDRA/IBGE: Abastecimento de água (rede geral %) e Coleta de lixo domiciliar (%)",
      "Dados do Censo 2010 (tabela 3217) integrados ao pré-preenchimento de diagnósticos territoriais",
      "Edge function fetch-official-data agora consulta API SIDRA em paralelo com IBGE Pesquisas e Mapa do Turismo",
    ]
  },
  {
    version: "1.21.11",
    date: "2026-04-15",
    type: "patch" as const,
    changes: [
      "Campos binários e categóricos no preenchimento agora usam lista de seleção em vez de input numérico",
      "Indicadores como Plano de Turismo, Conselho de Turismo e Região Turística passaram a validar por opções válidas",
      "Pré-preenchimento oficial e formulário principal exibem rótulos legíveis como Sim/Não e categorias A-E",
    ]
  },
  {
    version: "1.21.10",
    date: "2026-04-15",
    type: "patch" as const,
    changes: [
      "Filtros no Histórico de Relatórios: tipo (Territorial/Enterprise), nível (Essencial/Estratégico/Integral) e autor (meus/todos)",
      "Badge de tipo de diagnóstico e nível nos relatórios salvos",
    ]
  },
  {
    version: "1.21.9",
    date: "2026-04-15",
    type: "patch" as const,
    changes: [
      "Formatação numérica agora contextual: analisa unidade e tipo do indicador para escolher decimais",
      "Indicadores inteiros (hab, un, qtd) exibidos sem casas decimais (ex: 1.000 em vez de 1.000,00)",
      "Percentuais formatados com até 1 casa decimal (ex: 85,5%)",
      "Valores monetários (R$) com exatamente 2 casas decimais (ex: 375,00)",
      "Demais indicadores com até 2 casas decimais, removendo zeros desnecessários",
      "Função formatIndicatorValueBR centralizada e reutilizada nos painéis Territorial e Enterprise",
    ],
  },
  {
    version: "1.21.8",
    date: "2026-04-15",
    type: "patch" as const,
    changes: [
      "Pré-preenchimento territorial e Enterprise agora normaliza e exibe números no padrão pt-BR em todos os campos atualizados",
      "Campos convertem visualmente valores com ponto para vírgula ao perder foco",
      "Validação e parsing aceitam formatos mistos e persistem os números internamente de forma consistente",
      "Metas, dicas de validação e inputs de pré-preenchimento alinhados ao padrão brasileiro de decimais",
    ],
  },
  {
    version: "1.21.7",
    date: "2026-04-15",
    type: "patch" as const,
    changes: [
      "Campos de indicadores no pré-preenchimento agora exibem valores com vírgula decimal (padrão brasileiro)",
      "Input alterado de type=number para type=text com inputMode=decimal para aceitar vírgula",
      "Dicas de validação (mín/máx) formatadas em pt-BR com vírgula decimal",
      "Conversão automática de vírgula para ponto ao salvar valores internamente",
    ],
  },
  {
    version: "1.21.6",
    date: "2026-04-15",
    type: "patch" as const,
    changes: [
      "Formatação numérica padrão brasileiro em relatórios: vírgula decimal e ponto de milhar",
      "Todos os percentuais, scores e valores numéricos nos dados do relatório usam formato pt-BR",
      "Instrução explícita no prompt da IA para nunca usar formato americano (ponto decimal)",
      "Exemplos: 65,3% (correto) em vez de 65.3%, 45.321 hab. em vez de 45,321",
    ],
  },
  {
    version: "1.21.5",
    date: "2026-04-15",
    type: "minor" as const,
    changes: [
      "Relatórios seguem recomendações do MEC e normas ABNT (NBR 14724, 6024, 6023, 6028, 10520)",
      "Capa institucional ABNT no DOCX com instituição, título, natureza do trabalho, cidade e ano",
      "Estrutura textual MEC: Resumo com palavras-chave, seções numeradas progressivamente",
      "Referências em formato ABNT NBR 6023:2018 (ordem alfabética com padrão institucional)",
      "Glossário de termos técnicos SISTUR e Apêndice com documentos da KB",
      "Linguagem impessoal (3ª pessoa) e citações no formato (SOBRENOME, ano)",
      "Tabelas com título numerado acima e fonte abaixo conforme ABNT",
      "Template Enterprise atualizado com mesmas regras MEC/ABNT",
      "Certificados EDU com base legal MEC (Art. 32 LDB, Resolução CNE/CES nº 1/2001)",
    ],
  },
  {
    version: "1.21.3",
    date: "2026-04-15",
    type: "patch" as const,
    changes: [
      "Relatórios DOCX agora exportados no formato ABNT (NBR 14724 / NBR 6024)",
      "Margens: superior e esquerda 3cm, inferior e direita 2cm",
      "Espaçamento entrelinhas 1.5, recuo de parágrafo 1.25cm, texto justificado",
      "Títulos em caixa alta (H1), subtítulos em negrito, tabelas centralizadas com fonte 10pt",
      "Página A4, fonte Arial 12pt padrão, numeração de página à direita",
    ],
  },
  {
    version: "1.21.2",
    date: "2026-04-15",
    type: "patch" as const,
    changes: [
      "Corrigido botão 'Calcular Índices' bloqueado para diagnósticos DRAFT com dados preenchidos",
      "Auto-promoção de DRAFT para DATA_READY na página de detalhes do diagnóstico quando dados suficientes",
      "Condição de habilitação do cálculo agora baseada em dados reais (indicadores preenchidos) em vez de status",
    ],
  },
  {
    version: "1.21.1",
    date: "2026-04-15",
    type: "patch" as const,
    changes: [
      "Validação de campos no formulário territorial: limites min/max, inteiros e percentuais baseados no tipo de indicador",
      "Erros de validação exibidos em tempo real com destaque visual e bloqueio de salvamento",
      "Indicações de faixa válida (mín/máx) exibidas junto a cada indicador no formulário",
      "Atributos HTML min/max/step adicionados aos inputs para reforçar restrições no navegador",
    ],
  },
  {
    version: "1.21.0",
    date: "2026-04-15",
    type: "minor" as const,
    changes: [
      "Novo Dashboard 'Minha Jornada' (/edu) com visão consolidada de progresso, XP, streak e atividades recentes",
      "Catálogo de treinamentos movido para /edu/catalogo com navegação dedicada no menu",
      "Sistema de progresso granular: rastreamento por módulo, posição de vídeo e tempo de estudo (edu_detailed_progress)",
      "Sistema de gamificação: XP, níveis, streaks diários e 10 conquistas desbloqueáveis (edu_user_xp, edu_user_achievements)",
      "Notificações EDU em tempo real: prazos, resultados de exames, certificados emitidos (edu_notifications)",
      "Widget de avaliação/rating de treinamentos com estrelas e comentários (edu_training_ratings)",
      "Painel de anotações pessoais vinculadas a treinamentos e timestamps de vídeo (edu_notes)",
      "Calendário de estudos com aulas ao vivo e eventos futuros",
      "Relatório individual do aluno para professores: progresso por pilar, tempo de estudo e histórico de exames",
      "Importação CSV de alunos para turmas com preview e validação",
    ],
  },
  {
    version: "1.20.1",
    date: "2026-04-15",
    type: "patch" as const,
    changes: [
      "Removidas rotas duplicadas do módulo EDU: /cursos (legado), /learning e /admin/cursos (redirect)",
      "Item 'Quizzes' removido do menu lateral — funcionalidade integrada como aba dentro de Admin EDU",
      "Rotas legadas redirecionam automaticamente para equivalentes atuais (/cursos→/edu, /learning→/edu)",
    ],
  },
  {
    version: "1.20.0",
    date: "2026-04-14",
    type: "minor" as const,
    changes: [
      "Visual overhaul Apple-like: sombras difusas, cantos arredondados (rounded-2xl/3xl) e transições suaves de 200-300ms",
      "Botões com micro-animações: hover eleva (-translate-y-1px + shadow), active escala (0.97), font-semibold",
      "Cards com hover shadow-lg + translate-y e ícones com group-hover:scale-110",
      "StatCards redesenhados: tipografia maior (text-4xl), tracking-tight, espaçamento vertical refinado",
      "Login redesenhado: glassmorphism no card, gradiente decorativo com orbes blur, pattern de pontos sutil",
      "Tipografia global: h1-h3 com tamanhos responsivos, letter-spacing -0.025em, font-smoothing aprimorado",
      "Bottom nav mobile com frosted glass (backdrop-blur-2xl + backdrop-saturate-150 + borda translúcida)",
      "Novo token shadow-xl para elevações profundas e shadow-glow refinado",
      "Border-radius base aumentado de 0.625rem para 0.875rem (estética iOS)",
    ],
  },
  {
    version: "1.19.9",
    date: "2026-04-14",
    type: "patch" as const,
    changes: [
      "13 screenshots anotados adicionados aos tutoriais com setas e numeração indicando onde clicar",
      "Imagens ilustrativas para: login, onboarding, aprovação, trial, dashboard, alertas, diagnósticos, indicadores, cálculo, projetos, relatórios, catálogo EDU e Professor Beni",
      "Cada screenshot mostra anotações visuais (setas vermelhas numeradas) guiando o usuário passo a passo",
    ],
  },
  {
    version: "1.19.8",
    date: "2026-04-14",
    type: "patch" as const,
    changes: [
      "Sidebar reorganizada em 3 grupos colapsáveis: ERP, Educação e Recursos",
      "Grupos abrem automaticamente quando contêm a rota ativa",
      "Labels de grupo com ícone, nome e chevron de expansão/colapso",
      "Modo recolhido (ícones) mantém itens flat sem grupos para acesso rápido",
      "Redução visual de ~12 itens soltos para 3 seções organizadas",
    ],
  },
  {
    version: "1.19.7",
    date: "2026-04-14",
    type: "patch" as const,
    changes: [
      "Skeleton loaders com formato contextual (cards de diagnóstico, gauges de pilar, cards de treinamento) em vez de retângulos genéricos",
      "Componente EmptyState reutilizável com ícone, descrição e CTA para estados vazios",
      "Stepper mobile vertical colapsável no wizard Nova Rodada — substitui scroll horizontal de 700px",
      "Barra de progresso compacta com indicador de etapa atual no mobile",
      "Link 'Pular para o conteúdo' acessível no AppLayout (visível apenas com foco do teclado)",
      "aria-labels em botões de etapa do stepper e aria-current='step' na etapa ativa",
      "role='main' adicionado ao elemento main do layout",
    ],
  },
  {
    version: "1.19.6",
    date: "2026-04-14",
    type: "patch" as const,
    changes: [
      "Correção de erros de build em edge functions (TS type narrowing para catch blocks)",
      "Correção de dissertativas: lógica de correção + emissão de certificado centralizada no servidor via RPC finalize_essay_grading",
      "Removida inserção direta em lms_certificates pelo cliente (bloqueada por REVOKE INSERT)",
      "RPCs review_exam_answers, submit_exam_attempt e admin_list_quiz_options com cast temporário até sync de tipos",
    ],
  },
  {
    version: "1.19.5",
    date: "2026-04-14",
    type: "patch" as const,
    changes: [
      "Removido feedback da comunidade (fórum) dos relatórios — dados de fórum não são fonte analítica",
      "KB (Base de Conhecimento) agora estritamente isolada por organização nos relatórios — org_id filtrado explicitamente",
      "Corrigido uso de supabaseAdmin para KB no relatório, garantindo que organizações não vejam KB de outras orgs",
      "Numeração de seções dos templates de relatório corrigida após remoção da seção de comunidade",
    ],
  },
  {
    version: "1.19.4",
    date: "2026-04-14",
    type: "patch" as const,
    changes: [
      "Relatórios integram snapshots de proveniência, valores Enterprise e metadados do destino",
      "Seção 'Proveniência dos Dados' com rastreabilidade completa por fonte oficial",
      "Valores brutos Enterprise com benchmarks e categorias funcionais incluídos nos relatórios empresariais",
      "Metadados do destino (região turística, categoria, PDT) enriquecem a contextualização",
      "Prompts de IA atualizados para citar fontes específicas em cada dado e incluir seção de Fontes e Referências",
      "KB do destino e referências globais com instruções reforçadas para citação no relatório",
    ],
  },
  {
    version: "1.19.3",
    date: "2026-04-14",
    type: "patch" as const,
    changes: [
      "Painel visual de fontes de dados no pré-preenchimento: mostra quais bases alimentaram cada indicador",
      "Cards agrupados por fonte (IBGE, Mapa do Turismo, CADASTUR, DATASUS, STN) com contagem e tooltip detalhado",
      "Tooltip lista indicadores específicos capturados por cada fonte oficial",
      "Indicadores manuais contabilizados separadamente com aviso visual",
    ],
  },
  {
    version: "1.19.2",
    date: "2026-04-14",
    type: "patch" as const,
    changes: [
      "Busca de Reviews agora auto-preenche campos do perfil (estrelas, tipo, nº de UHs) além dos indicadores",
      "Removida duplicação do componente BusinessReviewSearch entre Passo 4 e Passo 5 Enterprise",
      "IA da edge function search-business-reviews agora extrai metadados do estabelecimento (property_metadata)",
      "Dados de reviews são persistidos no Passo 4 e repassados ao Passo 5 via initialAutoFillValues",
    ],
  },
  {
    version: "1.19.1",
    date: "2026-04-14",
    type: "patch" as const,
    changes: [
      "Corrigida navegação duplicada no passo 5 Enterprise (botões do painel + botões do wizard)",
      "Botão 'Voltar ao Perfil' adicionado no passo 5 Enterprise para navegação consistente",
      "orgId corrigido para usar effectiveOrgId (compatibilidade com modo Demo)",
    ],
  },
  {
    version: "1.19.0",
    date: "2026-04-13",
    type: "minor" as const,
    changes: [
      "Sistema de rastreamento de sessões EDU para compliance AVA (certificação MEC)",
      "Heartbeat a cada 30s: presença ativa, tempo de atividade e inatividade por sessão",
      "Log granular de interações: cliques, scrolls, play/pause vídeo, troca de aba, respostas em prova",
      "Detecção automática de inatividade (2 min sem interação) e encerramento de sessões ociosas (5 min)",
      "Flags automáticas de comportamento suspeito: sessões longas sem cliques, >80% inatividade, padrões de bot",
      "Painel de Compliance no Dashboard do Professor com estatísticas por aluno e drill-down de sessões",
      "Visualização detalhada de cada sessão com timeline completa de interações",
      "Workflow de revisão de alertas: professor pode confirmar fraude ou descartar com justificativa",
      "Tabelas edu_learning_sessions, edu_interaction_logs e edu_fraud_flags com RLS por papel",
      "Integração automática nas páginas de treinamento e prova (ExamTaking, EduTrainingDetalhe)",
    ],
  },
  {
    version: "1.18.6",
    date: "2026-04-13",
    type: "patch" as const,
    changes: [
      "Download da Metodologia e FAQ em formato Word (.docx) com formatação profissional",
      "FAQ atualizado com perguntas sobre o Mapa do Turismo Brasileiro e novos indicadores",
      "Botão 'Baixar em Word' adicionado às páginas de Metodologia e FAQ",
    ],
  },
  {
    version: "1.18.5",
    date: "2026-04-13",
    type: "patch" as const,
    changes: [
      "Metodologia atualizada com fonte Mapa do Turismo Brasileiro (API REST mapa.turismo.gov.br)",
      "Novos indicadores documentados: empregos, estabelecimentos, visitantes, arrecadação e conselho municipal",
      "Referência bibliográfica do Mapa do Turismo adicionada às referências da metodologia",
    ],
  },
  {
    version: "1.18.4",
    date: "2026-04-13",
    type: "patch" as const,
    changes: [
      "API REST do Mapa do Turismo integrada como fonte primária para ingestão de dados (3059 municípios)",
      "6 novos indicadores do Mapa do Turismo no pré-preenchimento: empregos, estabelecimentos, visitantes, arrecadação e conselho",
      "Edge function fetch-official-data com lookup em tempo real via API do Ministério do Turismo",
      "Fallback automático de API REST para CKAN CSV quando API não responde",
    ],
  },
  {
    version: "1.18.3",
    date: "2026-04-13",
    type: "patch" as const,
    changes: [
      "Indicadores do Mapa do Turismo integrados ao pré-preenchimento automático de diagnósticos",
      "Novo indicador igma_categoria_mapa_turismo: converte categoria A-E para escala numérica 1-5",
      "Novo indicador igma_regiao_turistica: indica se município pertence a região turística oficial",
      "Fonte MAPA_TURISMO adicionada ao enum data_source e ao catálogo de fontes externas",
      "Edge function fetch-official-data agora consulta mapa_turismo_municipios por código IBGE",
      "Painel de validação exibe dados do Mapa do Turismo com ícone 🗺️ e badge teal",
    ],
  },
  {
    version: "1.18.2",
    date: "2026-04-13",
    type: "patch" as const,
    changes: [
      "Integração Firecrawl como fonte primária para scraping do Mapa do Turismo Brasileiro",
      "Estratégia dupla: Firecrawl (scraping inteligente) com fallback automático para CSVs do CKAN",
      "Firecrawl descobre CSVs atualizados via map/search e extrai dados estruturados via scrape",
      "Toggle na UI para ativar/desativar Firecrawl — quando desativado, usa apenas CKAN estático",
      "Seletor de ano exibido apenas no modo CKAN (Firecrawl busca dados mais recentes automaticamente)",
      "Dados importados via Firecrawl são marcados com ano corrente e fonte rastreável",
    ],
  },
  {
    version: "1.18.1",
    date: "2026-04-13",
    type: "patch" as const,
    changes: [
      "Integração com Mapa do Turismo Brasileiro (dados.turismo.gov.br) via CKAN API",
      "Importação de regiões turísticas, categorização de municípios (A-E) e classificação por tipo",
      "Edge function ingest-mapa-turismo para ingestão de dados abertos do Ministério do Turismo",
      "Vinculação automática dos dados importados aos destinos cadastrados no SISTUR (por nome + UF)",
      "Painel de visualização com estatísticas, distribuição por categoria, filtros por UF e histórico de sincronização",
      "Tabela mapa_turismo_municipios com dados de 3059 municípios em 361 regiões turísticas",
    ],
  },
  {
    version: "1.18.0",
    date: "2026-04-13",
    type: "minor" as const,
    changes: [
      "Sistema completo de provas: histórico de tentativas, revisão detalhada e recurso/contestação",
      "Página 'Minhas Provas' no menu lateral EDU com estatísticas, filtros e histórico completo",
      "Revisão pós-prova: aluno visualiza respostas corretas/erradas, explicações e feedback do professor",
      "Sistema de recursos: aluno pode questionar resultado com justificativa detalhada",
      "Painel de gestão de provas no Dashboard do Professor com visão de todas as tentativas e recursos",
      "Admin/Professor resolve recursos com resposta e aceita/rejeita o pedido",
      "Agendamento de provas: campos available_from e available_until nos rulesets",
      "Campo grader_comment para feedback individualizado em questões dissertativas",
      "Tabela exam_appeals com RLS por papel (aluno cria, professor/admin gerencia)",
    ],
  },
  {
    version: "1.17.1",
    date: "2026-04-13",
    type: "patch" as const,
    changes: [
      "Registro dinâmico de testes (test_flow_registry): testes são auto-descobertos a partir do schema do banco, edge functions e rotas",
      "Edge function sync-test-registry escaneia tabelas, functions, buckets e rotas e atualiza o registro automaticamente",
      "Botão 'Sincronizar Testes' na UI para atualizar o registro a cada novo commit/deploy",
      "Health check agora lê testes do registro ao invés de lista hardcoded — novos componentes são testados automaticamente",
      "Log de sincronização com versão do app, testes adicionados/removidos e detalhamento por categoria",
    ],
  },
  {
    version: "1.17.0",
    date: "2026-04-13",
    type: "minor" as const,
    changes: [
      "Novo serviço de Verificação de Saúde do Sistema com testes de banco de dados, edge functions, storage e integridade de dados",
      "Monitoramento client-side automático: captura erros JS, rejeições de Promise e falhas de API em tempo real",
      "Botão 'Executar Verificação' em Configurações > Ferramentas para rodar testes sob demanda",
      "Cron job diário (4h UTC) executa verificação automaticamente e gera bug report em caso de falhas",
      "Histórico de verificações com status visual e detalhamento por categoria",
      "Tabelas system_health_checks e client_error_reports com RLS por organização",
      "Edge function run-health-check com 25+ checks distribuídos em 5 categorias",
    ],
  },
  {
    version: "1.16.0",
    date: "2026-04-13",
    type: "minor" as const,
    changes: [
      "Novo painel de gestão de usuários para ORG_ADMIN com criação, bloqueio, remoção e troca de papel/sistema",
      "ORG_ADMIN pode convidar membros diretamente para sua organização via formulário ou código de indicação",
      "Edge function manage-users atualizada com escopo restrito por org_id para ORG_ADMIN",
      "Banco de questões expandido para 50 itens distribuídos entre pilares RA, OE e AO",
      "Opção 'Conteúdo próprio' removida do formulário de nova atividade no painel do Professor",
      "Navegação e rotas atualizadas para permitir acesso de ORG_ADMIN a Configurações",
    ],
  },
  {
    version: "1.15.2",
    date: "2026-04-04",
    type: "patch" as const,
    changes: [
      "Gestão de Conteúdo (treinamentos, questões, provas, certificados) movida de /edu para /professor",
      "Catálogo EDU simplificado: sem aba de administração, foco no conteúdo do aluno",
      "AdminTrainingsPanel integrado como aba 'Gestão de Conteúdo' no ProfessorDashboard",
    ],
  },
  {
    version: "1.15.1",
    date: "2026-04-04",
    type: "patch" as const,
    changes: [
      "Tab 'Administração' renomeada para 'Gestão de Treinamento' no SISTUR EDU",
      "ORG_ADMIN agora tem acesso à aba de gestão de treinamento no catálogo EDU",
      "Nova aba 'Provas' adicionada ao painel de gestão com ExamBuilder integrado",
      "Tabs reorganizadas: Treinamentos, Questões, Provas, Certificados",
    ],
  },
  {
    version: "1.15.0",
    date: "2026-04-04",
    type: "minor" as const,
    changes: [
      "Novo papel ORG_ADMIN: administrador limitado à sua organização com acesso a treinamentos, provas e gestão EDU",
      "Certificação automática ao passar em exame (grading automático): certificado LMS gerado instantaneamente",
      "ORG_ADMIN pode acessar Gestão de Treinamentos e todas as rotas EDU sem restrição de licença",
      "Painel de gerenciamento de usuários atualizado com opção ORG_ADMIN para ERP e EDU",
      "EduRoute e sidebar atualizados para reconhecer o novo papel ORG_ADMIN",
    ],
  },
  {
    version: "1.14.4",
    date: "2026-04-02",
    type: "patch" as const,
    changes: [
      "Pré-preenchimento revisado para mostrar apenas indicadores realmente disponíveis por município",
      "Registros legados de taxa_escolarizacao automática reclassificados para o fluxo manual",
      "FAQ, metodologia e relatórios alinhados ao fluxo real das fontes oficiais",
      "Removidas promessas fixas de 17 indicadores; a contagem agora reflete a disponibilidade efetiva das bases",
    ],
  },
  {
    version: "1.14.3",
    date: "2026-04-02",
    type: "patch" as const,
    changes: [
      "Auditoria completa do catálogo de indicadores e metadados de fontes",
      "4 indicadores adicionais catalogados para futura ativação no pré-preenchimento",
      "Enum data_source expandido com INEP, DATASUS e STN para classificação precisa de fontes",
      "4 indicadores duplicados removidos (RA005, OE004, OE005, OE006) — versões igma_ são canônicas",
      "taxa_escolarizacao corrigido de AUTOMATICA para MANUAL (sem API pública disponível)",
      "PIB per capita, IDEB, cobertura saúde, leitos, receita e despesa com fontes corrigidas",
      "Flag integration_available ativada para todos os indicadores com coleta automática",
    ],
  },
  {
    version: "1.14.2",
    date: "2026-04-02",
    type: "patch" as const,
    changes: [
      "Busca IBGE removida da aba Ferramentas (funcionalidade disponível na busca de dados oficiais)",
      "Moderação de Conteúdo movida de Geral para Ferramentas (admin)",
      "Métricas de Performance movidas de Geral para Ferramentas (admin)",
    ],
  },
  {
    version: "1.14.1",
    date: "2026-04-02",
    type: "patch" as const,
    changes: [
      "Aba Ferramentas simplificada: removidos Quick Actions redundantes (links já no menu lateral)",
      "Removido Monitor de Ciclos (disponível na comparação entre rodadas do diagnóstico)",
      "Removido Monitor do Sistema (já presente em Geral > Métricas de Performance)",
      "Removido bloco Integrações de Dados (informação duplicada da aba Docs)",
      "Mantidos: Calculadora de Normalização, Simulador de Indicadores, Exportar Dados, Busca IBGE",
      "Cores dos ícones das ferramentas padronizadas com tokens do design system",
    ],
  },
  {
    version: "1.14.0",
    date: "2026-04-02",
    type: "minor" as const,
    changes: [
      "Página de Monitoramento ERP removida — funcionalidades consolidadas no Dashboard principal",
      "Dashboard com sistema de widgets personalizáveis (13 widgets disponíveis)",
      "Usuário pode ativar/desativar widgets individualmente via botão 'Personalizar'",
      "Widgets de projetos: KPIs, visão de projetos, progresso por pilar, evolução de ciclos, atrasados",
      "Preferências de widgets salvas localmente para persistência entre sessões",
      "Categorização de widgets: Visão Geral, Diagnósticos, Projetos, Capacitação",
    ],
  },
  {
    version: "1.13.5",
    date: "2026-04-01",
    type: "patch" as const,
    changes: [
      "Painel de Métricas de Performance para administradores em Configurações",
      "Monitoramento de latência, uso de banco de dados, conexões e volume de dados",
      "Alertas automáticos com recomendação de upgrade de instância quando necessário",
    ],
  },
  {
    version: "1.13.4",
    date: "2026-04-01",
    type: "patch" as const,
    changes: [
      "Monitoramento ERP refatorado: foco em Projetos (planos de ação removidos da visão principal)",
      "KPIs do ERP atualizados: Total de Projetos, Projetos Ativos, Conclusão de Tarefas, Diagnósticos",
      "Lista de planos recentes removida — projetos atrasados ocupam largura total",
      "Tutorial atualizado com Base de Conhecimento e descrição de relatórios customizáveis",
      "Metodologia atualizada com seção sobre Base de Conhecimento e Referências Globais",
      "Verificação completa de cobertura de indicadores em diagnósticos Territorial e Enterprise",
    ]
  },
  {
    version: "1.13.3",
    date: "2026-04-01",
    type: "patch" as const,
    changes: [
      "Removida opção de download Markdown dos relatórios",
      "Novo dialog de personalização de relatório: logo, cabeçalho, rodapé, cor primária, tamanho de fonte",
      "Personalização aplicada automaticamente nas exportações Word e PDF",
      "Notas adicionais opcionais incluídas como bloco final no relatório",
      "Configurações salvas localmente para reutilização entre sessões",
      "Seletor de visibilidade do relatório: Pessoal (só o criador vê) ou Organização (todos da org veem)",
      "Admins podem gerar relatórios no ambiente Demo com toggle dedicado",
      "Badges de visibilidade e ambiente no histórico de relatórios",
      "Filtro automático: relatórios pessoais aparecem apenas para o criador",
    ]
  },
  {
    version: "1.13.2",
    date: "2026-04-01",
    type: "patch" as const,
    changes: [
      "Base de Conhecimento reorganizada por destino (agrupamento visual com collapsible)",
      "Upload de arquivos agora prioriza seleção de destino (destino-first)",
      "Relatórios e diagnósticos usam automaticamente arquivos KB do destino + globais",
      "Aviso visual no diagnóstico calculado mostrando quais arquivos KB foram utilizados",
      "Coluna kb_file_ids na tabela de relatórios para rastreabilidade",
      "Removido dropdown de diagnóstico — arquivos são associados a destinos",
    ]
  },
  {
    version: "1.13.1",
    date: "2026-04-01",
    type: "patch" as const,
    changes: [
      "Nova seção 'Referências Globais' em Configurações > Ferramentas (admin only)",
      "Documentos de referência (PNT, legislação) são injetados automaticamente nos relatórios gerados por IA",
      "PNT 2024-2027 adicionado como primeiro documento de referência global",
      "Relatórios agora contextualizam indicadores com metas e diretrizes nacionais",
    ]
  },
  {
    version: "1.13.0",
    date: "2026-04-01",
    type: "minor" as const,
    changes: [
      "Nova seção 'Base de Conhecimento' no menu lateral para upload e gestão de documentos de referência",
      "Upload de PDF, DOCX, XLSX, CSV e TXT (até 20MB) com categorização e escopo (global ou por destino)",
      "Filtros por categoria, destino e busca textual para localizar arquivos rapidamente",
      "Download direto e remoção de arquivos com confirmação de segurança",
      "Bucket de armazenamento privado com RLS por organização para isolamento multi-tenant",
      "8 categorias pré-definidas: Plano Diretor, Legislação, Pesquisa, Dados Oficiais, Relatório, etc.",
      "Integração Firecrawl como fallback para descoberta de URLs do CADASTUR quando API CKAN falha",
    ]
  },
  {
    version: "1.12.2",
    date: "2026-04-01",
    type: "patch" as const,
    changes: [
      "Pipeline semi-automático CADASTUR: ingestão de CSVs de Guias e Agências de Turismo do Portal Dados Abertos",
      "Edge function ingest-cadastur com descoberta automática de URLs via API CKAN do dados.gov.br",
      "Parsing e agregação de CSV por município (código IBGE) com suporte a múltiplos delimitadores",
      "Cron job trimestral (1º dia de Jan/Abr/Jul/Out) para atualização automática dos dados CADASTUR",
      "Badge 'CADASTUR' (ciano) nos indicadores igma_guias_turismo e igma_agencias_turismo",
      "Quando dados indisponíveis no portal, sistema preserva último valor e mostra aviso ao operador",
      "Confiança de dados CADASTUR ajustada para 4/5 (dados oficiais via batch) vs 1/5 anterior (manual)",
      "Integração com fetch-official-data: CADASTUR é disparado em paralelo na busca de dados oficiais",
      "Scores formatados como porcentagem (67%) em vez de decimal (0.67) no Simulador e Diagrama de Fluxo",
    ]
  },
  {
    version: "1.12.1",
    date: "2026-04-01",
    type: "patch" as const,
    changes: [
      "Transparência de dados: removidos todos os valores fabricados (estimativas falsas) do sistema",
      "Integração IBGE expandida: 11 indicadores reais via APIs oficiais (Agregados + Pesquisas)",
      "CADASTUR: documentação clara de que a API é restrita a órgãos federais — dados são manuais",
      "Indicadores sem API pública agora aparecem como campos em branco (não mais com valores inventados)",
      "Badge 'Manual' (vermelho) substitui 'Est.' para indicadores que requerem preenchimento pelo operador",
      "Confiabilidade de dados manuais ajustada para 1/5 (anteriormente 3/5 — falsa segurança)",
      "Nova seção 'Fontes de Dados e Transparência' na página de Metodologia",
      "Relatórios agora incluem informações de proveniência dos dados (API vs Manual)",
      "Catálogo de indicadores atualizado com distinção API/Manual correta",
      "Referências bibliográficas incluem IBGE e CADASTUR como fontes oficiais"
    ]
  },
  {
    version: "1.12.0",
    date: "2026-04-01",
    type: "minor" as const,
    changes: [
      "Dashboard de progresso do diagnóstico com 5 etapas visuais (criação → projeto)",
      "Checklist de validação pré-cálculo com breakdown por pilar e indicadores faltantes",
      "Score de qualidade dos dados: completude, frescor e automação (0-100%)",
      "Comparativo entre rodadas: evolução dos pilares vs rodada anterior do mesmo destino",
      "Templates de relatório: Completo, Executivo (resumido) e Investidores (foco ROI)",
      "Exportação PDF dos relatórios via janela de impressão com formatação profissional",
      "Edge function generate-report atualizada com suporte a templates"
    ]
  },
  {
    version: "1.11.3",
    date: "2026-04-01",
    type: "patch" as const,
    changes: [
      "Fix: Motor de prescrições agora gera uma prescrição por indicador (não mais por training_id)",
      "Cobertura completa: todo indicador com score < 0.67 e mapeamento EDU recebe prescrição",
      "Regras IGMA preservadas: pilares bloqueados continuam sem prescrições",
      "Prescrições ordenadas por gravidade (score mais baixo primeiro)"
    ]
  },
  {
    version: "1.11.2",
    date: "2026-03-31",
    type: "patch" as const,
    changes: [
      "Correção: indicadores ignorados agora excluídos de gargalos, recomendações e normalização",
      "Fix: dados externos não reintroduzem indicadores marcados como ignorados no cálculo",
      "Banner de indicadores ignorados com listagem e aviso de impacto na análise",
      "Moderação de conteúdo no fórum com termômetro de restrição (admin)",
      "Suporte a até 6 imagens por post com carrossel e moderação automática via IA",
      "Guardrails no Professor Beni: respostas limitadas a temas de turismo",
      "Admin pode fixar, editar e excluir qualquer post/resposta no fórum"
    ]
  },
  {
    type: "patch" as const,
    changes: [
      "Tutorial integrado à Central de Ajuda como aba 'Tutoriais'",
      "Central de Ajuda reorganizada em 3 abas: Tutoriais, Guia Rápido e Funcionalidades",
      "Novas funcionalidades adicionadas ao mapa de ajuda: Projetos, Monitoramento ERP, Jogos, Professor Beni, Social Turismo",
      "Menu lateral atualizado: 'Ajuda & Tutorial' substitui itens separados",
      "Rota /tutorial redireciona automaticamente para /ajuda"
    ]
  },
  {
    version: "1.11.0",
    date: "2026-03-27",
    type: "minor" as const,
    changes: [
      "Tutorial detalhado com navegação passo-a-passo por tópico",
      "Cada tópico agora tem sub-passos numerados com instruções detalhadas e dicas",
      "Imagens ilustrativas geradas para passos-chave do tutorial",
      "Barra de progresso por tópico com marcação individual de conclusão",
      "Sidebar de navegação lateral nos tutoriais detalhados (desktop)",
      "Rota /tutorial/:topicId para acesso direto a qualquer tópico",
      "Cards do tutorial principal agora mostram tempo estimado e contagem de passos",
      "Seção de dicas expansível em cada passo do tutorial"
    ]
  },
  {
    version: "1.10.0",
    date: "2026-03-26",
    type: "minor" as const,
    changes: [
      "Sistema de Tutorial com conteúdo personalizado por perfil (Admin, Professor, Estudante, ERP)",
      "Wizard de primeiro acesso: aparece automaticamente após onboarding",
      "Página /tutorial permanente com categorias, progresso e marcação de etapas concluídas",
      "Admin pode visualizar tutoriais de todos os perfis via abas",
      "Item 'Tutorial' adicionado ao menu lateral (acessível para todos)",
      "Progresso do tutorial salvo localmente com indicador de percentual"
    ]
  },
  {
    version: "1.9.0",
    date: "2026-03-26",
    type: "minor" as const,
    changes: [
      "Sistema de referência professor → aluno com código único e link de convite",
      "Isenção automática de mensalidade para professor com 5+ alunos ativos",
      "Campo opcional de código de professor no onboarding de estudantes",
      "Painel do Professor com gestão de salas/turmas (CRUD completo)",
      "Turmas com nome, disciplina, período de início/fim",
      "Matrícula de alunos em salas e gestão individual",
      "Atribuição de atividades (trilhas, testes, conteúdo próprio) com prazos",
      "Nova rota /professor no sidebar para professores EDU",
      "Tabelas: professor_referral_codes, student_referrals, classrooms, classroom_students, classroom_assignments",
      "RLS policies completas com funções de segurança (owns_classroom, professor_qualifies_free_license)"
    ]
  },
  {
    version: "1.8.5",
    date: "2026-03-26",
    type: "patch" as const,
    changes: [
      "Fluxo de cancelamento de plano com motivo obrigatório e confirmação",
      "Usuários cancelam seu próprio plano mantendo acesso até o fim do período",
      "Admins podem cancelar licença de qualquer usuário via painel de gestão",
      "Estado 'Cancelado' exibido na página de Planos com mensagem informativa",
      "Licenças canceladas com data futura mantêm acesso até expiração",
      "Exclusão de usuários SISTUR das métricas de licenças externas",
      "Consistência de organizações na aba Cotas por Organização",
      "Correção RLS para ativação de trial por usuários não-admin"
    ]
  },
  {
    version: "1.8.4",
    date: "2026-03-25",
    type: "patch" as const,
    changes: [
      "Auto-expiração de trials via cron job diário (3h UTC)",
      "Notificações in-app de expiração do trial (3 dias, 1 dia, expirado)",
      "Bloqueio visual de funcionalidades restritas no menu (ícone de cadeado)",
      "Relatórios bloqueados para plano trial com redirecionamento para Planos",
      "Novo painel admin 'Controle de Trials' com métricas e funil de conversão",
      "Lista de trials recentes com status visual (saudável, atenção, crítico, expirado)"
    ]
  },
  {
    version: "1.8.3",
    date: "2026-03-25",
    type: "patch" as const,
    changes: [
      "Menu mobile agora exibe a opção Planos para usuários como Renata",
      "Correção do preload para Safari/iPhone sem requestIdleCallback",
      "Fluxo Autônomo restaurado ao remover licença indevida da Renata",
      "Renata volta a ser redirecionada para Planos com opção de ativar trial"
    ]
  },
  {
    version: "1.8.2",
    date: "2026-03-25",
    type: "patch" as const,
    changes: [
      "Metodologia oculta do menu para usuários não-admin",
      "Renomeado 'Assinatura' para 'Planos' no menu e comunicações",
      "Página de Planos com explicação detalhada do trial para novos usuários",
      "Admin pode estender duração do trial na gestão de licenças",
      "Correção do fluxo Autônomo: termos → planos → ativação trial"
    ]
  },
  {
    version: "1.8.1",
    date: "2026-03-25",
    type: "patch" as const,
    changes: [
      "E-mail automático de notificação quando o acesso do usuário é aprovado",
      "Infraestrutura de e-mail transacional com fila durável e retries",
      "Página de cancelamento de inscrição (/unsubscribe)",
      "Template de e-mail com identidade visual do Instituto Mario Beni"
    ]
  },
  {
    version: "1.8.0",
    date: "2026-03-25",
    type: "minor" as const,
    changes: [
      "Sistema de Licenciamento completo (trial, estudante, professor, basic, pro, enterprise)",
      "Termos e condições obrigatórios na primeira utilização",
      "Exportação CSV de usuários com status, licença, termos e acessos",
      "Auditoria e correção de dados: licenças criadas para 15 usuários pendentes",
      "Otimização de performance: QueryClient com staleTime/gcTime, useMemo em contexts",
      "Planos de assinatura EDU (Estudante R$19, Professor R$39) na página de assinatura",
      "Coluna de aceite de termos no gerenciamento de usuários"
    ]
  },
  {
    version: "1.7.16",
    date: "2026-01-23",
    type: "patch" as const,
    changes: [
      "Fix: Recomendações agora buscam treinamentos de edu_trainings via training_id",
      "RecommendationCard exibe título, descrição e duração do modelo unificado",
      "Tipos Recommendation e Prescription atualizados com training_id e training",
      "Fallback para legacy courses mantido para compatibilidade"
    ]
  },
  {
    version: "1.7.15",
    date: "2026-01-23",
    type: "patch" as const,
    changes: [
      "Fix: Issues Enterprise agora mostram nome da categoria (não UUID)",
      "Coluna training_id (TEXT) adicionada em prescriptions e recommendations",
      "Edge function calculate-assessment usa enterpriseCategoryMap para nomes legíveis"
    ]
  },
  {
    version: "1.7.14",
    date: "2026-01-23",
    type: "patch" as const,
    changes: [
      "Correção de 37 mapeamentos EDU órfãos - códigos de indicadores sincronizados",
      "Total de mapeamentos EDU válidos: 94 (anteriormente 60)",
      "6 indicadores agora com escopo 'ambos': NPS, Reviews, Treinamento, Emprego Local, Compras Locais, Certificações",
      "Edge function calculate-assessment corrige nomes de categoria Enterprise nas issues",
      "Documentação atualizada com catálogo unificado e indicadores compartilhados"
    ]
  },
  {
    version: "1.7.13",
    date: "2026-01-23",
    type: "patch" as const,
    changes: [
      "Filtro de Escopo (Territorial/Enterprise/Ambos) no painel de Indicadores",
      "Relatório de distribuição de indicadores por Escopo × Pilar × Tier",
      "Gráficos de barras e pizza para visualização da distribuição",
      "Matriz detalhada com contagem de indicadores por combinação",
      "Botão 'Novo Indicador' funcional com formulário completo de cadastro"
    ]
  },
  {
    version: "1.7.12",
    date: "2026-01-23",
    type: "patch" as const,
    changes: [
      "Debug logging para investigar toggle Enterprise no Dashboard",
      "Verificação de has_enterprise_access nas organizações SISTUR e Demo"
    ]
  },
  {
    version: "1.7.11",
    date: "2026-01-23",
    type: "patch" as const,
    changes: [
      "Dashboard principal com toggle Territorial/Enterprise unificado",
      "KPIs Enterprise no Dashboard: RevPAR, NPS, Taxa Ocupação, Certificações ESG",
      "Novo hook useEnterpriseDashboardData para métricas hoteleiras",
      "Componente EnterpriseKPICards com 8 métricas visuais",
      "Filtro de destinos adaptativo por tipo de diagnóstico"
    ]
  },
  {
    version: "1.7.10",
    date: "2026-01-23",
    type: "patch" as const,
    changes: [
      "Adicionado filtro de escopo (Territorial/Enterprise/Ambos) na página de Indicadores",
      "Dashboard ERP atualizado com toggle Territorial/Enterprise para segregar dados",
      "Hooks usePillarProgress e useCycleEvolution agora filtram por diagnostic_type",
      "Badges de escopo visíveis e editáveis inline na tabela de indicadores"
    ]
  },
  {
    version: "1.7.7",
    date: "2026-01-23",
    type: "patch" as const,
    changes: [
      "Criada tabela enterprise_indicator_scores para armazenar scores normalizados",
      "Edge function calculate-assessment insere scores na tabela correta por tipo",
      "Hooks useIndicatorScores e useEnterpriseIndicatorValuesForAssessment unificados",
      "DiagnosticoDetalhe detecta diagnostic_type e busca dados da fonte correta",
      "NormalizationView e IndicatorScoresView agora funcionam para diagnósticos Enterprise"
    ]
  },
  {
    version: "1.7.6",
    date: "2026-01-23",
    type: "patch" as const,
    changes: [
      "Indicadores agora mostram escopo: Territorial, Enterprise ou Ambos",
      "Nova coluna 'Escopo' na tabela de indicadores com badges coloridos",
      "Organizações com dois toggles independentes: Territorial e Enterprise",
      "Ambos os acessos podem ser habilitados simultaneamente",
      "UI da tabela de organizações mostra badges de acessos habilitados"
    ]
  },
  {
    version: "1.7.5",
    date: "2026-01-23",
    type: "patch" as const,
    changes: [
      "Demo Mode agora tem acesso Enterprise habilitado",
      "Diagnóstico demo Enterprise criado (Hotel Gramado 2026) com 25 indicadores",
      "Mapeamento de 23 indicadores Enterprise para treinamentos EDU",
      "Edge function calculate-assessment suporta diagnostic_type = 'enterprise'",
      "Cálculo IGMA unificado para diagnósticos territoriais e enterprise"
    ]
  },
  {
    version: "1.7.4",
    date: "2026-01-23",
    type: "patch" as const,
    changes: [
      "Documentação atualizada com módulo Enterprise",
      "FAQ inclui perguntas sobre Enterprise, org_type e indicadores hoteleiros",
      "Ajuda inclui guia rápido e seções Enterprise para admins",
      "Metodologia documenta categorias Enterprise e mapeamento aos 3 pilares"
    ]
  },
  {
    version: "1.7.1",
    date: "2026-01-23",
    type: "patch" as const,
    changes: [
      "UI de Organizações com seletor de tipo (Pública/Privada)",
      "Toggle de Acesso Enterprise por organização",
      "Tabela de organizações exibe tipo e badge Enterprise",
      "Ícones diferenciados: Landmark (pública) vs Hotel (privada)"
    ]
  },
  {
    version: "1.7.0",
    date: "2026-01-23",
    type: "minor" as const,
    changes: [
      "Novo módulo SISTUR Enterprise para setor privado (hotéis, resorts, pousadas)",
      "Classificação de organizações: PUBLIC (governo/município) vs PRIVATE (empresas)",
      "26 indicadores enterprise baseados na metodologia Mario Beni",
      "15 categorias de indicadores: sustentabilidade, governança, operações",
      "Benchmarks e metas por indicador (ex: RevPAR, NPS, Taxa de Ocupação)",
      "Tiers adaptados para contexto enterprise (Essencial, Estratégico, Integral)"
    ]
  },
  {
    version: "1.6.0",
    date: "2026-01-23",
    type: "minor" as const,
    changes: [
      "Unificação do motor de recomendações EDU com modelo canônico",
      "Prescrições agora usam edu_trainings via edu_indicator_training_map",
      "Justificativas dinâmicas com reason_template por indicador",
      "Nomenclatura corrigida: I-RA, I-OE, I-AO na página de autenticação",
      "Fallback para courses legado mantido para compatibilidade"
    ]
  },
  {
    version: "1.5.5",
    date: "2026-01-16",
    type: "patch" as const,
    changes: [
      "Indicadores movido para dentro de Diagnósticos como aba",
      "Menu lateral simplificado - Indicadores removido",
      "Novo componente IndicadoresPanel reutilizável"
    ]
  },
  {
    version: "1.5.4",
    date: "2026-01-16",
    type: "patch" as const,
    changes: [
      "Correção do YouTube player para preencher 100% do frame",
      "Iframe e container interno forçados a ocupar largura/altura completas"
    ]
  },
  {
    version: "1.5.3",
    date: "2026-01-16",
    type: "patch" as const,
    changes: [
      "Novo YouTubePlayer com API IFrame para controle total",
      "Controles customizados abaixo do vídeo (play, seek, volume)",
      "Overlay completo bloqueia clique-direito e interações com YouTube",
      "Clique no vídeo para play/pause funciona normalmente"
    ]
  },
  {
    version: "1.5.2",
    date: "2026-01-16",
    type: "patch" as const,
    changes: [
      "Iframe do YouTube reposicionado com crop para esconder UI nativa",
      "Overlays sólidos no topo e rodapé cobrem título, logo, Share e Watch on YouTube",
      "Bordas pretas nas laterais para esconder elementos cortados",
      "Bloqueio de clique nas áreas de overlay"
    ]
  },
  {
    version: "1.5.1",
    date: "2026-01-16",
    type: "patch" as const,
    changes: [
      "YouTube embed usa domínio privado (youtube-nocookie.com)",
      "Overlay esconde botões 'Watch on YouTube' e 'Share'",
      "Parâmetros modestbranding e rel=0 para reduzir branding",
      "Bloqueio de clique-direito no iframe do YouTube/Vimeo",
      "Vimeo embed com title/byline/badge ocultos"
    ]
  },
  {
    version: "1.5.0",
    date: "2026-01-16",
    type: "minor" as const,
    changes: [
      "Proteção de vídeos com URLs assinadas temporárias (5 min de expiração)",
      "Novo hook useSecureVideoUrl para acesso seguro ao storage",
      "Auto-refresh de URLs antes da expiração",
      "Bloqueio de clique-direito no player de vídeo",
      "Mensagens de erro e loading states aprimorados no VideoPlayer"
    ]
  },
  {
    version: "1.4.0",
    date: "2026-01-16",
    type: "minor" as const,
    changes: [
      "Otimização de navegação do sidebar - elimina 'piscar' ao trocar de página",
      "Novo ProfileContext centralizado para cache de perfil",
      "Melhoria de performance com useMemo nos componentes de navegação",
      "Transições mais suaves entre rotas protegidas"
    ]
  },
  {
    version: "1.3.0",
    date: "2026-01-16",
    type: "minor" as const,
    changes: [
      "Tradução completa da interface para português",
      "Metodologia 'Waterfall' renomeada para 'Cascata'",
      "Descrições de projetos traduzidas para português",
      "Melhorias gerais de localização e terminologia"
    ]
  },
  {
    version: "1.1.0",
    date: "2025-01-16",
    type: "minor" as const,
    changes: [
      "Adicionado escopo de visibilidade em Nova Rodada (Organização ou Pessoal)",
      "Destinos e diagnósticos podem ser compartilhados com a organização ou mantidos privados",
      "RLS policies atualizadas para respeitar visibilidade"
    ]
  },
  {
    version: "1.0.0",
    date: "2025-01-15",
    type: "major" as const,
    changes: [
      "Lançamento inicial do SISTUR",
      "Módulo de Diagnósticos com cálculo IGMA",
      "Módulo EDU com trilhas e treinamentos",
      "Sistema de certificação de destinos",
      "Integração ERP para gestores públicos",
      "Perfil de estudante com recomendações personalizadas"
    ]
  }
];

export type VersionChangeType = "major" | "minor" | "patch";

export interface VersionEntry {
  version: string;
  date: string;
  type: VersionChangeType;
  changes: string[];
}
