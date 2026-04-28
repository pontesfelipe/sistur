/**
 * Constantes e estilos compartilhados para documentos .docx em conformidade
 * com as normas MEC / ABNT (NBR 14724, 6024, 6023, 10520).
 *
 * Regras aplicadas:
 *  - Papel A4 (210 x 297 mm)
 *  - Margens: superior 3cm, inferior 2cm, esquerda 3cm, direita 2cm
 *  - Fonte: Arial 12pt no corpo / 14pt nos títulos
 *  - Entrelinha 1,5 (LINE_SPACING = 360 twips)
 *  - Recuo de primeira linha: 1,25cm
 *  - Cor preta nos títulos e corpo (sem cores institucionais nos títulos)
 *  - Numeração de páginas no rodapé direito, algarismos arábicos
 */

// 1cm ≈ 567 DXA (twips)
export const CM = 567;

export const ABNT = {
  // Página A4
  PAGE_WIDTH: 11906,
  PAGE_HEIGHT: 16838,
  // Margens (twips)
  MARGIN_TOP: Math.round(3 * CM),
  MARGIN_BOTTOM: Math.round(2 * CM),
  MARGIN_LEFT: Math.round(3 * CM),
  MARGIN_RIGHT: Math.round(2 * CM),
  // Tipografia (half-points: 24 = 12pt)
  FONT: 'Arial',
  BODY_SIZE: 24,    // 12 pt
  H1_SIZE: 28,      // 14 pt
  H2_SIZE: 26,      // 13 pt
  H3_SIZE: 24,      // 12 pt
  SMALL_SIZE: 20,   // 10 pt — citações longas, fontes, rodapés
  // Espaçamento
  LINE_SPACING: 360,            // 1,5 entrelinha
  LINE_SPACING_SINGLE: 240,     // 1,0 entrelinha (fontes/citações)
  FIRST_LINE_INDENT: Math.round(1.25 * CM),
  LONG_QUOTE_INDENT: Math.round(4 * CM),
  // Cores (ABNT recomenda preto para títulos e corpo)
  COLOR_TEXT: '000000',
  COLOR_BORDER: '000000',
  COLOR_MUTED: '333333',
} as const;

export const ABNT_PAGE_PROPS = {
  page: {
    size: { width: ABNT.PAGE_WIDTH, height: ABNT.PAGE_HEIGHT },
    margin: {
      top: ABNT.MARGIN_TOP,
      bottom: ABNT.MARGIN_BOTTOM,
      left: ABNT.MARGIN_LEFT,
      right: ABNT.MARGIN_RIGHT,
    },
  },
} as const;

export const ABNT_DEFAULT_STYLES = {
  default: {
    document: {
      run: { font: ABNT.FONT, size: ABNT.BODY_SIZE, color: ABNT.COLOR_TEXT },
      paragraph: { spacing: { line: ABNT.LINE_SPACING } },
    },
  },
};

/** Conteúdo útil disponível na página (largura entre margens) */
export const ABNT_CONTENT_WIDTH =
  ABNT.PAGE_WIDTH - ABNT.MARGIN_LEFT - ABNT.MARGIN_RIGHT;