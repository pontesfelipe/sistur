/**
 * Export Metodologia or FAQ as .docx
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

const PRIMARY = '1E40AF';
const BORDER_COLOR = 'CBD5E1';
const HEADER_BG = 'EFF6FF';
const MUTED = '64748B';

function cellBorders() {
  const b = { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR };
  return { top: b, bottom: b, left: b, right: b };
}

function heading(text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel]) {
  return new Paragraph({
    heading: level,
    spacing: { before: 300, after: 150 },
    children: [new TextRun({ text, bold: true, font: 'Arial', color: PRIMARY })],
  });
}

function para(text: string, opts?: { bold?: boolean; italic?: boolean; color?: string }) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [
      new TextRun({
        text,
        font: 'Arial',
        size: 22,
        bold: opts?.bold,
        italics: opts?.italic,
        color: opts?.color,
      }),
    ],
  });
}

function bullet(text: string, ref: string, level = 0) {
  return new Paragraph({
    numbering: { reference: ref, level },
    spacing: { after: 60 },
    children: [new TextRun({ text, font: 'Arial', size: 22 })],
  });
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
      default: { document: { run: { font: 'Arial', size: 22 } } },
      paragraphStyles: [
        {
          id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 36, bold: true, font: 'Arial', color: PRIMARY },
          paragraph: { spacing: { before: 360, after: 200 } },
        },
        {
          id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 28, bold: true, font: 'Arial', color: PRIMARY },
          paragraph: { spacing: { before: 240, after: 160 } },
        },
        {
          id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 24, bold: true, font: 'Arial' },
          paragraph: { spacing: { before: 200, after: 120 } },
        },
      ],
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: 'SISTUR — Metodologia Mario Beni', font: 'Arial', size: 18, color: MUTED, italics: true })],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: 'Página ', font: 'Arial', size: 18, color: MUTED }),
              new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 18, color: MUTED }),
            ],
          })],
        }),
      },
      children: [
        // Title
        new Paragraph({
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
          children: [new TextRun({ text: 'Metodologia SISTUR', bold: true, font: 'Arial', size: 48, color: PRIMARY })],
        }),
        para('Sistema de Inteligência Territorial para o Turismo', { italic: true, color: MUTED }),
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

        // Enterprise
        heading('5. SISTUR Enterprise — Módulo Hoteleiro', HeadingLevel.HEADING_1),
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
    enterprise: 'SISTUR Enterprise',
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
      spacing: { after: 400 },
      children: [new TextRun({ text: 'SISTUR — Perguntas Frequentes', bold: true, font: 'Arial', size: 48, color: PRIMARY })],
    }),
    para('Tire suas dúvidas sobre o Sistema de Inteligência Territorial para o Turismo', { italic: true, color: MUTED }),
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
          spacing: { before: 200, after: 80 },
          children: [new TextRun({ text: `${idx + 1}. ${item.question}`, bold: true, font: 'Arial', size: 24 })],
        }),
        para(item.answer),
      );
    });
  }

  const doc = new Document({
    styles: {
      default: { document: { run: { font: 'Arial', size: 22 } } },
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: 'SISTUR — FAQ', font: 'Arial', size: 18, color: MUTED, italics: true })],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: 'Página ', font: 'Arial', size: 18, color: MUTED }),
              new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 18, color: MUTED }),
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
