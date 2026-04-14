/**
 * Export SISTUR Technical Document — "Secret Sauce" for application registration
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
  PageBreak,
} from 'docx';
import { saveAs } from 'file-saver';

const PRIMARY = '1E40AF';
const BORDER_COLOR = 'CBD5E1';
const HEADER_BG = 'EFF6FF';
const MUTED = '64748B';
const ACCENT = '059669';

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

function para(text: string, opts?: { bold?: boolean; italic?: boolean; color?: string; size?: number }) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [
      new TextRun({
        text,
        font: 'Arial',
        size: opts?.size ?? 22,
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

function codeBlock(lines: string[]) {
  return new Table({
    width: { size: 9026, type: WidthType.DXA },
    columnWidths: [9026],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: cellBorders(),
            shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
            margins: { top: 100, bottom: 100, left: 150, right: 150 },
            width: { size: 9026, type: WidthType.DXA },
            children: lines.map(line => new Paragraph({
              spacing: { after: 20 },
              children: [new TextRun({ text: line || ' ', font: 'Consolas', size: 18, color: '1E293B' })],
            })),
          }),
        ],
      }),
    ],
  });
}

function flowDiagram(steps: [string, string][]) {
  const rows = steps.map((step, idx) => {
    const arrow = idx < steps.length - 1 ? ' →' : '';
    return new TableRow({
      children: [
        new TableCell({
          borders: cellBorders(),
          width: { size: 600, type: WidthType.DXA },
          shading: { fill: HEADER_BG, type: ShadingType.CLEAR },
          margins: { top: 60, bottom: 60, left: 80, right: 80 },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${idx + 1}`, font: 'Arial', size: 20, bold: true, color: PRIMARY })] })],
        }),
        new TableCell({
          borders: cellBorders(),
          width: { size: 2800, type: WidthType.DXA },
          shading: { fill: 'DBEAFE', type: ShadingType.CLEAR },
          margins: { top: 60, bottom: 60, left: 100, right: 100 },
          children: [new Paragraph({ children: [new TextRun({ text: step[0] + arrow, font: 'Arial', size: 20, bold: true })] })],
        }),
        new TableCell({
          borders: cellBorders(),
          width: { size: 5626, type: WidthType.DXA },
          margins: { top: 60, bottom: 60, left: 100, right: 100 },
          children: [new Paragraph({ children: [new TextRun({ text: step[1], font: 'Arial', size: 20 })] })],
        }),
      ],
    });
  });
  return new Table({
    width: { size: 9026, type: WidthType.DXA },
    columnWidths: [600, 2800, 5626],
    rows,
  });
}

function tableRow(cells: { text: string; bold?: boolean; bg?: string; width?: number }[]) {
  return new TableRow({
    children: cells.map(c => new TableCell({
      borders: cellBorders(),
      width: c.width ? { size: c.width, type: WidthType.DXA } : undefined,
      shading: c.bg ? { fill: c.bg, type: ShadingType.CLEAR } : undefined,
      margins: { top: 60, bottom: 60, left: 100, right: 100 },
      children: [new Paragraph({ children: [new TextRun({ text: c.text, font: 'Arial', size: 20, bold: c.bold })] })],
    })),
  });
}

export async function exportTechnicalDocx() {
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
        {
          reference: 'numbers',
          levels: [{
            level: 0,
            format: LevelFormat.DECIMAL,
            text: '%1.',
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
            children: [new TextRun({ text: 'SISTUR — Documento Técnico Confidencial', font: 'Arial', size: 18, color: MUTED, italics: true })],
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
        // ══════════ CAPA ══════════
        new Paragraph({ spacing: { before: 3000 } }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [new TextRun({ text: 'SISTUR', bold: true, font: 'Arial', size: 72, color: PRIMARY })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
          children: [new TextRun({ text: 'Sistema Integrado de Suporte para Turismo em Regiões', font: 'Arial', size: 28, color: MUTED })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 600 },
          children: [new TextRun({ text: 'Documento Técnico para Registro de Software', font: 'Arial', size: 24, bold: true, color: PRIMARY })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
          children: [new TextRun({ text: `Data: ${new Date().toLocaleDateString('pt-BR')}`, font: 'Arial', size: 22, color: MUTED })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
          children: [new TextRun({ text: 'Classificação: CONFIDENCIAL', font: 'Arial', size: 22, bold: true, color: 'DC2626' })],
        }),

        new Paragraph({ children: [new PageBreak()] }),

        // ══════════ 1. VISÃO GERAL ══════════
        heading('1. Visão Geral do Sistema', HeadingLevel.HEADING_1),
        para('O SISTUR (Sistema Integrado de Suporte para Turismo em Regiões) é uma plataforma web proprietária de inteligência territorial que digitaliza e automatiza a análise sistêmica do turismo, baseando-se na Teoria da Análise Estrutural do Turismo do Prof. Mario Carlos Beni.'),
        para('O sistema é composto por cinco módulos integrados que cobrem todo o ciclo de gestão de destinos turísticos: diagnóstico, prescrição, capacitação, monitoramento e gamificação educacional.'),

        heading('1.1 Problema Resolvido', HeadingLevel.HEADING_2),
        bullet('Diagnósticos turísticos municipais são subjetivos, fragmentados e não reprodutíveis', 'bullets'),
        bullet('Inexistência de ferramenta que aplique automaticamente teoria acadêmica validada', 'bullets'),
        bullet('Capacitação desconectada dos resultados de diagnóstico territorial', 'bullets'),
        bullet('Falta de padronização na avaliação e comparação entre destinos', 'bullets'),
        bullet('Dados oficiais dispersos em múltiplas APIs sem integração', 'bullets'),

        heading('1.2 Proposta de Valor Única', HeadingLevel.HEADING_2),
        para('O diferencial central (Secret Sauce) do SISTUR é a implementação computacional das 6 regras sistêmicas de Mario Beni em um motor de interpretação automatizado — o Motor IGMA — que transforma dados brutos em diagnósticos acionáveis com prescrições determinísticas de capacitação.'),

        new Paragraph({ children: [new PageBreak()] }),

        // ══════════ 2. ARQUITETURA TÉCNICA ══════════
        heading('2. Arquitetura Técnica', HeadingLevel.HEADING_1),

        heading('2.1 Stack Tecnológico', HeadingLevel.HEADING_2),
        new Table({
          width: { size: 9026, type: WidthType.DXA },
          columnWidths: [2500, 6526],
          rows: [
            tableRow([{ text: 'Camada', bold: true, bg: HEADER_BG, width: 2500 }, { text: 'Tecnologia', bold: true, bg: HEADER_BG, width: 6526 }]),
            tableRow([{ text: 'Frontend', bold: true, width: 2500 }, { text: 'React 18 + TypeScript 5 + Vite 5 (SWC)', width: 6526 }]),
            tableRow([{ text: 'UI Framework', width: 2500 }, { text: 'shadcn/ui (Radix Primitives) + Tailwind CSS v3 + Framer Motion', width: 6526 }]),
            tableRow([{ text: 'Estado', width: 2500 }, { text: 'React Context (Auth, Profile, License) + TanStack React Query v5', width: 6526 }]),
            tableRow([{ text: 'Backend', width: 2500 }, { text: 'Supabase (PostgreSQL 15 + Edge Functions Deno)', width: 6526 }]),
            tableRow([{ text: 'Autenticação', width: 2500 }, { text: 'Supabase Auth (email/password) com Row Level Security', width: 6526 }]),
            tableRow([{ text: 'IA', width: 2500 }, { text: 'Lovable AI Gateway (GPT-5, Gemini 2.5) para relatórios e chat', width: 6526 }]),
            tableRow([{ text: 'Gráficos', width: 2500 }, { text: 'Recharts (dashboards) + Three.js/R3F (jogos 3D)', width: 6526 }]),
            tableRow([{ text: 'Formulários', width: 2500 }, { text: 'React Hook Form + Zod validation', width: 6526 }]),
            tableRow([{ text: 'Hospedagem', width: 2500 }, { text: 'Lovable Cloud (CDN global, SSL automático)', width: 6526 }]),
          ],
        }),

        heading('2.2 Estrutura do Projeto', HeadingLevel.HEADING_2),
        para('O projeto segue arquitetura modular com 154+ componentes organizados em 21 módulos de funcionalidade:'),
        bullet('src/components/ — Componentes reutilizáveis (UI, layout, dashboard, diagnostics, edu, admin, forum, games)', 'bullets'),
        bullet('src/hooks/ — 50+ custom hooks para lógica de negócio (useAuth, useAssessments, useIndicators, etc.)', 'bullets'),
        bullet('src/pages/ — 44 páginas lazy-loaded com React.lazy() + Suspense', 'bullets'),
        bullet('src/lib/igmaEngine.ts — Núcleo: Motor IGMA com as 6 regras sistêmicas', 'bullets'),
        bullet('src/contexts/ — Contextos globais (ProfileContext, LicenseContext)', 'bullets'),
        bullet('supabase/functions/ — 20+ Edge Functions serverless', 'bullets'),
        bullet('supabase/migrations/ — 30+ migrações de schema com RLS policies', 'bullets'),

        heading('2.3 Segurança', HeadingLevel.HEADING_2),
        bullet('Row Level Security (RLS) em todas as 40+ tabelas do banco de dados', 'bullets'),
        bullet('Autenticação obrigatória com verificação de e-mail', 'bullets'),
        bullet('Roles segregados: ADMIN, ANALYST, VIEWER, ESTUDANTE, PROFESSOR', 'bullets'),
        bullet('Route Guards: ProtectedRoute, AdminRoute, ERPRoute, EduRoute, LicenseRoute', 'bullets'),
        bullet('Audit logging de todas as operações críticas', 'bullets'),
        bullet('Moderação de conteúdo com IA para uploads de imagem', 'bullets'),
        bullet('Secrets gerenciados via vault (nunca hardcoded)', 'bullets'),

        new Paragraph({ children: [new PageBreak()] }),

        // ══════════ 3. MOTOR IGMA ══════════
        heading('3. Motor IGMA — Núcleo Proprietário', HeadingLevel.HEADING_1),
        para('O Motor IGMA (Intelligence for Governance, Management and Action) é o componente central do SISTUR. Implementa computacionalmente as 6 regras sistêmicas derivadas da Análise Estrutural do Turismo do Prof. Mario Beni.', { bold: true }),

        heading('3.1 Pipeline de Processamento (9 Etapas)', HeadingLevel.HEADING_2),
        new Table({
          width: { size: 9026, type: WidthType.DXA },
          columnWidths: [600, 2400, 6026],
          rows: [
            tableRow([{ text: '#', bold: true, bg: HEADER_BG, width: 600 }, { text: 'Etapa', bold: true, bg: HEADER_BG, width: 2400 }, { text: 'Descrição', bold: true, bg: HEADER_BG, width: 6026 }]),
            tableRow([{ text: '1', width: 600 }, { text: 'Coleta de Dados', width: 2400 }, { text: 'Ingestão via APIs (IBGE, CADASTUR, Mapa do Turismo) + dados manuais', width: 6026 }]),
            tableRow([{ text: '2', width: 600 }, { text: 'Validação', width: 2400 }, { text: 'Checklist pré-cálculo: ≥60% dos indicadores com valor, sem indicadores duplicados', width: 6026 }]),
            tableRow([{ text: '3', width: 600 }, { text: 'Normalização', width: 2400 }, { text: 'Escala 0-10 com funções lineares, inversas e logarítmicas por indicador', width: 6026 }]),
            tableRow([{ text: '4', width: 600 }, { text: 'Cálculo de Pilares', width: 2400 }, { text: 'Média ponderada dos indicadores normalizados por pilar (RA, OE, AO)', width: 6026 }]),
            tableRow([{ text: '5', width: 600 }, { text: 'Classificação', width: 2400 }, { text: 'Crítico (0-3.33), Atenção (3.34-6.66), Adequado (6.67-10)', width: 6026 }]),
            tableRow([{ text: '6', width: 600 }, { text: 'Aplicação IGMA', width: 2400 }, { text: 'Execução sequencial das 6 regras sistêmicas (ver seção 3.2)', width: 6026 }]),
            tableRow([{ text: '7', width: 600 }, { text: 'Geração de Issues', width: 2400 }, { text: 'Problemas identificados com severidade (crítico/moderado/bom)', width: 6026 }]),
            tableRow([{ text: '8', width: 600 }, { text: 'Prescrições', width: 2400 }, { text: 'Recomendações determinísticas vinculadas a capacitações EDU', width: 6026 }]),
            tableRow([{ text: '9', width: 600 }, { text: 'Snapshot', width: 2400 }, { text: 'Registro imutável dos dados, fontes e confiabilidade para rastreabilidade', width: 6026 }]),
          ],
        }),

        heading('3.2 As 6 Regras Sistêmicas', HeadingLevel.HEADING_2),

        heading('Regra 1 — Prioridade Ambiental (RA)', HeadingLevel.HEADING_3),
        para('SE score_RA < 3.33 ENTÃO ra_limitation = TRUE → bloqueia expansão de OE e marketing turístico. Fundamento: recursos ambientais degradados inviabilizam crescimento sustentável da infraestrutura.'),

        heading('Regra 2 — Ciclo Contínuo de Revisão', HeadingLevel.HEADING_3),
        para('Define periodicidade obrigatória: Crítico → revisão em 6 meses | Atenção → 12 meses | Adequado → 18 meses. Campo next_review_recommended_at calculado automaticamente.'),

        heading('Regra 3 — Externalidades Negativas', HeadingLevel.HEADING_3),
        para('SE score_OE melhora E score_RA piora simultaneamente ENTÃO externality_warning = TRUE. Detecta crescimento estrutural predatório ao meio ambiente.'),

        heading('Regra 4 — Governança Central (AO)', HeadingLevel.HEADING_3),
        para('SE score_AO < 3.33 ENTÃO governance_block = TRUE → bloqueia todo o sistema. Sem governança operacional, nenhuma melhoria pode ser implementada.'),

        heading('Regra 5 — Marketing Bloqueado', HeadingLevel.HEADING_3),
        para('SE score_RA < 3.33 OU score_AO < 3.33 ENTÃO marketing_blocked = TRUE. Promoção de destino com base ambiental ou governança precárias gera dano reputacional.'),

        heading('Regra 6 — Interdependência Setorial', HeadingLevel.HEADING_3),
        para('Identifica indicadores que dependem de múltiplos setores governamentais (saúde, educação, saneamento). Gera alertas de coordenação intersetorial.'),

        new Paragraph({ children: [new PageBreak()] }),

        // ══════════ 4. MÓDULOS FUNCIONAIS ══════════
        heading('4. Módulos Funcionais', HeadingLevel.HEADING_1),

        heading('4.1 ERP — Diagnóstico Territorial', HeadingLevel.HEADING_2),
        para('Módulo central de avaliação de destinos turísticos.'),
        bullet('3 níveis de diagnóstico: Essencial (9 indicadores), Estratégico (19), Integral (96)', 'bullets'),
        bullet('Criação de rodadas (rounds) com período de coleta definido', 'bullets'),
        bullet('Preenchimento assistido com dados de APIs oficiais (IBGE, CADASTUR, Mapa do Turismo)', 'bullets'),
        bullet('Normalização automática com 3 funções: linear, inversa e logarítmica', 'bullets'),
        bullet('Comparação entre rodadas e evolução temporal', 'bullets'),
        bullet('Geração de relatórios personalizáveis com IA (templates: Completo, Executivo, Investidores)', 'bullets'),
        bullet('Exportação DOCX e PDF com identidade visual customizável', 'bullets'),

        heading('4.2 EDU — Capacitação Prescritiva', HeadingLevel.HEADING_2),
        para('Sistema educacional integrado ao diagnóstico.'),
        bullet('Prescrição determinística: cada resultado de diagnóstico mapeia para capacitações específicas', 'bullets'),
        bullet('Trilhas de aprendizado (tracks) compostas por múltiplos treinamentos ordenados', 'bullets'),
        bullet('Player de vídeo integrado com tracking de progresso (watch_seconds, progress_percent)', 'bullets'),
        bullet('Suporte a YouTube embeddings com ingestão automática de metadados', 'bullets'),
        bullet('Sistema de exames com anti-cheat: fullscreen enforcement, tab-switch detection, time limits', 'bullets'),
        bullet('Certificados digitais com QR code e verificação pública via URL única', 'bullets'),
        bullet('Perfil de estudante com wizard e recomendações personalizadas por IA', 'bullets'),

        heading('4.3 Enterprise — Módulo Hoteleiro', HeadingLevel.HEADING_2),
        para('Adaptação da metodologia para o setor privado de hospitalidade.'),
        bullet('22 indicadores especializados em 7 categorias', 'bullets'),
        bullet('6 indicadores compartilhados com diagnósticos territoriais (NPS, Reviews, Treinamento, etc.)', 'bullets'),
        bullet('Integração com Google Business Reviews via Edge Function', 'bullets'),
        bullet('Dashboard dedicado com KPIs financeiros, operacionais e de sustentabilidade', 'bullets'),

        heading('4.4 Gamificação Educacional', HeadingLevel.HEADING_2),
        para('4 jogos educacionais com persistência de sessão:'),
        bullet('TCG (Trading Card Game): batalhas com cartas de ameaças turísticas vs. defesas dos pilares', 'bullets'),
        bullet('RPG: narrativas interativas com escolhas que afetam indicadores ambientais', 'bullets'),
        bullet('Jogo da Memória: pares de conceitos turísticos gerados dinamicamente', 'bullets'),
        bullet('Caça ao Tesouro: exploração de mapa com charadas sobre sustentabilidade', 'bullets'),

        heading('4.5 Fórum e Comunidade', HeadingLevel.HEADING_2),
        bullet('Posts com categorias, imagens moderadas por IA e sistema de likes', 'bullets'),
        bullet('Comentários em thread com notificações em tempo real', 'bullets'),
        bullet('Sistema de denúncia e moderação de conteúdo configurável por organização', 'bullets'),

        new Paragraph({ children: [new PageBreak()] }),

        // ══════════ 5. INTEGRAÇÕES E APIs ══════════
        heading('5. Integrações e Fontes de Dados', HeadingLevel.HEADING_1),

        new Table({
          width: { size: 9026, type: WidthType.DXA },
          columnWidths: [2200, 3200, 1800, 1826],
          rows: [
            tableRow([
              { text: 'Fonte', bold: true, bg: HEADER_BG, width: 2200 },
              { text: 'Dados Capturados', bold: true, bg: HEADER_BG, width: 3200 },
              { text: 'Método', bold: true, bg: HEADER_BG, width: 1800 },
              { text: 'Confiabilidade', bold: true, bg: HEADER_BG, width: 1826 },
            ]),
            tableRow([
              { text: 'IBGE Agregados', width: 2200 },
              { text: 'População, PIB per capita, Área territorial, Densidade', width: 3200 },
              { text: 'API REST', width: 1800 },
              { text: '5/5', width: 1826 },
            ]),
            tableRow([
              { text: 'Mapa do Turismo', width: 2200 },
              { text: 'Região turística, Categoria A-E, Empregos, Estabelecimentos, Visitantes, Arrecadação', width: 3200 },
              { text: 'API REST + CKAN', width: 1800 },
              { text: '5/5', width: 1826 },
            ]),
            tableRow([
              { text: 'CADASTUR', width: 2200 },
              { text: 'Guias e Agências registradas por município', width: 3200 },
              { text: 'Dataset CSV', width: 1800 },
              { text: '5/5', width: 1826 },
            ]),
            tableRow([
              { text: 'Bases Públicas', width: 2200 },
              { text: 'IDH, IDEB, Leitos, Cobertura saúde, Receita, Despesa turismo', width: 3200 },
              { text: 'Datasets', width: 1800 },
              { text: '4/5', width: 1826 },
            ]),
            tableRow([
              { text: 'Coleta Manual', width: 2200 },
              { text: 'Indicadores de campo, secretarias municipais', width: 3200 },
              { text: 'Formulário', width: 1800 },
              { text: '1-3/5', width: 1826 },
            ]),
          ],
        }),

        heading('5.1 Edge Functions (Serverless)', HeadingLevel.HEADING_2),
        para('20+ funções serverless em Deno/TypeScript para processamento backend:'),
        bullet('calculate-assessment: Execução do pipeline IGMA completo', 'bullets'),
        bullet('beni-chat: IA conversacional contextualizada com dados do destino', 'bullets'),
        bullet('generate-report: Relatórios personalizados via IA com templates', 'bullets'),
        bullet('fetch-official-data: Proxy para APIs oficiais (IBGE, DATASUS, STN, CADASTUR, Mapa do Turismo)', 'bullets'),
        bullet('ingest-mapa-turismo: Ingestão de dados do Mapa do Turismo Brasileiro', 'bullets'),
        bullet('ingest-youtube: Metadados de vídeos para biblioteca EDU', 'bullets'),
        bullet('moderate-image: Moderação de conteúdo via IA', 'bullets'),
        bullet('send-transactional-email: E-mails transacionais com templates React', 'bullets'),
        bullet('auth-email-hook: Templates customizados de e-mail de autenticação', 'bullets'),

        new Paragraph({ children: [new PageBreak()] }),

        // ══════════ 6. MODELO DE DADOS ══════════
        heading('6. Modelo de Dados', HeadingLevel.HEADING_1),
        para('O banco de dados PostgreSQL contém 40+ tabelas com Row Level Security habilitado em todas. Principais entidades:'),

        new Table({
          width: { size: 9026, type: WidthType.DXA },
          columnWidths: [2600, 6426],
          rows: [
            tableRow([{ text: 'Tabela', bold: true, bg: HEADER_BG, width: 2600 }, { text: 'Função', bold: true, bg: HEADER_BG, width: 6426 }]),
            tableRow([{ text: 'orgs', width: 2600 }, { text: 'Organizações (multi-tenant)', width: 6426 }]),
            tableRow([{ text: 'profiles', width: 2600 }, { text: 'Perfis de usuário com role e org_id', width: 6426 }]),
            tableRow([{ text: 'destinations', width: 2600 }, { text: 'Destinos turísticos com IBGE code e coordenadas', width: 6426 }]),
            tableRow([{ text: 'assessments', width: 2600 }, { text: 'Rodadas de diagnóstico com resultados IGMA', width: 6426 }]),
            tableRow([{ text: 'indicators', width: 2600 }, { text: 'Valores de indicadores por assessment', width: 6426 }]),
            tableRow([{ text: 'issues', width: 2600 }, { text: 'Problemas identificados pelo Motor IGMA', width: 6426 }]),
            tableRow([{ text: 'prescriptions', width: 2600 }, { text: 'Prescrições vinculadas a capacitações', width: 6426 }]),
            tableRow([{ text: 'action_plans', width: 2600 }, { text: 'Planos de ação com owner e due_date', width: 6426 }]),
            tableRow([{ text: 'edu_trainings', width: 2600 }, { text: 'Materiais de capacitação (vídeo, texto, quiz)', width: 6426 }]),
            tableRow([{ text: 'edu_tracks', width: 2600 }, { text: 'Trilhas de aprendizado ordenadas', width: 6426 }]),
            tableRow([{ text: 'edu_progress', width: 2600 }, { text: 'Progresso do aluno com watch_seconds', width: 6426 }]),
            tableRow([{ text: 'certificates', width: 2600 }, { text: 'Certificados com QR code e verificação pública', width: 6426 }]),
            tableRow([{ text: 'exams / exam_attempts', width: 2600 }, { text: 'Provas com anti-cheat e histórico', width: 6426 }]),
            tableRow([{ text: 'licenses', width: 2600 }, { text: 'Licenciamento: Trial (7d), Basic, Pro, Enterprise', width: 6426 }]),
            tableRow([{ text: 'audit_events', width: 2600 }, { text: 'Log de auditoria de operações críticas', width: 6426 }]),
            tableRow([{ text: 'forum_posts / comments', width: 2600 }, { text: 'Comunidade com moderação', width: 6426 }]),
            tableRow([{ text: 'game_sessions', width: 2600 }, { text: 'Persistência de sessões dos 4 jogos', width: 6426 }]),
          ],
        }),

        new Paragraph({ children: [new PageBreak()] }),

        // ══════════ 7. FLUXOS VISUAIS ══════════
        heading('7. Fluxos Visuais do Sistema', HeadingLevel.HEADING_1),

        heading('7.1 Fluxo de Diagnóstico Territorial', HeadingLevel.HEADING_2),
        flowDiagram([
          ['Criar Destino', 'Código IBGE + UF + Região Turística'],
          ['Nova Rodada', 'Essencial (9) | Estratégico (19) | Integral (96)'],
          ['Pré-preenchimento', 'APIs: IBGE + Mapa Turismo + CADASTUR'],
          ['Complemento Manual', 'Dados de campo + Secretarias Municipais'],
          ['Checklist Pré-Cálculo', 'Validação: ≥60% dos indicadores preenchidos'],
          ['calculate-assessment', 'Edge Function executa Pipeline IGMA (9 etapas)'],
          ['Resultados IGMA', 'Scores RA/OE/AO + Flags + Issues + Prescrições'],
          ['Dashboard', 'Gauges + Alertas + Comparação temporal'],
          ['Relatório IA', 'Contexto do destino + Base de Conhecimento'],
        ]),

        heading('7.2 Fluxo de Prescrição EDU (Determinístico)', HeadingLevel.HEADING_2),
        flowDiagram([
          ['Diagnóstico Calculado', 'Indicadores classificados: Crítico/Atenção/Adequado'],
          ['Mapeamento', 'edu_indicator_training_map: indicador → treinamento'],
          ['Priorização', 'Hierarquia RA → OE → AO (Regra 1 e 4)'],
          ['Recomendações', 'Lista com razão específica + relevância score'],
          ['Trilha Personalizada', 'Criação automática ou manual pelo gestor'],
          ['Progresso + Exame', 'Watch tracking + anti-cheat + score mínimo'],
          ['Certificação', 'QR code + verificação pública + validade'],
        ]),

        heading('7.3 Fluxo de Licenciamento', HeadingLevel.HEADING_2),
        flowDiagram([
          ['Registro', 'Cadastro com e-mail + verificação obrigatória'],
          ['Onboarding', 'Seleção: ERP ou EDU + Role + Organização'],
          ['Trial Automático', '7 dias com ERP + EDU + Games habilitados'],
          ['Feature Gating', 'LicenseContext verifica plano em cada rota'],
          ['Expiração', 'Cron: expire_trial_licenses() atualiza status'],
          ['Upgrade', 'Basic (5 destinos) → Pro (20) → Enterprise (∞)'],
        ]),

        heading('7.4 Fluxo de Autenticação e Acesso', HeadingLevel.HEADING_2),
        flowDiagram([
          ['Auth', 'Supabase Auth: email/password + verificação'],
          ['handle_new_user()', 'Trigger cria profile na org "Temporário"'],
          ['Onboarding', 'complete_user_onboarding(): define system_access + role'],
          ['Aprovação', 'Admin aprova → move para org "Autônomo" ou org própria'],
          ['Route Guards', 'ProtectedRoute → AdminRoute/ERPRoute/EduRoute/LicenseRoute'],
          ['RLS', 'Row Level Security: get_effective_org_id() em todas as queries'],
        ]),

        new Paragraph({ children: [new PageBreak()] }),

        // ══════════ 8. METODOLOGIA DE CÁLCULO ══════════
        heading('8. Metodologia de Cálculo Detalhada', HeadingLevel.HEADING_1),

        heading('8.1 Normalização de Indicadores', HeadingLevel.HEADING_2),
        para('Cada indicador bruto é normalizado para escala 0-10 usando uma de três funções, conforme a natureza do dado:'),

        heading('Normalização Linear (Positiva)', HeadingLevel.HEADING_3),
        para('Para indicadores onde maior = melhor (ex: IDH, cobertura de saúde):'),
        codeBlock([
          'score = ((valor - benchmark_min) / (benchmark_max - benchmark_min)) * 10',
          '',
          'Exemplo: IDH = 0.750',
          '  benchmark_min = 0.500 (pior município BR)',
          '  benchmark_max = 0.862 (melhor município BR)',
          '  score = ((0.750 - 0.500) / (0.862 - 0.500)) * 10 = 6.91',
        ]),

        heading('Normalização Inversa', HeadingLevel.HEADING_3),
        para('Para indicadores onde menor = melhor (ex: taxa de homicídios, desmatamento):'),
        codeBlock([
          'score = (1 - ((valor - benchmark_min) / (benchmark_max - benchmark_min))) * 10',
          '',
          'Exemplo: Homicídios por 100k = 15',
          '  benchmark_min = 0 (ideal)',
          '  benchmark_max = 60 (pior cenário)',
          '  score = (1 - ((15 - 0) / (60 - 0))) * 10 = 7.50',
        ]),

        heading('Normalização Logarítmica', HeadingLevel.HEADING_3),
        para('Para indicadores com distribuição assimétrica (ex: PIB per capita, população):'),
        codeBlock([
          'score = (log(valor) - log(benchmark_min)) / (log(benchmark_max) - log(benchmark_min)) * 10',
          '',
          'Exemplo: PIB per capita = R$ 35.000',
          '  benchmark_min = R$ 5.000',
          '  benchmark_max = R$ 150.000',
          '  score = (log(35000) - log(5000)) / (log(150000) - log(5000)) * 10 = 5.72',
        ]),

        heading('8.2 Cálculo dos Scores de Pilar', HeadingLevel.HEADING_2),
        para('Cada pilar (RA, OE, AO) é calculado pela média ponderada dos seus indicadores normalizados:'),
        codeBlock([
          'Score_Pilar = Σ(score_i × peso_i) / Σ(peso_i)',
          '',
          'Onde:',
          '  score_i = valor normalizado do indicador i (0-10)',
          '  peso_i  = peso estratégico do indicador i',
          '',
          'Restrição: Σ(peso_i) = 100% por pilar',
          '',
          'Pesos são definidos por relevância estratégica:',
          '  Segurança, Infraestrutura: peso 5-6x maior',
          '  Métricas secundárias: peso base 1x',
        ]),

        heading('8.3 Classificação de Severidade', HeadingLevel.HEADING_2),
        new Table({
          width: { size: 9026, type: WidthType.DXA },
          columnWidths: [2000, 2500, 4526],
          rows: [
            tableRow([{ text: 'Faixa', bold: true, bg: HEADER_BG, width: 2000 }, { text: 'Classificação', bold: true, bg: HEADER_BG, width: 2500 }, { text: 'Ação', bold: true, bg: HEADER_BG, width: 4526 }]),
            tableRow([{ text: '0.00 – 3.33', width: 2000 }, { text: 'CRÍTICO', bold: true, width: 2500 }, { text: 'Intervenção imediata. Pode acionar bloqueios IGMA.', width: 4526 }]),
            tableRow([{ text: '3.34 – 6.66', width: 2000 }, { text: 'ATENÇÃO', bold: true, width: 2500 }, { text: 'Monitoramento ativo. Prescrições educacionais geradas.', width: 4526 }]),
            tableRow([{ text: '6.67 – 10.0', width: 2000 }, { text: 'ADEQUADO', bold: true, width: 2500 }, { text: 'Manutenção. Revisão em 18 meses.', width: 4526 }]),
          ],
        }),

        heading('8.4 Regras IGMA — Fluxo de Decisão', HeadingLevel.HEADING_2),
        para('As 6 regras são aplicadas sequencialmente. Cada regra pode ativar flags que afetam ações permitidas:'),
        flowDiagram([
          ['Regra 1: RA < 3.33?', 'SIM → RA_LIMITATION = true → Bloqueia EDU_OE'],
          ['Regra 4: AO < 3.33?', 'SIM → GOVERNANCE_BLOCK = true → Bloqueia EDU_OE'],
          ['Regra 3: OE↑ e RA↓?', 'SIM → EXTERNALITY_WARNING = true → Alerta'],
          ['Regra 5: RA ou AO < 3.33?', 'SIM → MARKETING_BLOCKED = true'],
          ['Regra 2: Calcular Revisão', 'Crítico=6m | Atenção=12m | Adequado=18m'],
          ['Regra 6: Intersetorial?', 'SIM → INTERSECTORAL_DEPENDENCY = true'],
        ]),

        heading('8.5 Snapshot de Rastreabilidade', HeadingLevel.HEADING_2),
        para('Cada diagnóstico calculado gera um snapshot imutável (diagnosis_data_snapshots) que registra:'),
        bullet('Valor usado para cada indicador no momento do cálculo', 'bullets'),
        bullet('Fonte do dado (source_code): IBGE, CADASTUR, MANUAL, MAPA_TURISMO', 'bullets'),
        bullet('Nível de confiabilidade (1-5) baseado na origem', 'bullets'),
        bullet('Ano de referência do dado', 'bullets'),
        bullet('Flag de ajuste manual (was_manually_adjusted)', 'bullets'),
        para('Alterações em benchmarks ou pesos NÃO são retroativas. É necessário recalcular manualmente para aplicar novas regras.', { bold: true }),

        heading('8.6 Indicadores — 71 Territoriais + 22 Enterprise', HeadingLevel.HEADING_2),
        para('Os indicadores estão organizados por dimensão IGMA, cada um mapeado para um pilar:'),
        new Table({
          width: { size: 9026, type: WidthType.DXA },
          columnWidths: [2500, 1200, 2000, 3326],
          rows: [
            tableRow([{ text: 'Dimensão IGMA', bold: true, bg: HEADER_BG, width: 2500 }, { text: 'Pilar', bold: true, bg: HEADER_BG, width: 1200 }, { text: 'Qtd', bold: true, bg: HEADER_BG, width: 2000 }, { text: 'Exemplos', bold: true, bg: HEADER_BG, width: 3326 }]),
            tableRow([{ text: 'Ambiental', width: 2500 }, { text: 'RA', width: 1200 }, { text: '~15', width: 2000 }, { text: 'Saneamento, Desmatamento, Áreas protegidas', width: 3326 }]),
            tableRow([{ text: 'Socioeconômica', width: 2500 }, { text: 'RA', width: 1200 }, { text: '~12', width: 2000 }, { text: 'IDH, IDEB, Salário médio, Gini', width: 3326 }]),
            tableRow([{ text: 'Infraestrutura', width: 2500 }, { text: 'OE', width: 1200 }, { text: '~10', width: 2000 }, { text: 'Leitos, Transporte, Sinalização', width: 3326 }]),
            tableRow([{ text: 'Serviços Turísticos', width: 2500 }, { text: 'OE', width: 1200 }, { text: '~10', width: 2000 }, { text: 'Guias, Agências, Estabelecimentos', width: 3326 }]),
            tableRow([{ text: 'Governança', width: 2500 }, { text: 'AO', width: 1200 }, { text: '~12', width: 2000 }, { text: 'Conselho municipal, PDT, Receita turismo', width: 3326 }]),
            tableRow([{ text: 'Marketing', width: 2500 }, { text: 'AO', width: 1200 }, { text: '~8', width: 2000 }, { text: 'Visitantes, NPS, Reviews, Categoria MTur', width: 3326 }]),
            tableRow([{ text: 'Segurança', width: 2500 }, { text: 'RA', width: 1200 }, { text: '~4', width: 2000 }, { text: 'Homicídios, Furtos, Cobertura policial', width: 3326 }]),
          ],
        }),

        new Paragraph({ children: [new PageBreak()] }),

        new Paragraph({ children: [new PageBreak()] }),

        // ══════════ 9. DIFERENCIAIS COMPETITIVOS ══════════
        heading('9. Diferenciais Competitivos', HeadingLevel.HEADING_1),

        new Table({
          width: { size: 9026, type: WidthType.DXA },
          columnWidths: [3000, 6026],
          rows: [
            tableRow([{ text: 'Diferencial', bold: true, bg: HEADER_BG, width: 3000 }, { text: 'Descrição', bold: true, bg: HEADER_BG, width: 6026 }]),
            tableRow([{ text: 'Motor IGMA Proprietário', bold: true, width: 3000 }, { text: 'Única implementação computacional das 6 regras sistêmicas de Mario Beni', width: 6026 }]),
            tableRow([{ text: 'Prescrição Determinística', width: 3000 }, { text: 'Diagnóstico → Capacitação é automático e rastreável, não subjetivo', width: 6026 }]),
            tableRow([{ text: 'Multi-fonte Automatizada', width: 3000 }, { text: 'Integração com 5+ APIs oficiais para pré-preenchimento de dados', width: 6026 }]),
            tableRow([{ text: 'Rastreabilidade Total', width: 3000 }, { text: 'Snapshot imutável de dados, fontes e confiabilidade por diagnóstico', width: 6026 }]),
            tableRow([{ text: 'Multi-tenant', width: 3000 }, { text: 'Organizações isoladas com RLS, convites por código e roles granulares', width: 6026 }]),
            tableRow([{ text: 'Gamificação Integrada', width: 3000 }, { text: '4 jogos educacionais com persistência e relação direta com conteúdo', width: 6026 }]),
            tableRow([{ text: 'IA Contextualizada', width: 3000 }, { text: 'Chat e relatórios com contexto do destino + Base de Conhecimento', width: 6026 }]),
            tableRow([{ text: 'Certificação Digital', width: 3000 }, { text: 'QR code + verificação pública + exames com anti-cheat', width: 6026 }]),
            tableRow([{ text: 'Destinos Públicos', width: 3000 }, { text: 'Vitrine de destinos certificados com selo de qualidade SISTUR', width: 6026 }]),
          ],
        }),

        // ══════════ 9. CÓDIGO-FONTE — TRECHOS RELEVANTES ══════════
        heading('10. Código-Fonte — Trechos Relevantes', HeadingLevel.HEADING_1),
        para('Os trechos a seguir demonstram a implementação proprietária dos algoritmos centrais do SISTUR. São apresentados em TypeScript (frontend) e SQL (banco de dados).'),

        heading('11.1 Motor IGMA — interpretIGMA() [igmaEngine.ts]', HeadingLevel.HEADING_2),
        para('Função principal que aplica as 6 regras sistêmicas de Mario Beni:', { bold: true }),
        codeBlock([
          'export function interpretIGMA(input: IGMAInput): IGMAOutput {',
          '  const { pillarScores, previousPillarScores, assessmentDate } = input;',
          '  const flags: IGMAFlags = {',
          '    RA_LIMITATION: false,',
          '    GOVERNANCE_BLOCK: false,',
          '    EXTERNALITY_WARNING: false,',
          '    MARKETING_BLOCKED: false,',
          '    INTERSECTORAL_DEPENDENCY: false,',
          '  };',
          '',
          '  const RA = pillarScores.find(p => p.pillar === "RA");',
          '  const AO = pillarScores.find(p => p.pillar === "AO");',
          '  const OE = pillarScores.find(p => p.pillar === "OE");',
          '',
          '  // REGRA 1 — RA PRIORITÁRIO',
          '  if (RA?.severity === "CRITICO") {',
          '    flags.RA_LIMITATION = true;',
          '    blockedActions.push("EDU_OE");',
          '  }',
          '',
          '  // REGRA 4 — GOVERNANÇA CENTRAL',
          '  if (AO?.severity === "CRITICO") {',
          '    flags.GOVERNANCE_BLOCK = true;',
          '    blockedActions.push("EDU_OE");',
          '  }',
          '',
          '  // REGRA 3 — EXTERNALIDADES NEGATIVAS',
          '  if (prevRA && prevOE && RA && OE) {',
          '    const oeTrend = OE.score > prevOE.score ? "UP" : "STABLE";',
          '    const raTrend = RA.score < prevRA.score ? "DOWN" : "STABLE";',
          '    if (oeTrend === "UP" && raTrend === "DOWN") {',
          '      flags.EXTERNALITY_WARNING = true;',
          '    }',
          '  }',
          '',
          '  // REGRA 5 — MARKETING BLOQUEADO',
          '  if (RA?.severity === "CRITICO" || AO?.severity === "CRITICO") {',
          '    flags.MARKETING_BLOCKED = true;',
          '  }',
          '',
          '  // REGRA 2 — CICLO CONTÍNUO',
          '  let nextReviewMonths = 18; // Adequado',
          '  if (RA?.severity === "CRITICO") nextReviewMonths = 6;',
          '  else if (AO?.severity === "CRITICO") nextReviewMonths = 12;',
          '  else if (OE?.severity === "CRITICO") nextReviewMonths = 9;',
          '',
          '  return { flags, allowedActions, blockedActions, uiMessages,',
          '           interpretationType, nextReviewRecommendedAt, criticalPillar };',
          '}',
        ]),

        heading('11.2 Tipos e Interfaces Centrais [igmaEngine.ts]', HeadingLevel.HEADING_2),
        codeBlock([
          'export type PillarType = "RA" | "OE" | "AO";',
          'export type SeverityType = "CRITICO" | "MODERADO" | "BOM";',
          '',
          'export interface IGMAFlags {',
          '  RA_LIMITATION: boolean;       // Regra 1',
          '  GOVERNANCE_BLOCK: boolean;    // Regra 4',
          '  EXTERNALITY_WARNING: boolean; // Regra 3',
          '  MARKETING_BLOCKED: boolean;   // Regra 5',
          '  INTERSECTORAL_DEPENDENCY: boolean; // Regra 6',
          '}',
          '',
          'export interface IGMAOutput {',
          '  flags: IGMAFlags;',
          '  allowedActions: IGMAAllowedActions;',
          '  blockedActions: string[];',
          '  uiMessages: IGMAUIMessage[];',
          '  interpretationType: TerritorialInterpretation;',
          '  nextReviewRecommendedAt: Date;',
          '  criticalPillar?: PillarType;',
          '}',
        ]),

        heading('11.3 Classificação de Severidade [igmaEngine.ts]', HeadingLevel.HEADING_2),
        codeBlock([
          'export function getSeverityFromScore(score: number): SeverityType {',
          '  if (score <= 0.33) return "CRITICO";   // 0.00 – 3.33',
          '  if (score <= 0.66) return "MODERADO";   // 3.34 – 6.66',
          '  return "BOM";                           // 6.67 – 10.0',
          '}',
        ]),

        new Paragraph({ children: [new PageBreak()] }),

        // ══════════ 10. FUNÇÕES DE BANCO DE DADOS ══════════
        heading('11. Funções de Banco de Dados (PostgreSQL)', HeadingLevel.HEADING_1),
        para('Funções SQL com SECURITY DEFINER para controle de acesso e lógica de negócio server-side.'),

        heading('11.1 Controle de Acesso — has_role()', HeadingLevel.HEADING_2),
        codeBlock([
          'CREATE FUNCTION public.has_role(_user_id uuid, _role app_role)',
          '  RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$',
          '  SELECT EXISTS (',
          '    SELECT 1 FROM public.user_roles',
          '    WHERE user_id = _user_id AND role = _role',
          '  )',
          '$$;',
        ]),

        heading('11.2 Multi-tenant — get_effective_org_id()', HeadingLevel.HEADING_2),
        para('Resolve organização efetiva considerando modo demonstração:'),
        codeBlock([
          'CREATE FUNCTION public.get_effective_org_id() RETURNS uuid',
          '  LANGUAGE plpgsql SECURITY DEFINER AS $$',
          'DECLARE user_org_id UUID; demo_org UUID;',
          'BEGIN',
          '  SELECT viewing_demo_org_id INTO demo_org',
          '  FROM public.profiles WHERE user_id = auth.uid();',
          '  IF demo_org IS NOT NULL THEN',
          '    IF EXISTS (SELECT 1 FROM public.orgs',
          '              WHERE id = demo_org AND is_demo = true) THEN',
          '      RETURN demo_org;',
          '    END IF;',
          '  END IF;',
          '  SELECT org_id INTO user_org_id',
          '  FROM public.profiles WHERE user_id = auth.uid();',
          '  RETURN user_org_id;',
          'END; $$;',
        ]),

        heading('11.3 Onboarding — complete_user_onboarding()', HeadingLevel.HEADING_2),
        codeBlock([
          'CREATE FUNCTION public.complete_user_onboarding(',
          '  _user_id uuid, _system_access text, _role text',
          ') RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$',
          'BEGIN',
          '  -- Valida: ERP|EDU e ADMIN|ANALYST|VIEWER|ESTUDANTE|PROFESSOR',
          '  UPDATE public.profiles SET',
          '    system_access = _system_access::system_access_type,',
          '    pending_approval = true,',
          '    approval_requested_at = COALESCE(approval_requested_at, now())',
          '  WHERE user_id = _user_id;',
          '  INSERT INTO public.user_roles (user_id, org_id, role)',
          '    VALUES (_user_id, _org_id, _role::app_role)',
          '    ON CONFLICT (user_id, org_id) DO UPDATE SET role = EXCLUDED.role;',
          '  RETURN true;',
          'END; $$;',
        ]),

        heading('11.4 Licenciamento — activate_my_trial()', HeadingLevel.HEADING_2),
        codeBlock([
          'CREATE FUNCTION public.activate_my_trial() RETURNS licenses',
          '  LANGUAGE plpgsql SECURITY DEFINER AS $$',
          'BEGIN',
          '  -- Verifica: sem licença existente, sem trial usado',
          '  INSERT INTO public.licenses (',
          '    user_id, org_id, plan, status,',
          '    trial_started_at, trial_ends_at, activated_at,',
          '    max_users, features',
          '  ) VALUES (',
          '    v_user_id, v_org_id, \'trial\', \'active\',',
          '    now(), now() + INTERVAL \'7 days\', now(),',
          '    1, \'{"erp":true,"edu":true,"games":true}\'::jsonb',
          '  ) RETURNING * INTO v_license;',
          '  RETURN v_license;',
          'END; $$;',
        ]),

        heading('11.5 Expiração Automática — expire_trial_licenses()', HeadingLevel.HEADING_2),
        codeBlock([
          'CREATE FUNCTION public.expire_trial_licenses() RETURNS void',
          '  LANGUAGE plpgsql SECURITY DEFINER AS $$',
          'BEGIN',
          '  UPDATE public.licenses',
          '  SET status = \'expired\', updated_at = now()',
          '  WHERE plan = \'trial\' AND status = \'active\'',
          '    AND trial_ends_at IS NOT NULL AND trial_ends_at < now();',
          'END; $$;',
        ]),

        heading('11.6 Certificação — verify_certificate_by_code()', HeadingLevel.HEADING_2),
        codeBlock([
          'CREATE FUNCTION public.verify_certificate_by_code(p_code text)',
          '  RETURNS TABLE(certificate_id text, user_name text, title text,',
          '    issued_at timestamptz, status text, score_pct numeric)',
          '  LANGUAGE sql STABLE SECURITY DEFINER AS $$',
          '  SELECT certificate_id, user_name, title, issued_at, status, score_pct',
          '  FROM public.certificates WHERE verification_code = p_code LIMIT 1;',
          '$$;',
        ]),

        heading('11.7 Fila de E-mails — enqueue_email()', HeadingLevel.HEADING_2),
        codeBlock([
          'CREATE FUNCTION public.enqueue_email(queue_name text, payload jsonb)',
          '  RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER AS $$',
          'BEGIN',
          '  RETURN pgmq.send(queue_name, payload);',
          'EXCEPTION WHEN undefined_table THEN',
          '  PERFORM pgmq.create(queue_name);',
          '  RETURN pgmq.send(queue_name, payload);',
          'END; $$;',
        ]),

        heading('11.8 Auditoria — create_lms_audit_log()', HeadingLevel.HEADING_2),
        codeBlock([
          'CREATE FUNCTION public.create_lms_audit_log(',
          '  p_action text, p_entity_type text, p_entity_id text,',
          '  p_old_values jsonb, p_new_values jsonb, p_metadata jsonb',
          ') RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$',
          'BEGIN',
          '  INSERT INTO public.lms_audit_logs (',
          '    org_id, user_id, action, entity_type, entity_id,',
          '    old_values, new_values, metadata',
          '  ) VALUES (v_org_id, v_user_id, p_action, p_entity_type,',
          '    p_entity_id, p_old_values, p_new_values, p_metadata)',
          '  RETURNING log_id INTO v_log_id;',
          '  RETURN v_log_id;',
          'END; $$;',
        ]),

        new Paragraph({ children: [new PageBreak()] }),

        // ══════════ 11. PROPRIEDADE INTELECTUAL ══════════
        heading('12. Propriedade Intelectual', HeadingLevel.HEADING_1),
        para('O SISTUR constitui obra original protegida pela Lei 9.609/1998 (Lei de Software) e Lei 9.610/1998 (Direitos Autorais). Os seguintes elementos são proprietários:'),
        bullet('Motor IGMA: algoritmo de interpretação sistêmica com 6 regras encadeadas', 'bullets'),
        bullet('Pipeline de 9 etapas: fluxo de processamento de dados turísticos', 'bullets'),
        bullet('Sistema de prescrição determinística: mapeamento indicador → capacitação', 'bullets'),
        bullet('Interface e experiência de usuário: design system, fluxos de navegação', 'bullets'),
        bullet('Código-fonte: 44 páginas, 154+ componentes, 50+ hooks, 20+ edge functions', 'bullets'),
        bullet('Base de dados e schema: 40+ tabelas com políticas de segurança', 'bullets'),
        bullet('Jogos educacionais: mecânicas, conteúdo e persistência', 'bullets'),
        bullet('30+ funções SQL proprietárias com SECURITY DEFINER', 'bullets'),

        heading('13. Referências Bibliográficas', HeadingLevel.HEADING_1),
        bullet('BENI, Mario Carlos. Análise Estrutural do Turismo. São Paulo: Editora Senac São Paulo, 2001.', 'bullets'),
        bullet('BENI, Mario Carlos. Globalização do Turismo: Megatendências do Setor e a Realidade Brasileira. São Paulo: Aleph, 2003.', 'bullets'),
        bullet('BENI, Mario Carlos. Política e Planejamento de Turismo no Brasil. São Paulo: Aleph, 2006.', 'bullets'),
        bullet('IBGE. API de Agregados e Pesquisas Municipais. servicodados.ibge.gov.br', 'bullets'),
        bullet('Ministério do Turismo. CADASTUR. cadastur.turismo.gov.br', 'bullets'),
        bullet('Ministério do Turismo. Plano Nacional de Turismo 2024-2027. gov.br/turismo', 'bullets'),
        bullet('Ministério do Turismo. Mapa do Turismo Brasileiro. mapa.turismo.gov.br', 'bullets'),
        bullet('Lei 9.609/1998 — Proteção da Propriedade Intelectual de Programa de Computador.', 'bullets'),
        bullet('Lei 9.610/1998 — Direitos Autorais.', 'bullets'),
      ],
    }],
  });

  const buffer = await Packer.toBlob(doc);
  saveAs(buffer, 'SISTUR_Documento_Tecnico.docx');
}
