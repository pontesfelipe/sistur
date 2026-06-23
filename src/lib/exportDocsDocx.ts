/**
 * Export Metodologia ou FAQ como .docx em conformidade com normas MEC / ABNT
 * (NBR 14724, 6024, 6023). Veja src/lib/abntStyle.ts para constantes.
 */
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  WidthType,
  ShadingType,
  Header,
  Footer,
  PageNumber,
  LevelFormat,
} from 'docx';
import { saveAs } from 'file-saver';
import { ABNT, ABNT_PAGE_PROPS, ABNT_DEFAULT_STYLES } from './abntStyle';

const BORDER_COLOR = ABNT.COLOR_BORDER;
const HEADER_BG = 'EFEFEF';
const MUTED = ABNT.COLOR_MUTED;
const FONT = ABNT.FONT;

function cellBorders() {
  const b = { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR };
  return { top: b, bottom: b, left: b, right: b };
}

function heading(text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel]) {
  const isH1 = level === HeadingLevel.HEADING_1;
  return new Paragraph({
    heading: level,
    alignment: AlignmentType.LEFT,
    spacing: { before: 360, after: 200, line: ABNT.LINE_SPACING },
    children: [new TextRun({
      text: isH1 ? text.toUpperCase() : text,
      bold: true,
      font: FONT,
      color: ABNT.COLOR_TEXT,
    })],
  });
}

function para(text: string, opts?: { bold?: boolean; italic?: boolean; color?: string }) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    indent: { firstLine: ABNT.FIRST_LINE_INDENT },
    spacing: { after: 0, line: ABNT.LINE_SPACING },
    children: [
      new TextRun({
        text,
        font: FONT,
        size: ABNT.BODY_SIZE,
        bold: opts?.bold,
        italics: opts?.italic,
        color: opts?.color ?? ABNT.COLOR_TEXT,
      }),
    ],
  });
}

function bullet(text: string, ref: string, level = 0) {
  return new Paragraph({
    numbering: { reference: ref, level },
    spacing: { after: 60, line: ABNT.LINE_SPACING },
    children: [new TextRun({ text, font: FONT, size: ABNT.BODY_SIZE })],
  });
}

function buildAndSave(opts: {
  filename: string;
  headerLabel: string;
  title: string;
  subtitle?: string;
  body: Paragraph[];
}) {
  const children: Paragraph[] = [
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400, line: ABNT.LINE_SPACING },
      children: [new TextRun({ text: opts.title.toUpperCase(), bold: true, font: FONT, size: 32, color: ABNT.COLOR_TEXT })],
    }),
  ];
  if (opts.subtitle) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240, line: ABNT.LINE_SPACING },
      children: [new TextRun({ text: opts.subtitle, italics: true, font: FONT, size: ABNT.BODY_SIZE, color: MUTED })],
    }));
  }
  children.push(...opts.body);

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: 'bullets',
          levels: [{
            level: 0,
            format: LevelFormat.BULLET,
            text: '\u2022',
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          }],
        },
      ],
    },
    styles: {
      ...ABNT_DEFAULT_STYLES,
      paragraphStyles: [
        {
          id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: ABNT.H1_SIZE, bold: true, font: FONT, color: ABNT.COLOR_TEXT },
          paragraph: { spacing: { before: 480, after: 240, line: ABNT.LINE_SPACING }, outlineLevel: 0 },
        },
        {
          id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: ABNT.H2_SIZE, bold: true, font: FONT, color: ABNT.COLOR_TEXT },
          paragraph: { spacing: { before: 360, after: 200, line: ABNT.LINE_SPACING }, outlineLevel: 1 },
        },
        {
          id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: ABNT.H3_SIZE, bold: true, italics: true, font: FONT, color: ABNT.COLOR_TEXT },
          paragraph: { spacing: { before: 240, after: 120, line: ABNT.LINE_SPACING }, outlineLevel: 2 },
        },
      ],
    },
    sections: [{
      properties: ABNT_PAGE_PROPS,
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: opts.headerLabel, font: FONT, size: ABNT.SMALL_SIZE, color: MUTED, italics: true })],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: ABNT.SMALL_SIZE, color: ABNT.COLOR_TEXT })],
          })],
        }),
      },
      children,
    }],
  });

  return Packer.toBlob(doc).then((b) => saveAs(b, opts.filename));
}

// ─── Metodologia Export ──────────────────────────────────────────────
export async function exportMetodologiaDocx() {
  const doc = new Document({
    numbering: {
      config: [
        {
          reference: 'bullets',
          levels: [{
            level: 0,
            format: LevelFormat.BULLET,
            text: '\u2022',
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          }],
        },
      ],
    },
    styles: {
      ...ABNT_DEFAULT_STYLES,
      paragraphStyles: [
        {
          id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: ABNT.H1_SIZE, bold: true, font: FONT, color: ABNT.COLOR_TEXT },
          paragraph: { spacing: { before: 480, after: 240, line: ABNT.LINE_SPACING }, outlineLevel: 0 },
        },
        {
          id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: ABNT.H2_SIZE, bold: true, font: FONT, color: ABNT.COLOR_TEXT },
          paragraph: { spacing: { before: 360, after: 200, line: ABNT.LINE_SPACING }, outlineLevel: 1 },
        },
        {
          id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: ABNT.H3_SIZE, bold: true, italics: true, font: FONT, color: ABNT.COLOR_TEXT },
          paragraph: { spacing: { before: 240, after: 120, line: ABNT.LINE_SPACING }, outlineLevel: 2 },
        },
      ],
    },
    sections: [{
      properties: ABNT_PAGE_PROPS,
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: 'SISTUR — Metodologia Mario Beni', font: FONT, size: ABNT.SMALL_SIZE, color: MUTED, italics: true })],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: ABNT.SMALL_SIZE, color: ABNT.COLOR_TEXT }),
            ],
          })],
        }),
      },
      children: [
        // Title
        new Paragraph({
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          spacing: { after: 400, line: ABNT.LINE_SPACING },
          children: [new TextRun({ text: 'METODOLOGIA SISTUR', bold: true, font: FONT, size: 32, color: ABNT.COLOR_TEXT })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 240, line: ABNT.LINE_SPACING },
          children: [new TextRun({ text: 'Sistema de Inteligência Territorial para o Turismo', italics: true, font: FONT, size: ABNT.BODY_SIZE, color: MUTED })],
        }),
        para('Baseado na Análise Estrutural do Turismo do Prof. Mario Carlos Beni'),
        para(''),

        // Fundamentação
        heading('1. Fundamentação Teórica', HeadingLevel.HEADING_1),
        para('O SISTUR implementa os princípios da Análise Estrutural do Turismo desenvolvida pelo Prof. Mario Carlos Beni. A teoria estabelece que o turismo é um sistema aberto, composto por subsistemas interdependentes que devem ser analisados de forma holística.'),
        para('O Motor IGMA (Intelligence for Governance, Management and Action) é o núcleo do sistema que aplica automaticamente 6 regras derivadas dessa teoria.'),

        // Pilares
        heading('2. Os Três Pilares do Sistema Turístico', HeadingLevel.HEADING_1),
        para('Hierarquia de prioridades: RA → OE → AO'),

        heading('2.1 RA — Relações Ambientais (Prioridade 1)', HeadingLevel.HEADING_2),
        para('Base do sistema turístico. Engloba recursos naturais, patrimônio cultural, qualidade ambiental e sustentabilidade.'),
        bullet('Qualidade da água', 'bullets'),
        bullet('Áreas de preservação', 'bullets'),
        bullet('Gestão de resíduos', 'bullets'),
        bullet('Patrimônio histórico', 'bullets'),

        heading('2.2 OE — Organização Estrutural (Prioridade 2)', HeadingLevel.HEADING_2),
        para('Infraestrutura de apoio ao turismo. Depende da estabilidade ambiental para expansão sustentável.'),
        bullet('Rede hoteleira', 'bullets'),
        bullet('Transporte', 'bullets'),
        bullet('Sinalização turística', 'bullets'),
        bullet('Equipamentos', 'bullets'),

        heading('2.3 AO — Ações Operacionais (Prioridade 3)', HeadingLevel.HEADING_2),
        para('Governança central do sistema. Operações, serviços e coordenação entre os agentes do turismo.'),
        bullet('Qualificação profissional', 'bullets'),
        bullet('Marketing turístico', 'bullets'),
        bullet('Gestão de destino', 'bullets'),
        bullet('Políticas públicas', 'bullets'),

        // Níveis de diagnóstico
        heading('3. Os 3 Níveis de Diagnóstico', HeadingLevel.HEADING_1),

        heading('3.1 Essencial (9 indicadores, 30-45 min)', HeadingLevel.HEADING_2),
        para('Diagnóstico rápido focado nos indicadores mais críticos. Ideal para primeiras avaliações e municípios com recursos limitados.'),

        heading('3.2 Estratégico (19 indicadores, 2-3 horas)', HeadingLevel.HEADING_2),
        para('Diagnóstico intermediário para planejamento de médio prazo. Equilibra profundidade analítica com praticidade operacional.'),

        heading('3.3 Integral (96 indicadores, 1-2 semanas)', HeadingLevel.HEADING_2),
        para('Diagnóstico completo com todos os indicadores IGMA. Recomendado para projetos de grande porte e certificações.'),

        // 6 Regras IGMA
        heading('4. As 6 Regras do Motor IGMA', HeadingLevel.HEADING_1),

        heading('Regra 1: Prioridade RA', HeadingLevel.HEADING_3),
        para('Limitações ambientais bloqueiam expansão estrutural. Se RA está crítico, EDU_OE e Marketing são bloqueados.'),

        heading('Regra 2: Ciclo Contínuo', HeadingLevel.HEADING_3),
        para('Revisões programadas: Crítico = 6 meses, Atenção = 12 meses, Adequado = 18 meses.'),

        heading('Regra 3: Externalidades Negativas', HeadingLevel.HEADING_3),
        para('Alerta quando OE melhora às custas de RA (crescimento estrutural degrada o ambiente).'),

        heading('Regra 4: Governança Central', HeadingLevel.HEADING_3),
        para('AO crítico bloqueia todo o sistema. Sem governança, não há capacidade de implementar melhorias.'),

        heading('Regra 5: Marketing Bloqueado', HeadingLevel.HEADING_3),
        para('Promoção bloqueada se RA ou AO estão críticos. Protege a reputação do destino.'),

        heading('Regra 6: Interdependência Setorial', HeadingLevel.HEADING_3),
        para('Identifica indicadores que dependem de múltiplos setores (saúde, educação, saneamento).'),

        // Empresarial
        heading('5. SISTUR Empresarial — Módulo Hoteleiro', HeadingLevel.HEADING_1),
        para('Adaptação da metodologia para o setor privado de hospitalidade com 22 indicadores especializados, sendo 6 compartilhados com diagnósticos territoriais (NPS, Reviews Online, Horas de Treinamento, % Funcionários Locais, % Compras Locais e Certificações Ambientais).'),
        para('Categorias: Performance Financeira, Experiência do Hóspede, Operações, Sustentabilidade, Recursos Humanos, Marketing & Distribuição, Compliance & Segurança.'),

        // Fontes de dados
        heading('6. Fontes de Dados e Transparência', HeadingLevel.HEADING_1),
        
        heading('Dados via API Oficial (Confiabilidade 5/5)', HeadingLevel.HEADING_2),
        bullet('IBGE Agregados: População, PIB per capita, Densidade e Área territorial', 'bullets'),
        bullet('Bases públicas: IDH, IDEB, Leitos hospitalares, Cobertura de saúde, Receita própria, Despesa com turismo', 'bullets'),
        bullet('CADASTUR / dados.gov.br: Guias e Agências via datasets oficiais abertos', 'bullets'),
        bullet('Mapa do Turismo Brasileiro (mapa.turismo.gov.br): Região turística, categoria (A-E), empregos, estabelecimentos, visitantes nacionais e internacionais, arrecadação e conselho municipal de turismo', 'bullets'),

        heading('Preenchimento Manual (Confiabilidade 1/5)', HeadingLevel.HEADING_2),
        bullet('Taxa de Escolarização: dados via Censo Escolar (coleta manual)', 'bullets'),
        bullet('Indicadores de coleta local: levantamento de campo, dados da Secretaria de Turismo, Prefeitura', 'bullets'),

        // KB
        heading('7. Base de Conhecimento e Referências Globais', HeadingLevel.HEADING_1),
        para('O SISTUR permite upload de documentos de referência (PDF, DOCX, XLSX, CSV, TXT até 20MB) que são usados automaticamente pela IA na geração de relatórios.'),
        bullet('Por Destino: planos diretores, legislação municipal, pesquisas locais', 'bullets'),
        bullet('Global: PNT 2024-2027, legislação federal, diretrizes do Ministério do Turismo', 'bullets'),

        // Relatórios
        heading('8. Personalização de Relatórios', HeadingLevel.HEADING_1),
        para('Relatórios personalizáveis com logo, cabeçalho/rodapé, cor primária, tamanho de fonte e notas adicionais. Visibilidade pessoal ou organizacional. Templates: Completo, Executivo e Investidores.'),

        // Referências
        heading('9. Referências Bibliográficas', HeadingLevel.HEADING_1),
        bullet('BENI, Mario Carlos. Análise Estrutural do Turismo. São Paulo: Editora Senac São Paulo, 2001.', 'bullets'),
        bullet('BENI, Mario Carlos. Globalização do Turismo: Megatendências do Setor e a Realidade Brasileira. São Paulo: Aleph, 2003.', 'bullets'),
        bullet('BENI, Mario Carlos. Política e Planejamento de Turismo no Brasil. São Paulo: Aleph, 2006.', 'bullets'),
        bullet('IBGE. API de Agregados e Pesquisas Municipais. servicodados.ibge.gov.br', 'bullets'),
        bullet('Ministério do Turismo. CADASTUR — Cadastro de Prestadores de Serviços Turísticos. cadastur.turismo.gov.br', 'bullets'),
        bullet('Ministério do Turismo. Plano Nacional de Turismo 2024-2027. gov.br/turismo', 'bullets'),
        bullet('Ministério do Turismo. Mapa do Turismo Brasileiro — API REST de Regionalização. mapa.turismo.gov.br', 'bullets'),
      ],
    }],
  });

  const buffer = await Packer.toBlob(doc);
  saveAs(buffer, 'SISTUR_Metodologia.docx');
}

// ─── FAQ Export ───────────────────────────────────────────────────────
interface FAQEntry {
  question: string;
  answer: string;
  category: string;
}

export async function exportFAQDocx(items: FAQEntry[]) {
  const categoryLabels: Record<string, string> = {
    general: 'Sobre o SISTUR',
    edu: 'SISTUR EDU',
    erp: 'SISTUR ERP',
    enterprise: 'SISTUR Empresarial',
  };

  const grouped = items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, FAQEntry[]>);

  const children: Paragraph[] = [
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400, line: ABNT.LINE_SPACING },
      children: [new TextRun({ text: 'SISTUR — PERGUNTAS FREQUENTES', bold: true, font: FONT, size: 32, color: ABNT.COLOR_TEXT })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240, line: ABNT.LINE_SPACING },
      children: [new TextRun({ text: 'Tire suas dúvidas sobre o Sistema de Inteligência Territorial para o Turismo', italics: true, font: FONT, size: ABNT.BODY_SIZE, color: MUTED })],
    }),
    para(''),
  ];

  const categoryOrder = ['general', 'erp', 'edu', 'enterprise'];
  for (const cat of categoryOrder) {
    const catItems = grouped[cat];
    if (!catItems || catItems.length === 0) continue;

    children.push(heading(categoryLabels[cat] || cat, HeadingLevel.HEADING_1));

    catItems.forEach((item, idx) => {
      children.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { before: 240, after: 100, line: ABNT.LINE_SPACING },
          children: [new TextRun({ text: `${idx + 1}. ${item.question}`, bold: true, font: FONT, size: ABNT.BODY_SIZE, color: ABNT.COLOR_TEXT })],
        }),
        para(item.answer),
      );
    });
  }

  const doc = new Document({
    styles: {
      ...ABNT_DEFAULT_STYLES,
    },
    sections: [{
      properties: ABNT_PAGE_PROPS,
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: 'SISTUR — FAQ', font: FONT, size: ABNT.SMALL_SIZE, color: MUTED, italics: true })],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: ABNT.SMALL_SIZE, color: ABNT.COLOR_TEXT }),
            ],
          })],
        }),
      },
      children,
    }],
  });

  const buffer = await Packer.toBlob(doc);
  saveAs(buffer, 'SISTUR_FAQ.docx');
}

// ─── Manual do Usuário ───────────────────────────────────────────────
export async function exportManualUsuarioDocx() {
  return buildAndSave({
    filename: 'SISTUR_Manual_do_Usuario.docx',
    headerLabel: 'SISTUR — Manual do Usuário',
    title: 'Manual do Usuário SISTUR',
    subtitle: 'Guia completo de navegação e uso do sistema',
    body: [
      heading('1. Primeiros Passos', HeadingLevel.HEADING_1),
      para('O SISTUR é o Sistema de Inteligência Territorial para o Turismo. Após o login, você será direcionado ao Dashboard, que reúne os principais indicadores e atalhos para os módulos contratados pela sua organização.'),
      heading('1.1 Login e Recuperação de Senha', HeadingLevel.HEADING_2),
      para('Acesse pela tela inicial usando e-mail e senha cadastrados. Caso tenha esquecido a senha, utilize a opção "Esqueceu a senha?" para receber um link de redefinição. Contas novas passam por aprovação de um administrador antes do primeiro acesso.'),
      heading('1.2 Estrutura da Interface', HeadingLevel.HEADING_2),
      bullet('Barra lateral: navegação entre os módulos disponíveis (ERP, EDU, Empresarial, Observatório, Fórum, Configurações).', 'bullets'),
      bullet('Cabeçalho: título da página, notificações, perfil e troca rápida entre organizações (para usuários multi-org).', 'bullets'),
      bullet('Conteúdo principal: cards, tabelas e formulários específicos de cada módulo.', 'bullets'),

      heading('2. Módulos Principais', HeadingLevel.HEADING_1),
      heading('2.1 SISTUR ERP', HeadingLevel.HEADING_2),
      para('Plataforma de diagnóstico territorial baseada nos três pilares (RA, OE e AO) da Análise Estrutural de Mario Beni. Permite criar rodadas, preencher indicadores, calcular o I-SISTUR e gerar relatórios.'),
      heading('2.2 SISTUR EDU', HeadingLevel.HEADING_2),
      para('Ambiente de capacitação com trilhas, cursos, exames e certificações. As prescrições de aprendizado são geradas automaticamente a partir dos resultados do diagnóstico (gatilho em Atenção/Crítico).'),
      heading('2.3 SISTUR Empresarial', HeadingLevel.HEADING_2),
      para('Diagnóstico para empreendimentos privados (hotéis, agências, restaurantes). Usa 22 indicadores especializados e segue a mesma régua de status (Adequado/Atenção/Crítico).'),
      heading('2.4 Observatório Turístico', HeadingLevel.HEADING_2),
      para('Monitoramento permanente de fluxo, ocupação, eventos, receita e empregos. Permite ingestão automática a partir de fontes oficiais e exportação em CSV/PDF.'),
      heading('2.5 Fórum e Base de Conhecimento', HeadingLevel.HEADING_2),
      para('Espaço de troca entre gestores, técnicos e trade. A base de conhecimento aceita documentos da organização (PDF, DOCX, XLSX, CSV, TXT) e referências globais.'),

      heading('3. Fluxo Típico de Trabalho', HeadingLevel.HEADING_1),
      bullet('1. Cadastrar destinos / empreendimentos.', 'bullets'),
      bullet('2. Criar uma rodada de diagnóstico no nível adequado (Essencial, Estratégico ou Integral).', 'bullets'),
      bullet('3. Preencher os indicadores manualmente ou via importação CSV.', 'bullets'),
      bullet('4. Calcular o diagnóstico — o status (Adequado/Atenção/Crítico) é gerado automaticamente.', 'bullets'),
      bullet('5. Consultar prescrições de capacitação no SISTUR EDU.', 'bullets'),
      bullet('6. Gerar relatórios e planos de ação.', 'bullets'),
      bullet('7. Monitorar evolução pelo Observatório.', 'bullets'),

      heading('4. Permissões e Papéis', HeadingLevel.HEADING_1),
      bullet('ADMIN: acesso global, bypass de limites de licença.', 'bullets'),
      bullet('ORG_ADMIN: gestão local da organização.', 'bullets'),
      bullet('ANALYST: leitura e edição de diagnósticos no plano Pro.', 'bullets'),
      bullet('VIEWER: somente leitura.', 'bullets'),
      bullet('PROFESSOR / ESTUDANTE: módulos EDU (turmas, cursos, exames).', 'bullets'),

      heading('5. Suporte', HeadingLevel.HEADING_1),
      para('Para dúvidas técnicas, use o FAQ disponível em Ajuda. Solicitações de melhoria ou bugs devem ser registradas no Fórum interno ou diretamente com o administrador da organização.'),
    ],
  });
}

// ─── Glossário de Indicadores ────────────────────────────────────────
export async function exportGlossarioIndicadoresDocx() {
  return buildAndSave({
    filename: 'SISTUR_Glossario_de_Indicadores.docx',
    headerLabel: 'SISTUR — Glossário de Indicadores',
    title: 'Glossário de Indicadores SISTUR',
    subtitle: 'Definição, fonte oficial, periodicidade e pilar de cada indicador',
    body: [
      heading('1. Organização do Glossário', HeadingLevel.HEADING_1),
      para('Os indicadores do SISTUR são organizados pelos três pilares da Análise Estrutural do Turismo (RA, OE e AO) e classificados em três níveis de diagnóstico: Essencial, Estratégico e Integral. Cada indicador possui uma fonte oficial (provenance 1 a 5), unidade de medida, direção (maior é melhor / menor é melhor) e periodicidade de atualização.'),

      heading('2. Pilar RA — Relações Ambientais', HeadingLevel.HEADING_1),
      heading('2.1 Qualidade da Água (IQA)', HeadingLevel.HEADING_2),
      para('Mede a qualidade dos corpos hídricos do município. Fonte: ANA / órgãos estaduais. Periodicidade: anual. Direção: maior é melhor.'),
      heading('2.2 Áreas Protegidas (%)', HeadingLevel.HEADING_2),
      para('Percentual do território coberto por unidades de conservação. Fonte: MMA / CNUC. Periodicidade: anual.'),
      heading('2.3 Gestão de Resíduos Sólidos', HeadingLevel.HEADING_2),
      para('Cobertura de coleta seletiva e destinação adequada. Fonte: SNIS. Periodicidade: anual.'),
      heading('2.4 Patrimônio Histórico Tombado', HeadingLevel.HEADING_2),
      para('Existência e estado de conservação de bens tombados (IPHAN, estaduais, municipais). Fonte: IPHAN. Periodicidade: bienal.'),

      heading('3. Pilar OE — Organização Estrutural', HeadingLevel.HEADING_1),
      heading('3.1 Rede Hoteleira (UH/1.000 hab.)', HeadingLevel.HEADING_2),
      para('Número de unidades habitacionais por mil habitantes. Fonte: Mapa do Turismo / CADASTUR. Periodicidade: trimestral.'),
      heading('3.2 Transporte e Acessos', HeadingLevel.HEADING_2),
      para('Disponibilidade de rodoviária, aeroporto e qualidade de acessos. Fonte: ANTT / ANAC / DNIT. Periodicidade: anual.'),
      heading('3.3 Sinalização Turística', HeadingLevel.HEADING_2),
      para('Cobertura de sinalização indicativa e interpretativa. Fonte: levantamento local. Provenance 1/5.'),
      heading('3.4 Equipamentos de Apoio', HeadingLevel.HEADING_2),
      para('Centros de atendimento ao turista, banheiros públicos, postos de saúde próximos a atrativos. Fonte: Secretaria de Turismo. Periodicidade: anual.'),

      heading('4. Pilar AO — Ações Operacionais', HeadingLevel.HEADING_1),
      heading('4.1 Conselho Municipal de Turismo', HeadingLevel.HEADING_2),
      para('Existência e regularidade de reuniões do COMTUR. Fonte: Mapa do Turismo Brasileiro. Periodicidade: anual.'),
      heading('4.2 Plano Municipal de Turismo', HeadingLevel.HEADING_2),
      para('Existência, vigência e indicadores de execução. Fonte: Secretaria de Turismo. Periodicidade: quadrienal.'),
      heading('4.3 Despesa Municipal com Turismo', HeadingLevel.HEADING_2),
      para('Percentual do orçamento dedicado à função 23 (Comércio e Serviços / Turismo). Fonte: FINBRA / SICONFI. Periodicidade: anual.'),
      heading('4.4 Qualificação Profissional', HeadingLevel.HEADING_2),
      para('Horas de capacitação por trabalhador do setor. Fonte: SISTUR EDU + RAIS. Periodicidade: anual.'),
      heading('4.5 Marketing Turístico', HeadingLevel.HEADING_2),
      para('Existência de plano de marketing, presença digital, campanhas ativas. Fonte: Secretaria de Turismo. Periodicidade: anual.'),

      heading('5. Indicadores Derivados', HeadingLevel.HEADING_1),
      para('Alguns indicadores são calculados de forma determinística a partir de variáveis primárias, como Receita Turística per capita, Densidade Hoteleira, Índice de Capacidade de Pagamento (CAPAG) e cumprimento de mínimos constitucionais de Saúde e Educação.'),

      heading('6. Régua de Status', HeadingLevel.HEADING_1),
      bullet('Adequado: pontuação ≥ 67% — manter monitoramento.', 'bullets'),
      bullet('Atenção: pontuação 34–66% — dispara prescrições EDU e plano de ação.', 'bullets'),
      bullet('Crítico: pontuação ≤ 33% — bloqueio operacional e prioridade máxima.', 'bullets'),

      heading('7. Fontes Oficiais Utilizadas', HeadingLevel.HEADING_1),
      bullet('IBGE — servicodados.ibge.gov.br', 'bullets'),
      bullet('Mapa do Turismo Brasileiro — mapa.turismo.gov.br', 'bullets'),
      bullet('CADASTUR — cadastur.turismo.gov.br', 'bullets'),
      bullet('SNIS — snis.gov.br', 'bullets'),
      bullet('FINBRA / SICONFI — siconfi.tesouro.gov.br', 'bullets'),
      bullet('IPHAN — gov.br/iphan', 'bullets'),
      bullet('INEP / IDEB — gov.br/inep', 'bullets'),
      bullet('DataSUS — datasus.saude.gov.br', 'bullets'),
    ],
  });
}

// ─── Guia SISTUR EDU ─────────────────────────────────────────────────
export async function exportGuiaEduDocx() {
  return buildAndSave({
    filename: 'SISTUR_Guia_EDU.docx',
    headerLabel: 'SISTUR — Guia EDU',
    title: 'Guia do SISTUR EDU',
    subtitle: 'Sistema de prescrição determinística de capacitação',
    body: [
      heading('1. Visão Geral', HeadingLevel.HEADING_1),
      para('O SISTUR EDU é o módulo de capacitação do sistema. Diferentemente de plataformas EAD genéricas, suas trilhas e cursos são prescritos automaticamente a partir do diagnóstico territorial, garantindo conexão direta entre lacuna identificada e ação formativa.'),

      heading('2. Princípios da Prescrição', HeadingLevel.HEADING_1),
      para('Toda prescrição obedece a três condições obrigatórias:'),
      bullet('Gatilho diagnóstico: o indicador associado precisa estar em Atenção ou Crítico.', 'bullets'),
      bullet('Correspondência exata de pilar: cursos de RA só são prescritos para indicadores RA, e assim por diante.', 'bullets'),
      bullet('Interpretação territorial compatível (Estrutural, Gestão ou Entrega).', 'bullets'),
      para('A justificativa da prescrição é gerada por regra (não por LLM) para garantir rastreabilidade e auditabilidade.'),

      heading('3. Estrutura Pedagógica', HeadingLevel.HEADING_1),
      heading('3.1 Níveis de Currículo', HeadingLevel.HEADING_2),
      bullet('Nível 1 — Sensibilização: conceitos introdutórios e linguagem comum.', 'bullets'),
      bullet('Nível 2 — Capacitação: instrumentos práticos de gestão e operação.', 'bullets'),
      bullet('Nível 3 — Aprofundamento: análise técnica e estudos de caso.', 'bullets'),
      bullet('Nível 4 — Especialização: liderança, formulação de políticas e métricas avançadas.', 'bullets'),
      heading('3.2 Pré-requisitos', HeadingLevel.HEADING_2),
      para('Os níveis são sequenciais: para acessar um nível superior é necessário concluir os anteriores com aproveitamento mínimo.'),

      heading('4. Avaliação e Certificação', HeadingLevel.HEADING_1),
      heading('4.1 Exames Objetivos', HeadingLevel.HEADING_2),
      para('Corrigidos automaticamente. Aprovação a partir da nota mínima definida no curso. Possuem banco de questões versionado e sorteio aleatório.'),
      heading('4.2 Exames Dissertativos', HeadingLevel.HEADING_2),
      para('Corrigidos por RPC com auxílio de IA + revisão humana opcional. Permitem recurso (appeal) em prazo determinado.'),
      heading('4.3 Certificados', HeadingLevel.HEADING_2),
      para('Emitidos automaticamente após aprovação. Possuem código público para verificação em /verificar-certificado.'),

      heading('5. Compliance e Anti-fraude', HeadingLevel.HEADING_1),
      bullet('Heartbeats periódicos durante exames.', 'bullets'),
      bullet('Detecção de troca de aba e tempo anômalo.', 'bullets'),
      bullet('Alertas registrados em log auditável.', 'bullets'),

      heading('6. Papel do Professor', HeadingLevel.HEADING_1),
      para('Professores gerenciam turmas, prazos, diário de classe e podem indicar novos alunos via código de referência. Têm acesso a leaderboard, mensagens e relatórios de aproveitamento.'),

      heading('7. Boas Práticas', HeadingLevel.HEADING_1),
      bullet('Concluir o diagnóstico antes de matricular a equipe — assim as prescrições aparecem corretamente.', 'bullets'),
      bullet('Revisar trilhas adaptativas a cada novo cálculo de diagnóstico.', 'bullets'),
      bullet('Acompanhar o painel unificado de gestão (admin/professor) para detectar inatividade.', 'bullets'),
    ],
  });
}

// ─── Manual de Diagnósticos ──────────────────────────────────────────
export async function exportManualDiagnosticosDocx() {
  return buildAndSave({
    filename: 'SISTUR_Manual_de_Diagnosticos.docx',
    headerLabel: 'SISTUR — Manual de Diagnósticos',
    title: 'Manual de Diagnósticos Territoriais',
    subtitle: 'Como criar, calcular e interpretar diagnósticos no SISTUR',
    body: [
      heading('1. O que é um Diagnóstico SISTUR', HeadingLevel.HEADING_1),
      para('Um diagnóstico é a fotografia estruturada de um destino turístico em um determinado momento, baseado nos pilares RA, OE e AO. Pode ser Territorial (município, região turística, consórcio) ou Empresarial (empreendimento privado).'),

      heading('2. Níveis Disponíveis', HeadingLevel.HEADING_1),
      bullet('Essencial — 9 indicadores, 30–45 minutos. Ideal para primeira avaliação.', 'bullets'),
      bullet('Estratégico — 19 indicadores, 2–3 horas. Equilibra profundidade e prática.', 'bullets'),
      bullet('Integral — 96 indicadores, 1–2 semanas. Recomendado para certificações e planos diretores.', 'bullets'),

      heading('3. Passo a Passo', HeadingLevel.HEADING_1),
      heading('3.1 Criação da Rodada', HeadingLevel.HEADING_2),
      para('Vá em Diagnósticos → Nova Rodada, escolha o destino/empreendimento, o nível e o período de referência.'),
      heading('3.2 Preenchimento de Indicadores', HeadingLevel.HEADING_2),
      para('Indicadores com provenance 5/5 são preenchidos automaticamente via API oficial. Indicadores manuais devem ser preenchidos pela equipe técnica. O sistema aceita importação CSV em formato brasileiro (UTF-8 ou Latin-1, vírgula decimal).'),
      heading('3.3 Auditoria Pré-Cálculo', HeadingLevel.HEADING_2),
      para('Antes do cálculo, o sistema apresenta uma tela de confirmação com valores destacados (outliers, ausências e mudanças expressivas em relação à rodada anterior).'),
      heading('3.4 Cálculo', HeadingLevel.HEADING_2),
      para('O cálculo é executado por uma edge function unificada que aplica normalização, ponderação, status (Adequado/Atenção/Crítico) e as 6 regras do Motor IGMA. Snapshots são gerados a cada cálculo; rodadas antigas não são alteradas retroativamente.'),

      heading('4. Interpretação Territorial', HeadingLevel.HEADING_1),
      para('Cada indicador é classificado em uma das três Interpretações Territoriais:'),
      bullet('Estrutural — depende de infraestrutura e investimento.', 'bullets'),
      bullet('Gestão — depende de organização institucional, planejamento e governança.', 'bullets'),
      bullet('Entrega — depende de execução, qualidade do serviço e da experiência.', 'bullets'),
      para('Essa classificação direciona quais prescrições EDU e quais ações de plano são sugeridas.'),

      heading('5. Bloqueios Sistêmicos', HeadingLevel.HEADING_1),
      bullet('RA Crítico bloqueia expansão estrutural (OE) e marketing.', 'bullets'),
      bullet('AO Crítico bloqueia todo o sistema (sem governança não há execução).', 'bullets'),
      bullet('Externalidades negativas (OE melhora às custas de RA) disparam alerta.', 'bullets'),

      heading('6. Relatórios e Plano de Ação', HeadingLevel.HEADING_1),
      para('A partir do diagnóstico calculado é possível gerar relatórios (Completo, Executivo, Investidores) com cabeçalho/rodapé personalizáveis, e converter os gargalos em Projetos com tarefas e marcos.'),

      heading('7. Alertas de Regressão', HeadingLevel.HEADING_1),
      para('Quando um indicador regride mais de 2% em dois ciclos consecutivos, o sistema dispara alerta automático para gestores e registra evento auditável no painel.'),

      heading('8. Privacidade e Comparações', HeadingLevel.HEADING_1),
      para('O SISTUR não publica rankings entre municípios. O índice I-SISTUR agregado é de uso interno. Cada destino enxerga apenas seus próprios dados — comparações regionais só ocorrem via consórcios autorizados.'),
    ],
  });
}
