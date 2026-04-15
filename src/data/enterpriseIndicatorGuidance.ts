/**
 * Guidance data for Enterprise indicators — explains what each metric measures,
 * how to find the data, and validation rules.
 */

export interface IndicatorGuidance {
  /** Short human-readable tip on how to obtain this value */
  howToFind: string;
  /** Examples of acceptable values */
  examples?: string;
  /** Validation constraints */
  validation?: {
    min?: number;
    max?: number;
    integer?: boolean;
  };
}

/**
 * Maps indicator codes to guidance. Covers all ENT_* indicators plus
 * common territorial ones that benefit from hints.
 */
export const INDICATOR_GUIDANCE: Record<string, IndicatorGuidance> = {
  // ── Enterprise: Compliance & Regulatório ──
  ENT_COMPLIANCE: {
    howToFind:
      'Liste todas as regulamentações aplicáveis (Vigilância Sanitária, ABNT NBR 15401, Corpo de Bombeiros, Acessibilidade, LGPD) e calcule: (itens conformes ÷ total de itens) × 100.',
    examples: 'Hotel com 18 de 20 itens conformes = 90%',
    validation: { min: 0, max: 100 },
  },
  ENT_LEGAL_DOCS: {
    howToFind:
      'Conte os documentos legais ativos: Alvará, CNPJ, CADASTUR, licenças ambientais, certificados de segurança. Verifique na pasta de documentação da empresa.',
    examples: '5 documentos válidos',
    validation: { min: 0, integer: true },
  },

  // ── Enterprise: Distribuição & Comercialização ──
  ENT_PARCERIAS: {
    howToFind:
      'Conte os canais de venda ativos: OTAs (Booking, Expedia, Decolar), agências de viagem parceiras, GDS (Amadeus, Sabre), site próprio com motor de reservas, redes sociais com link de reserva, centrais de atendimento, marketplaces locais.',
    examples: 'Booking + Expedia + site próprio + 3 agências + Instagram = 7 canais',
    validation: { min: 0, max: 50, integer: true },
  },
  ENT_DIRECT_REVENUE: {
    howToFind:
      'Calcule: (receita de reservas diretas ÷ receita total de hospedagem) × 100. Consulte seu PMS (Property Management System) ou relatórios financeiros.',
    examples: 'R$ 150k direto de R$ 500k total = 30%',
    validation: { min: 0, max: 100 },
  },

  // ── Enterprise: Reputação Online ──
  ENT_REVIEW_SCORE: {
    howToFind:
      'Use a ferramenta "Busca Automática de Reviews Online" acima para preencher automaticamente. Ou consulte manualmente Google Maps, TripAdvisor e Booking e calcule a média ponderada dos scores.',
    examples: 'Google 4.3 + TripAdvisor 4.5 + Booking 8.6 → média ~4.3',
    validation: { min: 0, max: 5 },
  },
  ENT_REVIEW_VOL: {
    howToFind:
      'Some o total de avaliações em todas as plataformas: Google Maps + TripAdvisor + Booking + Expedia. A "Busca Automática" também pode calcular isso.',
    examples: '350 (Google) + 120 (TA) + 80 (Booking) = 550',
    validation: { min: 0, integer: true },
  },
  ENT_RESPONSE_RATE: {
    howToFind:
      'Nos painéis de cada plataforma (Google Business, TripAdvisor Management Center), veja o % de avaliações respondidas pela gerência.',
    examples: '85% de reviews respondidos',
    validation: { min: 0, max: 100 },
  },

  // ── Enterprise: Operações & Financeiro ──
  ENT_OCCUPANCY: {
    howToFind:
      'Consulte seu PMS: (quartos vendidos ÷ quartos disponíveis) × 100, no período analisado. Considere a média dos últimos 12 meses.',
    examples: '72% de ocupação anual média',
    validation: { min: 0, max: 100 },
  },
  ENT_ADR: {
    howToFind:
      'Do PMS ou relatório financeiro: receita de hospedagem ÷ número de diárias vendidas. Use o período dos últimos 12 meses.',
    examples: 'R$ 450.000 ÷ 1.200 diárias = R$ 375,00',
    validation: { min: 0 },
  },
  ENT_REVPAR: {
    howToFind:
      'ADR × taxa de ocupação, ou receita total ÷ quartos disponíveis. O PMS geralmente calcula automaticamente.',
    examples: 'R$ 375 × 0,72 = R$ 270,00',
    validation: { min: 0 },
  },
  ENT_GOPPAR: {
    howToFind:
      'Lucro operacional bruto ÷ quartos disponíveis no período. Consulte a DRE (Demonstração do Resultado do Exercício).',
    examples: 'R$ 180,00 por quarto disponível',
    validation: { min: 0 },
  },
  ENT_TREVPAR: {
    howToFind:
      'Receita total (hospedagem + A&B + eventos + spa + outros) ÷ quartos disponíveis.',
    examples: 'R$ 520,00 por quarto disponível',
    validation: { min: 0 },
  },
  ENT_SEASONALITY: {
    howToFind:
      'Calcule a variação entre alta e baixa temporada: ((ocupação alta - ocupação baixa) ÷ ocupação média) × 100.',
    examples: 'Alta 95%, baixa 40%, média 67% → variação ≈ 82%',
    validation: { min: 0, max: 200 },
  },

  // ── Enterprise: RH & Capacitação ──
  ENT_STAFF_RATIO: {
    howToFind:
      'Número total de funcionários ÷ número de quartos (UHs). Inclua efetivos e terceirizados.',
    examples: '60 funcionários / 80 quartos = 0,75',
    validation: { min: 0 },
  },
  ENT_TURNOVER: {
    howToFind:
      'Do RH: (desligamentos no período ÷ média de funcionários) × 100. Considere os últimos 12 meses.',
    examples: '15 desligamentos / 60 média = 25%',
    validation: { min: 0, max: 200 },
  },
  ENT_TRAINING_HOURS: {
    howToFind:
      'Total de horas de treinamento realizadas ÷ número de funcionários no período. Inclua cursos internos, externos e online.',
    examples: '480 horas / 60 funcionários = 8h por colaborador',
    validation: { min: 0 },
  },
  ENT_NPS: {
    howToFind:
      'Aplique pesquisa NPS: (% Promotores - % Detratores). Use formulários pós-estadia ou plataformas como Medallia, Revinate.',
    examples: '65% promotores - 10% detratores = NPS 55',
    validation: { min: -100, max: 100 },
  },

  // ── Enterprise: Sustentabilidade ──
  ENT_ENERGY: {
    howToFind:
      'Total de kWh consumidos ÷ número de pernoites. Consulte faturas de energia e relatório de ocupação.',
    examples: '45.000 kWh / 10.000 pernoites = 4,5 kWh/pernoite',
    validation: { min: 0 },
  },
  ENT_WATER: {
    howToFind:
      'Total de litros ou m³ consumidos ÷ número de pernoites. Consulte faturas da concessionária de água.',
    examples: '3.000 m³ / 10.000 pernoites = 300 L/pernoite',
    validation: { min: 0 },
  },
  ENT_WASTE: {
    howToFind:
      'Peso total de resíduos (kg) ÷ número de pernoites. Solicite relatório à empresa de coleta ou pese internamente.',
    examples: '5.000 kg / 10.000 pernoites = 0,5 kg/pernoite',
    validation: { min: 0 },
  },
  ENT_RECYCLE_RATE: {
    howToFind:
      '(Resíduos reciclados ÷ total de resíduos) × 100. Verifique com a empresa de coleta seletiva.',
    examples: '1.500 kg reciclados / 5.000 kg total = 30%',
    validation: { min: 0, max: 100 },
  },
  ENT_CARBON: {
    howToFind:
      'Use calculadoras de pegada de carbono (GHG Protocol, CBCS) considerando energia, combustível, gases refrigerantes. Divida pelo total de pernoites.',
    examples: '25 kgCO₂e por pernoite',
    validation: { min: 0 },
  },

  // ── Enterprise: Tecnologia & Digital ──
  ENT_TECH_SCORE: {
    howToFind:
      'Use a "Busca Automática de Reviews Online" para avaliação automática. Ou pontue de 0-10: presença em OTAs, site responsivo, motor de reservas, redes sociais ativas, Wi-Fi, PMS integrado.',
    examples: 'Site + Motor + 3 OTAs + PMS + Wi-Fi = 7/10',
    validation: { min: 0, max: 10 },
  },
  ENT_DIGITAL_CHECKIN: {
    howToFind:
      '(Check-ins realizados digitalmente ÷ total de check-ins) × 100. Consulte seu PMS ou sistema de check-in online.',
    examples: '400 digitais / 1.200 total = 33%',
    validation: { min: 0, max: 100 },
  },

  // ── Enterprise: Acessibilidade ──
  ENT_ACCESSIBLE_ROOMS: {
    howToFind:
      '(Quartos adaptados ÷ total de quartos) × 100. Considere quartos com barras, portas largas, banheiro adaptado conforme ABNT NBR 9050.',
    examples: '6 quartos adaptados / 80 total = 7,5%',
    validation: { min: 0, max: 100 },
  },

  // ── Enterprise: Satisfação ──
  ENT_GUEST_SATISFACTION: {
    howToFind:
      'Média das pesquisas de satisfação internas (escala 0-10). Use formulários pós-estadia, QR codes no quarto, ou plataformas como ReviewPro.',
    examples: '8.2 na média geral de satisfação',
    validation: { min: 0, max: 10 },
  },
  ENT_REPEAT_GUEST: {
    howToFind:
      '(Hóspedes que já se hospedaram antes ÷ total de hóspedes únicos) × 100. Consulte o CRM ou histórico do PMS.',
    examples: '800 recorrentes / 3.000 únicos = 26,7%',
    validation: { min: 0, max: 100 },
  },
  // ── Territorial: Saneamento & Infraestrutura ──
  RA_AGUA_TRATADA: {
    howToFind:
      'Consulte o SNIS (Sistema Nacional de Informações sobre Saneamento) ou a concessionária local. Dado disponível via IBGE/SIDRA (Censo).',
    examples: '92% da população atendida',
    validation: { min: 0, max: 100 },
  },
  RA_ESGOTO: {
    howToFind:
      'Verifique no SNIS ou Atlas Esgotos da ANA. % de domicílios com coleta de esgoto adequada.',
    examples: '65% de cobertura',
    validation: { min: 0, max: 100 },
  },
  RA_LIXO_COLETADO: {
    howToFind:
      'Consulte dados do IBGE/SIDRA (Censo Demográfico) ou a prefeitura. % de domicílios com coleta regular de lixo.',
    examples: '97% dos domicílios atendidos',
    validation: { min: 0, max: 100 },
  },
  RA_AREAS_PROTEGIDAS: {
    howToFind:
      'Consulte o ICMBio ou a Secretaria de Meio Ambiente local. Área de unidades de conservação ÷ área total do município × 100.',
    examples: '12% do território em áreas protegidas',
    validation: { min: 0, max: 100 },
  },
  RA_DESMATAMENTO: {
    howToFind:
      'Dados do INPE (PRODES/DETER) ou MapBiomas. Taxa de desmatamento no município em km²/ano.',
    examples: '2,5 km²/ano',
    validation: { min: 0 },
  },

  // ── Territorial: Educação ──
  OE_IDEB: {
    howToFind:
      'Consulte o portal do INEP (ideb.inep.gov.br). Busque pelo nome do município e selecione anos iniciais ou finais.',
    examples: '5,8 (anos iniciais) / 4,9 (anos finais)',
    validation: { min: 0, max: 10 },
  },
  OE_ESCOLARIDADE: {
    howToFind:
      'Dados do IBGE (Censo ou PNAD Contínua). % da população com ensino médio completo ou superior.',
    examples: '45% com ensino médio completo',
    validation: { min: 0, max: 100 },
  },

  // ── Territorial: Saúde ──
  RA_MORTALIDADE_INFANTIL: {
    howToFind:
      'Consulte o DATASUS (TabNet) ou a Secretaria de Saúde. Óbitos de menores de 1 ano ÷ nascidos vivos × 1.000.',
    examples: '12,5 por mil nascidos vivos',
    validation: { min: 0 },
  },
  RA_LEITOS: {
    howToFind:
      'DATASUS/CNES: total de leitos hospitalares no município ÷ população × 1.000.',
    examples: '2,3 leitos por 1.000 habitantes',
    validation: { min: 0 },
  },

  // ── Territorial: Economia & Turismo ──
  OE_PIB_PER_CAPITA: {
    howToFind:
      'Consulte o IBGE (Produto Interno Bruto dos Municípios). PIB municipal ÷ população estimada.',
    examples: 'R$ 32.500,00 per capita',
    validation: { min: 0 },
  },
  OE_EMPREGOS_TURISMO: {
    howToFind:
      'Dados da RAIS/CAGED (Ministério do Trabalho). Filtre por CNAEs de turismo (55, 56, 79, 91, 93).',
    examples: '1.250 empregos formais em turismo',
    validation: { min: 0, integer: true },
  },
  AO_RECEITA_TURISMO: {
    howToFind:
      'Estimativa da Secretaria de Turismo ou estudos de demanda. Receita total gerada por visitantes no período.',
    examples: 'R$ 45 milhões/ano',
    validation: { min: 0 },
  },

  // ── Territorial: Governança ──
  AO_PLANO_TURISMO: {
    howToFind:
      'Verifique se o município possui Plano Municipal de Turismo vigente. Consulte a Secretaria de Turismo ou o Diário Oficial.',
    examples: 'Sim (1) ou Não (0)',
  },
  AO_CONSELHO_TURISMO: {
    howToFind:
      'Verifique se existe Conselho Municipal de Turismo ativo (COMTUR). Consulte a Secretaria de Turismo ou legislação municipal.',
    examples: 'Sim (1) ou Não (0)',
  },
  AO_FUNDO_TURISMO: {
    howToFind:
      'Verifique se o município possui Fundo Municipal de Turismo (FUMTUR) instituído por lei.',
    examples: 'Sim (1) ou Não (0)',
  },

  // ── Territorial: IGMA / Mapa do Turismo ──
  igma_categoria_mapa_turismo: {
    howToFind:
      'Consulte o Mapa do Turismo Brasileiro (MTur). O município é classificado de A (mais desenvolvido) a E (menos desenvolvido).',
    examples: 'Categoria B',
  },
  igma_regiao_turistica: {
    howToFind:
      'Verifique se o município pertence a alguma Região Turística no Mapa do Turismo Brasileiro do MTur.',
    examples: 'Sim (1) ou Não (0)',
  },
  igma_conselho_municipal_turismo: {
    howToFind:
      'Dado do IBGE (Pesquisa de Informações Básicas Municipais - MUNIC). Existência de conselho municipal de turismo.',
    examples: 'Sim (1) ou Não (0)',
  },

  // ── Territorial: Finanças Públicas ──
  OE_RECEITA_PROPRIA: {
    howToFind:
      'Consulte o STN (Tesouro Nacional) via FINBRA/SICONFI. Receita tributária própria ÷ receita total × 100.',
    examples: '35% de receita própria',
    validation: { min: 0, max: 100 },
  },
  OE_DESPESA_TURISMO: {
    howToFind:
      'SICONFI/STN: Despesas na função "Turismo" (código 23) no orçamento municipal.',
    examples: 'R$ 1.200.000,00',
    validation: { min: 0 },
  },

  // ── Territorial: Segurança ──
  RA_CRIMINALIDADE: {
    howToFind:
      'Consulte a Secretaria de Segurança Pública estadual. Taxa de crimes por 100 mil habitantes.',
    examples: '15,2 por 100 mil hab.',
    validation: { min: 0 },
  },

  // ── Territorial: CADASTUR ──
  AO_CADASTUR_GUIAS: {
    howToFind:
      'Dados do CADASTUR (MTur). Número de guias de turismo cadastrados no município. O sistema busca automaticamente.',
    examples: '23 guias cadastrados',
    validation: { min: 0, integer: true },
  },
  AO_CADASTUR_AGENCIAS: {
    howToFind:
      'Dados do CADASTUR (MTur). Número de agências de turismo cadastradas no município. O sistema busca automaticamente.',
    examples: '8 agências cadastradas',
    validation: { min: 0, integer: true },
  },
};

/**
 * Returns validation rules for a given indicator based on its unit and code.
 * Falls back to sensible defaults when no specific guidance exists.
 */
export function getValidationForIndicator(indicator: {
  code: string;
  unit?: string;
  direction?: string;
  min_ref?: number | null;
  max_ref?: number | null;
}): { min?: number; max?: number; integer?: boolean } {
  // Check specific guidance first
  const guidance = INDICATOR_GUIDANCE[indicator.code];
  if (guidance?.validation) return guidance.validation;

  // Infer from unit
  const unit = (indicator.unit || '').toLowerCase().trim();
  if (unit === '%' || unit === 'pct' || unit === 'percent') {
    return { min: 0, max: 100 };
  }
  if (unit === 'r$' || unit === 'brl' || unit.includes('reais')) {
    return { min: 0 };
  }
  if (unit === 'hab' || unit === 'un' || unit === 'unidades' || unit === 'qtd') {
    return { min: 0, integer: true };
  }

  // Default: no negatives for most indicators
  return { min: 0 };
}

/**
 * Formats a numeric value for display using Brazilian locale (pt-BR),
 * choosing the right number of decimal places based on indicator context.
 *  - Integer indicators (hab, un, qtd, etc.) → no decimals, thousands separator with dot
 *  - Percentage indicators → up to 1 decimal place
 *  - Currency (R$) → 2 decimal places
 *  - Other decimals → up to 2 decimal places (trims trailing zeros)
 */
export function formatIndicatorValueBR(
  value: number | null | undefined,
  indicator?: { code?: string; unit?: string; direction?: string; min_ref?: number | null; max_ref?: number | null },
): string {
  if (value === null || value === undefined) return '';

  const rules = indicator ? getValidationForIndicator(indicator as any) : {};
  const unit = (indicator?.unit || '').toLowerCase().trim();

  // Integer indicators — no decimals
  if (rules.integer || unit === 'hab' || unit === 'un' || unit === 'unidades' || unit === 'qtd') {
    return Math.round(value).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
  }

  // Currency — always 2 decimals
  if (unit === 'r$' || unit === 'brl' || unit.includes('reais')) {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // Percentage — up to 1 decimal
  if (unit === '%' || unit === 'pct' || unit === 'percent') {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
  }

  // Default — up to 2 decimals
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

/**
 * Validates a raw string value against indicator rules.
 * Returns null if valid, or an error message string.
 */
export function validateIndicatorValue(
  rawValue: string,
  indicator: { code: string; unit?: string; direction?: string; min_ref?: number | null; max_ref?: number | null }
): string | null {
  if (!rawValue || rawValue.trim() === '') return null; // empty is OK (not filled yet)

  // Must be a valid number
  const num = Number(rawValue);
  if (isNaN(num)) return 'Valor deve ser numérico';

  const rules = getValidationForIndicator(indicator);

  if (rules.integer && !Number.isInteger(num)) {
    return 'Valor deve ser um número inteiro';
  }
  if (rules.min !== undefined && num < rules.min) {
    return `Valor mínimo permitido: ${rules.min}`;
  }
  if (rules.max !== undefined && num > rules.max) {
    return `Valor máximo permitido: ${rules.max}`;
  }

  return null;
}
