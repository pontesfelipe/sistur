/**
 * Export a Markdown report as a .docx file in ABNT format (NBR 14724 / NBR 6024)
 *
 * ABNT rules applied:
 *  - Font: Arial 12pt (body), titles up to 14pt
 *  - Line spacing: 1.5 (360 twips)
 *  - Margins: top 3cm, bottom 2cm, left 3cm, right 2cm
 *  - First-line indent: 1.25cm on body paragraphs
 *  - Page numbers: top-right, Arabic numerals
 *  - Headings: bold, left-aligned, numbered style
 *  - Tables: centered, with thin borders
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
} from 'docx';
import { saveAs } from 'file-saver';
import type { ReportCustomization } from '@/components/reports/ReportCustomizationDialog';

// --- ABNT constants (in DXA: 1cm ≈ 567 DXA, 1pt = 2 half-points) ---
const CM = 567; // 1 cm in DXA (twips)

// Margins: top 3cm, bottom 2cm, left 3cm, right 2cm
const MARGIN_TOP = Math.round(3 * CM);    // 1701
const MARGIN_BOTTOM = Math.round(2 * CM); // 1134
const MARGIN_LEFT = Math.round(3 * CM);   // 1701
const MARGIN_RIGHT = Math.round(2 * CM);  // 1134

// Page: A4 (210mm x 297mm)
const PAGE_WIDTH = 11906;  // A4 width in DXA
const PAGE_HEIGHT = 16838; // A4 height in DXA
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT; // ~9071

// Typography
const FONT = 'Arial';
const BODY_SIZE = 24;       // 12pt in half-points
const H1_SIZE = 28;         // 14pt
const H2_SIZE = 24;         // 12pt
const H3_SIZE = 24;         // 12pt
const SMALL_SIZE = 20;      // 10pt (for headers/footers/table captions)

// Spacing: 1.5 line spacing = 360 twips
const LINE_SPACING = 360;

// First-line indent: 1.25cm
const FIRST_LINE_INDENT = Math.round(1.25 * CM); // ~709

// Colors
const BORDER_COLOR = '000000';
const MUTED = '333333';

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

function parseMarkdownTable(lines: string[]): Table | null {
  if (lines.length < 2) return null;

  const parseRow = (line: string) =>
    line.split('|').map(c => c.trim()).filter(Boolean);

  const headers = parseRow(lines[0]);
  const colCount = headers.length;
  const colWidth = Math.floor(CONTENT_WIDTH / colCount);

  const dataLines = lines.filter((_, i) => i !== 1); // skip separator

  const rows = dataLines.map((line, rowIdx) => {
    const cells = parseRow(line);
    const isHeader = rowIdx === 0;

    return new TableRow({
      children: Array.from({ length: colCount }, (_, ci) => {
        const cellText = cells[ci] || '';
        return new TableCell({
          borders: cellBorders(),
          width: { size: colWidth, type: WidthType.DXA },
          shading: isHeader ? { fill: 'E8E8E8', type: ShadingType.CLEAR } : undefined,
          margins: { top: 40, bottom: 40, left: 80, right: 80 },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { line: 240 }, // single spacing inside tables per ABNT
              children: [
                new TextRun({
                  text: cellText,
                  bold: isHeader,
                  font: FONT,
                  size: SMALL_SIZE, // 10pt for tables per ABNT
                }),
              ],
            }),
          ],
        });
      }),
    });
  });

  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: Array(colCount).fill(colWidth),
    rows,
  });
}

export async function exportReportAsDocx(
  markdownContent: string,
  destinationName: string,
  customization?: ReportCustomization,
) {
  const lines = markdownContent.split('\n');
  const children: (Paragraph | Table)[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // --- Table detection ---
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      const table = parseMarkdownTable(tableLines);
      if (table) {
        children.push(new Paragraph({ spacing: { before: 120, line: LINE_SPACING }, children: [] }));
        children.push(table);
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
              font: FONT,
              size: H1_SIZE,
              bold: true,
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
              font: FONT,
              size: H2_SIZE,
              bold: true,
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
              font: FONT,
              size: H3_SIZE,
              bold: true,
              italics: true,
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

    // --- Bullet list (ABNT: no first-line indent for lists) ---
    if (line.match(/^\s*[-*]\s/)) {
      const text = line.replace(/^\s*[-*]\s/, '');
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

    // --- Regular paragraph (ABNT: 1.25cm first-line indent, justified, 1.5 spacing) ---
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

  // --- Additional notes block ---
  if (customization?.additionalNotes) {
    children.push(new Paragraph({ spacing: { before: 480, line: LINE_SPACING }, children: [] }));
    children.push(
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        indent: { left: Math.round(4 * CM) }, // ABNT: long quotes indented 4cm
        spacing: { before: 120, after: 120, line: 240 }, // single spacing for quotes
        children: [
          new TextRun({
            text: customization.additionalNotes,
            font: FONT,
            size: SMALL_SIZE,
            italics: true,
            color: MUTED,
          }),
        ],
      }),
    );
  }

  // --- Header: org name + header text (ABNT: 10pt, right-aligned) ---
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

  // --- Footer: page number top-right per ABNT (using footer as fallback) ---
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

  // --- Font size override from customization ---
  const fontSizeMap = { small: 20, medium: 24, large: 28 };
  const baseSize = fontSizeMap[customization?.fontSize || 'medium'] || BODY_SIZE;

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: FONT, size: baseSize },
          paragraph: {
            spacing: { line: LINE_SPACING },
          },
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
