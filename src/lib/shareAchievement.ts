/**
 * Gera uma imagem PNG (canvas) com a conquista e dispara compartilhamento via
 * Web Share API quando disponível; caso contrário, faz download.
 */
export async function shareAchievementImage(opts: {
  title: string;
  subtitle?: string;
  emoji?: string;
  siteName?: string;
}) {
  const { title, subtitle, emoji = '🏆', siteName = 'SISTUR EDU' } = opts;
  const W = 1080, H = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponível');

  // background gradient
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#0f766e');
  grad.addColorStop(1, '#0284c7');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // card
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  roundRect(ctx, 80, 200, W - 160, H - 400, 32);
  ctx.fill();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 220px system-ui,Arial';
  ctx.fillText(emoji, W / 2, 480);

  ctx.font = 'bold 64px system-ui,Arial';
  wrapText(ctx, title, W / 2, 620, W - 240, 76);

  if (subtitle) {
    ctx.font = '36px system-ui,Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    wrapText(ctx, subtitle, W / 2, 800, W - 240, 48);
  }

  ctx.font = 'bold 32px system-ui,Arial';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(siteName, W / 2, H - 110);
  ctx.font = '24px system-ui,Arial';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText('sistur.app', W / 2, H - 70);

  const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b!), 'image/png'));
  const file = new File([blob], 'conquista.png', { type: 'image/png' });

  const nav: any = navigator;
  if (nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title, text: `${title} — ${siteName}` });
      return;
    } catch {/* user cancelou */}
  }
  // fallback: download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'conquista.png';
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, yy);
      line = w;
      yy += lineHeight;
    } else line = test;
  }
  if (line) ctx.fillText(line, x, yy);
}