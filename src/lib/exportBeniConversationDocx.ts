import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';

export async function exportBeniConversationDocx(title: string, messages: { role: string; content: string }[]) {
  const date = new Date().toLocaleDateString('pt-BR');
  const children: Paragraph[] = [
    new Paragraph({ children: [new TextRun({ text: 'SISTUR — Professor Beni', bold: true, size: 20 })] }),
    new Paragraph({ text: title, heading: HeadingLevel.HEADING_1 }),
    new Paragraph({ children: [new TextRun({ text: `Exportado em ${date}`, italics: true, size: 18 })] }),
    new Paragraph({ text: '' }),
  ];
  for (const m of messages) {
    children.push(new Paragraph({
      spacing: { before: 200 },
      children: [new TextRun({ text: m.role === 'user' ? 'Pergunta' : 'Professor Beni', bold: true })],
    }));
    for (const line of m.content.split('\n')) {
      children.push(new Paragraph({ children: [new TextRun(line)] }));
    }
  }
  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  const safe = title.replace(/[^\w\-]+/g, '_').slice(0, 50) || 'conversa';
  saveAs(blob, `beni-${safe}.docx`);
}
