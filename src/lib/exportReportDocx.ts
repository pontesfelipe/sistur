/**
 * Export a Markdown report as a .docx file using docx-js
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

// Colors
const PRIMARY = '1E40AF';
const HEADER_BG = 'EFF6FF';
const BORDER = 'CBD5E1';
const MUTED = '64748B';

function cellBorders() {
  const b = { style: BorderStyle.SINGLE, size: 1, color: BORDER };
  return { top: b, bottom: b, left: b, right: b };
}

function parseInlineFormatting(text: string): TextRun[] {
  const runs: TextRun[] = [];
  // Handle **bold** and *italic*
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|([^*]+))/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match[2]) {
      runs.push(new TextRun({ text: match[2], bold: true, font: 'Arial', size: 22 }));
    } else if (match[3]) {
      runs.push(new TextRun({ text: match[3], italics: true, font: 'Arial', size: 22 }));
    } else if (match[4]) {
      runs.push(new TextRun({ text: match[4], font: 'Arial', size: 22 }));
    }
  }
  return runs.length > 0 ? runs : [new TextRun({ text, font: 'Arial', size: 22 })];
}

function parseMarkdownTable(lines: string[]): Table | null {
  if (lines.length < 2) return null;

  const parseRow = (line: string) =>
    line.split('|').map(c => c.trim()).filter(Boolean);

  const headers = parseRow(lines[0]);
  const colCount = headers.length;
  const colWidth = Math.floor(9360 / colCount);

  const dataLines = lines.filter((l, i) => i !== 1); // skip separator

  const rows = dataLines.map((line, rowIdx) => {
    const cells = parseRow(line);
    const isHeader = rowIdx === 0;

    return new TableRow({
      children: Array.from({ length: colCount }, (_, ci) => {
        const cellText = cells[ci] || '';
        return new TableCell({
          borders: cellBorders(),
          width: { size: colWidth, type: WidthType.DXA },
          shading: isHeader ? { fill: HEADER_BG, type: ShadingType.CLEAR } : undefined,
          margins: { top: 60, bottom: 60, left: 100, right: 100 },
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: cellText,
                  bold: isHeader,
                  font: 'Arial',
                  size: isHeader ? 20 : 20,
                  color: isHeader ? PRIMARY : undefined,
                }),
              ],
            }),
          ],
        });
      }),
    });
  });

  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: Array(colCount).fill(colWidth),
    rows,
  });
}

export async function exportReportAsDocx(markdownContent: string, destinationName: string) {
  const lines = markdownContent.split('\n');
  const children: (Paragraph | Table)[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Table detection
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      const table = parseMarkdownTable(tableLines);
      if (table) {
        children.push(new Paragraph({ spacing: { before: 120 }, children: [] }));
        children.push(table);
        children.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
      }
      continue;
    }

    // Headings
    if (line.startsWith('# ')) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 360, after: 200 },
          children: [new TextRun({ text: line.slice(2), font: 'Arial', size: 32, bold: true, color: PRIMARY })],
        })
      );
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 280, after: 160 },
          children: [new TextRun({ text: line.slice(3), font: 'Arial', size: 26, bold: true, color: PRIMARY })],
        })
      );
      i++;
      continue;
    }
    if (line.startsWith('### ')) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 120 },
          children: [new TextRun({ text: line.slice(4), font: 'Arial', size: 24, bold: true, color: '374151' })],
        })
      );
      i++;
      continue;
    }

    // Horizontal rule
    if (line.trim() === '---' || line.trim() === '***') {
      children.push(
        new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'E2E8F0', space: 1 } },
          spacing: { before: 200, after: 200 },
          children: [],
        })
      );
      i++;
      continue;
    }

    // Bullet list
    if (line.match(/^\s*[-*]\s/)) {
      const text = line.replace(/^\s*[-*]\s/, '');
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { before: 40, after: 40 },
          children: parseInlineFormatting(text),
        })
      );
      i++;
      continue;
    }

    // Numbered list
    if (line.match(/^\s*\d+\.\s/)) {
      const text = line.replace(/^\s*\d+\.\s/, '');
      children.push(
        new Paragraph({
          spacing: { before: 40, after: 40 },
          children: parseInlineFormatting(text),
        })
      );
      i++;
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Regular paragraph
    children.push(
      new Paragraph({
        spacing: { before: 80, after: 80 },
        children: parseInlineFormatting(line),
      })
    );
    i++;
  }

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Arial', size: 22 },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: 'SISTUR — Relatório de Diagnóstico', font: 'Arial', size: 18, color: MUTED, italics: true }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'Página ', font: 'Arial', size: 18, color: MUTED }),
                  new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 18, color: MUTED }),
                ],
              }),
            ],
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
