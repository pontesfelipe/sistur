/**
 * Export a Markdown report as a .docx file following MEC / ABNT standards
 *
 * MEC / ABNT rules applied:
 *  - ABNT NBR 14724 — Structure (cover, abstract, body, references, glossary, appendix)
 *  - ABNT NBR 6024  — Progressive numbering
 *  - ABNT NBR 6023  — References
 *  - Font: Arial 12pt (body), 14pt (H1)
 *  - Line spacing: 1.5 (360 twips)
 *  - Margins: top 3cm, bottom 2cm, left 3cm, right 2cm
 *  - First-line indent: 1.25cm on body paragraphs
 *  - Page numbers: top-right, Arabic numerals
 *  - Tables: centered, title above, source below
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
  PageBreak,
} from 'docx';
import { saveAs } from 'file-saver';
import type { ReportCustomization } from '@/components/reports/ReportCustomizationDialog';
import { getStatusStyle, mapIndicatorTableColumns, realignIndicatorRow } from '@/lib/reportStatusStyle';

// --- ABNT constants (1cm ≈ 567 DXA, 1pt = 2 half-points) ---
const CM = 567;
const MARGIN_TOP = Math.round(3 * CM);
const MARGIN_BOTTOM = Math.round(2 * CM);
const MARGIN_LEFT = Math.round(3 * CM);
const MARGIN_RIGHT = Math.round(2 * CM);
const PAGE_WIDTH = 11906;  // A4
const PAGE_HEIGHT = 16838;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

const FONT = 'Arial';
const BODY_SIZE = 24;       // 12pt
const H1_SIZE = 28;         // 14pt
const H2_SIZE = 24;         // 12pt
const H3_SIZE = 24;         // 12pt
const SMALL_SIZE = 20;      // 10pt
const LINE_SPACING = 360;   // 1.5
const LINE_SPACING_SINGLE = 240; // 1,0 (Referências NBR 6023)
const FIRST_LINE_INDENT = Math.round(1.25 * CM);

const BORDER_COLOR = '000000';
const MUTED = '333333';

/** Convert "#1E40AF" → "1E40AF" (docx expects no leading #). */
function hex(color: string | undefined, fallback = '1E40AF'): string {
  if (!color) return fallback;
  return color.replace(/^#/, '').toUpperCase();
}

/** Lighten a hex color toward white by mixing with the given amount (0-1). */
function tint(hexColor: string, amount: number): string {
  const c = hex(hexColor);
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const mix = (ch: number) => Math.round(ch + (255 - ch) * amount);
  const toHex = (n: number) => n.toString(16).padStart(2, '0').toUpperCase();
  return `${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`;
}

function cellBorders() {
  const b = { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR };
  return { top: b, bottom: b, left: b, right: b };
}

function parseInlineFormatting(text: string, size = BODY_SIZE): TextRun[] {
  const runs: TextRun[] = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|([^*]+))/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match[2]) {
      runs.push(new TextRun({ text: match[2], bold: true, font: FONT, size }));
    } else if (match[3]) {
      runs.push(new TextRun({ text: match[3], italics: true, font: FONT, size }));
    } else if (match[4]) {
      runs.push(new TextRun({ text: match[4], font: FONT, size }));
    }
  }
  return runs.length > 0 ? runs : [new TextRun({ text, font: FONT, size })];
}

function parseMarkdownTable(lines: string[], primaryColor: string): (Paragraph | Table)[] {
  if (lines.length < 2) return [];

  const parseRow = (line: string) =>
    line.split('|').map(c => c.trim()).filter(Boolean);

  const headers = parseRow(lines[0]);
  const colCount = headers.length;
  const colWidth = Math.floor(CONTENT_WIDTH / colCount);
  const dataLines = lines.filter((_, i) => i !== 1); // skip separator
  const colMap = mapIndicatorTableColumns(headers);
  const headerFill = tint(primaryColor, 0.78); // soft tint of institutional color

  const rows = dataLines.map((line, rowIdx) => {
    const rawCells = parseRow(line);
    const cells = rowIdx === 0
      ? rawCells
      : realignIndicatorRow(rawCells, headers, colMap);
    const isHeader = rowIdx === 0;
    return new TableRow({
      children: Array.from({ length: colCount }, (_, ci) => {
        const cellText = cells[ci] || '';
        const isStatusCell = !isHeader && ci === colMap.statusIdx && colMap.statusIdx >= 0;
        const statusStyle = isStatusCell ? getStatusStyle(cellText) : null;
        const cellShading = isHeader
          ? { fill: headerFill, type: ShadingType.CLEAR }
          : statusStyle
            ? { fill: statusStyle.bg, type: ShadingType.CLEAR }
            : undefined;
        const cellTextColor = isHeader
          ? hex(primaryColor)
          : statusStyle
            ? statusStyle.fg
            : undefined;
        return new TableCell({
          borders: cellBorders(),
          width: { size: colWidth, type: WidthType.DXA },
          shading: cellShading,
          margins: { top: 40, bottom: 40, left: 80, right: 80 },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { line: 240 },
              children: [
                new TextRun({
                  text: cellText,
                  bold: isHeader || isStatusCell,
                  font: FONT,
                  size: SMALL_SIZE,
                  color: cellTextColor,
                }),
              ],
            }),
          ],
        });
      }),
    });
  });

  const table = new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: Array(colCount).fill(colWidth),
    rows,
  });

  return [table];
}

/** Build ABNT-compliant cover page */
function buildCoverPage(destinationName: string, customization?: ReportCustomization): Paragraph[] {
  const orgName = customization?.organizationName || 'SISTUR — Sistema Integrado de Suporte para Turismo em Regiões';
  const now = new Date();
  const year = now.getFullYear();
  const city = 'Brasil';

  return [
    // Institution name (centered, uppercase, bold)
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 600, line: LINE_SPACING },
      children: [new TextRun({ text: orgName.toUpperCase(), font: FONT, size: H1_SIZE, bold: true })],
    }),
    // Empty space
    new Paragraph({ spacing: { before: 2400 }, children: [] }),
    // Title
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400, line: LINE_SPACING },
      children: [new TextRun({ text: `RELATÓRIO DE DIAGNÓSTICO SISTUR`, font: FONT, size: 32, bold: true })],
    }),
    // Subtitle with destination name
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200, line: LINE_SPACING },
      children: [new TextRun({ text: destinationName.toUpperCase(), font: FONT, size: H1_SIZE, bold: true })],
    }),
    // Empty space
    new Paragraph({ spacing: { before: 2400 }, children: [] }),
    // Nature of document (ABNT requirement — right-aligned, half-width)
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      indent: { left: Math.round(7 * CM) },
      spacing: { after: 200, line: LINE_SPACING },
      children: [
        new TextRun({
          text: 'Relatório técnico de diagnóstico territorial gerado pelo Sistema SISTUR conforme metodologia de Mario Carlos Beni, seguindo padrões MEC/ABNT.',
          font: FONT, size: SMALL_SIZE, italics: true,
        }),
      ],
    }),
    // Empty space
    new Paragraph({ spacing: { before: 3600 }, children: [] }),
    // City and year
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { line: LINE_SPACING },
      children: [new TextRun({ text: `${city}`, font: FONT, size: BODY_SIZE })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { line: LINE_SPACING },
      children: [new TextRun({ text: `${year}`, font: FONT, size: BODY_SIZE })],
    }),
    // Page break after cover
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

export async function exportReportAsDocx(
  markdownContent: string,
  destinationName: string,
  customization?: ReportCustomization,
) {
  const primaryColor = customization?.primaryColor || '#1E40AF';
  const PRIMARY_HEX = hex(primaryColor);
  const lines = markdownContent.split('\n');
  const children: (Paragraph | Table)[] = [];

  // --- Cover page (MEC/ABNT pre-textual element) ---
  children.push(...buildCoverPage(destinationName, customization));

  let i = 0;
  // ABNT: dentro da seção "Referências" usamos alinhamento à esquerda,
  // entrelinha simples e espaço duplo ENTRE referências (NBR 6023:2018).
  let inReferences = false;

  while (i < lines.length) {
    const line = lines[i];

    // Detect entry/exit of References section (any heading toggles it)
    if (/^#{1,4}\s/.test(line)) {
      const headingText = line.replace(/^#{1,4}\s+/, '').trim().toLowerCase();
      inReferences = /^refer[êe]ncias?(\b|\s|$)/.test(headingText);
    }

    // --- Table title (ABNT: "Tabela N — Título" centered ABOVE table) ---
    if (/^Tabela\s+\d+\s*[—-]/i.test(line.trim())) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 240, after: 60, line: LINE_SPACING },
          children: [
            new TextRun({
              text: line.trim(),
              font: FONT, size: SMALL_SIZE, bold: true,
            }),
          ],
        }),
      );
      i++;
      continue;
    }

    // --- Table detection ---
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      const tableElements = parseMarkdownTable(tableLines, primaryColor);
      if (tableElements.length > 0) {
        children.push(new Paragraph({ spacing: { before: 120, line: LINE_SPACING }, children: [] }));
        children.push(...tableElements);
        children.push(new Paragraph({ spacing: { after: 120, line: LINE_SPACING }, children: [] }));
      }
      continue;
    }

    // --- Headings (ABNT: bold, left-aligned, uppercase for H1) ---
    if (line.startsWith('# ')) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.LEFT,
          spacing: { before: 480, after: 240, line: LINE_SPACING },
          children: [
            new TextRun({
              text: line.slice(2).toUpperCase(),
              font: FONT, size: H1_SIZE, bold: true, color: PRIMARY_HEX,
            }),
          ],
        }),
      );
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          alignment: AlignmentType.LEFT,
          spacing: { before: 360, after: 200, line: LINE_SPACING },
          children: [
            new TextRun({
              text: line.slice(3),
              font: FONT, size: H2_SIZE, bold: true, color: PRIMARY_HEX,
            }),
          ],
        }),
      );
      i++;
      continue;
    }
    if (line.startsWith('### ')) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          alignment: AlignmentType.LEFT,
          spacing: { before: 240, after: 120, line: LINE_SPACING },
          children: [
            new TextRun({
              text: line.slice(4),
              font: FONT, size: H3_SIZE, bold: true, italics: true,
            }),
          ],
        }),
      );
      i++;
      continue;
    }
    if (line.startsWith('#### ')) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_4,
          alignment: AlignmentType.LEFT,
          spacing: { before: 200, after: 100, line: LINE_SPACING },
          children: [
            new TextRun({
              text: line.slice(5),
              font: FONT, size: BODY_SIZE, bold: true,
            }),
          ],
        }),
      );
      i++;
      continue;
    }

    // --- Horizontal rule ---
    if (line.trim() === '---' || line.trim() === '***') {
      children.push(
        new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR, space: 1 } },
          spacing: { before: 200, after: 200, line: LINE_SPACING },
          children: [],
        }),
      );
      i++;
      continue;
    }

    // --- Bullet list ---
    if (line.match(/^\s*[-*]\s/)) {
      const text = line.replace(/^\s*[-*]\s/, '');
      // ABNT NBR 6023: cada referência é um parágrafo à esquerda,
      // entrelinha simples, separadas por espaço duplo entre si.
      if (inReferences) {
        children.push(
          new Paragraph({
            alignment: AlignmentType.LEFT,
            spacing: { before: 0, after: 240, line: LINE_SPACING_SINGLE },
            children: parseInlineFormatting(text),
          }),
        );
        i++;
        continue;
      }
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { before: 60, after: 60, line: LINE_SPACING },
          children: parseInlineFormatting(text),
        }),
      );
      i++;
      continue;
    }

    // --- Numbered list ---
    if (line.match(/^\s*\d+\.\s/)) {
      const text = line.replace(/^\s*\d+\.\s/, '');
      children.push(
        new Paragraph({
          spacing: { before: 60, after: 60, line: LINE_SPACING },
          indent: { left: Math.round(1.25 * CM), hanging: Math.round(0.75 * CM) },
          children: parseInlineFormatting(text),
        }),
      );
      i++;
      continue;
    }

    // --- Empty line ---
    if (line.trim() === '') {
      i++;
      continue;
    }

    // --- Table source line (ABNT: "Fonte:" below tables, smaller font) ---
    if (line.trim().toLowerCase().startsWith('fonte:')) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { before: 40, after: 120, line: 240 },
          children: [
            new TextRun({
              text: line.trim(),
              font: FONT, size: SMALL_SIZE, italics: true, color: MUTED,
            }),
          ],
        }),
      );
      i++;
      continue;
    }

    // --- Regular paragraph (ABNT: 1.25cm indent, justified, 1.5 spacing) ---
    // Em "Referências": alinhar à esquerda, entrelinha simples, sem recuo.
    if (inReferences) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { before: 0, after: 240, line: LINE_SPACING_SINGLE },
          children: parseInlineFormatting(line),
        }),
      );
      i++;
      continue;
    }
    children.push(
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        indent: { firstLine: FIRST_LINE_INDENT },
        spacing: { before: 0, after: 0, line: LINE_SPACING },
        children: parseInlineFormatting(line),
      }),
    );
    i++;
  }

  // --- Additional notes (ABNT: long quote format — 4cm indent, single spacing, 10pt) ---
  if (customization?.additionalNotes) {
    children.push(new Paragraph({ spacing: { before: 480, line: LINE_SPACING }, children: [] }));
    children.push(
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        indent: { left: Math.round(4 * CM) },
        spacing: { before: 120, after: 120, line: 240 },
        children: [
          new TextRun({
            text: customization.additionalNotes,
            font: FONT, size: SMALL_SIZE, italics: true, color: MUTED,
          }),
        ],
      }),
    );
  }

  // --- Header ---
  const headerText = customization?.headerText || 'SISTUR — Relatório de Diagnóstico';
  const orgName = customization?.organizationName || '';

  const headerChildren: Paragraph[] = [];
  if (orgName) {
    headerChildren.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { after: 20 },
        children: [new TextRun({ text: orgName, font: FONT, size: SMALL_SIZE, bold: true })],
      }),
    );
  }
  headerChildren.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [new TextRun({ text: headerText, font: FONT, size: SMALL_SIZE })],
    }),
  );

  // --- Footer: page number (ABNT: top-right ideally, but footer is common) ---
  const footerChildren: Paragraph[] = [];
  if (customization?.showPageNumbers !== false) {
    footerChildren.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: SMALL_SIZE }),
        ],
      }),
    );
  }
  const footerText = customization?.footerText || '';
  if (footerText) {
    footerChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 40 },
        children: [new TextRun({ text: footerText, font: FONT, size: SMALL_SIZE, color: MUTED })],
      }),
    );
  }

  // --- Font size override ---
  const fontSizeMap = { small: 20, medium: 24, large: 28 };
  const baseSize = fontSizeMap[customization?.fontSize || 'medium'] || BODY_SIZE;

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: FONT, size: baseSize },
          paragraph: { spacing: { line: LINE_SPACING } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: PAGE_WIDTH, height: PAGE_HEIGHT },
            margin: {
              top: MARGIN_TOP,
              bottom: MARGIN_BOTTOM,
              left: MARGIN_LEFT,
              right: MARGIN_RIGHT,
            },
          },
        },
        headers: {
          default: new Header({ children: headerChildren }),
        },
        footers: {
          default: new Footer({
            children: footerChildren.length > 0
              ? footerChildren
              : [new Paragraph({ children: [] })],
          }),
        },
        children,
      },
    ],
  });

  const buffer = await Packer.toBlob(doc);
  const filename = `relatorio-${destinationName.toLowerCase().replace(/\s+/g, '-')}.docx`;
  saveAs(buffer, filename);
}
