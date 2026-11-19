// Drawing a cover: every panel's photo, the bold caption band, and the sunset
// grade that ties the panels together. The same function draws the live preview
// and the full-size export, so what you see is what the PNG holds.

import { CAPTION_STYLES, FILTERS, LAYOUTS, SIZES } from './state.js';

const CAPTION_BAND = 0.18;

// A tiny deterministic noise tile for the film grain: the same seed draws the
// same grain every time, so exports are reproducible.
function grainTile() {
  const tile = document.createElement('canvas');
  tile.width = 128;
  tile.height = 128;
  const ctx = tile.getContext('2d');
  const data = ctx.createImageData(128, 128);
  let seed = 1337;
  const next = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let i = 0; i < data.data.length; i += 4) {
    const v = Math.floor(next() * 255);
    data.data[i] = v;
    data.data[i + 1] = v;
    data.data[i + 2] = v;
    data.data[i + 3] = 255;
  }
  ctx.putImageData(data, 0, 0);
  return tile;
}

let cachedGrain = null;
function grainPattern(ctx) {
  if (!cachedGrain) cachedGrain = ctx.createPattern(grainTile(), 'repeat');
  return cachedGrain;
}

// The panels' area once the caption band is taken out (top or bottom).
function panelsArea(state) {
  const band = CAPTION_BAND;
  return state.captionPosition === 'top'
    ? { x: 0, y: band, w: 1, h: 1 - band }
    : { x: 0, y: 0, w: 1, h: 1 - band };
}

function drawPhoto(ctx, photo, rect, panel, width, height) {
  const px = rect.x * width;
  const py = rect.y * height;
  const pw = rect.w * width;
  const ph = rect.h * height;
  if (!photo) {
    ctx.fillStyle = '#241a33';
    ctx.fillRect(px, py, pw, ph);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = Math.max(2, width * 0.002);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + pw, py + ph);
    ctx.moveTo(px + pw, py);
    ctx.lineTo(px, py + ph);
    ctx.stroke();
    return;
  }
  const img = photo.img;
  const base = Math.max(pw / img.naturalWidth, ph / img.naturalHeight) * panel.zoom;
  const dw = img.naturalWidth * base;
  const dh = img.naturalHeight * base;
  const dx = px + (pw - dw) / 2 + panel.dx * pw;
  const dy = py + (ph - dh) / 2 + panel.dy * ph;
  ctx.save();
  ctx.beginPath();
  ctx.rect(px, py, pw, ph);
  ctx.clip();
  ctx.filter = FILTERS[panel.filter] ?? 'none';
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

function drawCaption(ctx, state, width, height) {
  const bandH = CAPTION_BAND * height;
  const bandY = state.captionPosition === 'top' ? 0 : height - bandH;
  const style = CAPTION_STYLES[state.captionStyle] ?? CAPTION_STYLES.white;
  const size = (state.captionSize / 1080) * width;
  const text = (state.caption || 'GOLDEN HOUR').toUpperCase();
  ctx.save();
  // A dark band behind the letters keeps them readable over any photo.
  ctx.fillStyle = state.captionPosition === 'top'
    ? 'rgba(12, 6, 24, 0.55)'
    : 'rgba(12, 6, 24, 0.72)';
  ctx.fillRect(0, bandY, width, bandH);
  ctx.font = `700 ${size}px "CoverFont", "DejaVu Sans", sans-serif`;
  try { ctx.letterSpacing = `${Math.round(size * 0.06)}px`; } catch { /* older canvas */ }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.shadowColor = style.shadow;
  ctx.shadowBlur = size * 0.12;
  ctx.shadowOffsetY = size * 0.03;
  const lines = wrapLines(ctx, text, width * 0.92);
  const lineH = size * 1.04;
  const startY = bandY + bandH / 2 - ((lines.length - 1) * lineH) / 2;
  for (let i = 0; i < lines.length; i++) {
    const y = startY + i * lineH;
    ctx.strokeStyle = style.stroke;
    ctx.lineWidth = Math.max(2, size * 0.09);
    ctx.strokeText(lines[i], width / 2, y);
    ctx.fillStyle = style.fill;
    ctx.fillText(lines[i], width / 2, y);
  }
  ctx.restore();
}

function wrapLines(ctx, text, maxWidth) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth || !current) {
      current = test;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 2);
}

export function drawCover(canvas, state) {
  const size = SIZES[state.sizeKey];
  const width = size.width;
  const height = size.height;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#0d0a14';
  ctx.fillRect(0, 0, width, height);

  const area = panelsArea(state);
  const layout = LAYOUTS[state.layoutKey];
  layout.panels.forEach((panelRect, i) => {
    const rect = {
      x: area.x + panelRect.x * area.w,
      y: area.y + panelRect.y * area.h,
      w: panelRect.w * area.w,
      h: panelRect.h * area.h,
    };
    const panel = state.panels[i];
    drawPhoto(ctx, panel ? state.photos[panel.photoIndex] : undefined, rect, panel ?? { zoom: 1, dx: 0, dy: 0, filter: 'sunset' }, width, height);
  });

  // Thin sunset seams between the panels.
  ctx.fillStyle = 'rgba(20, 8, 28, 0.9)';
  const seam = Math.max(2, Math.round(width * 0.004));
  layout.panels.forEach((panelRect, i) => {
    if (i === 0) return;
    const rect = {
      x: area.x + panelRect.x * area.w,
      y: area.y + panelRect.y * area.h,
      w: panelRect.w * area.w,
      h: panelRect.h * area.h,
    };
    if (panelRect.x > 0) ctx.fillRect(rect.x - seam / 2, rect.y, seam, rect.h);
    if (panelRect.y > 0) ctx.fillRect(rect.x, rect.y - seam / 2, rect.w, seam);
  });

  drawCaption(ctx, state, width, height);

  // The sunset glow: warm light washing down from the top.
  if (state.glow > 0) {
    const glow = ctx.createLinearGradient(0, 0, 0, height);
    glow.addColorStop(0, `rgba(255, 154, 61, ${0.22 * state.glow})`);
    glow.addColorStop(0.55, `rgba(255, 46, 99, ${0.1 * state.glow})`);
    glow.addColorStop(1, 'rgba(20, 8, 40, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
  }

  if (state.vignette) {
    const vig = ctx.createRadialGradient(
      width / 2, height / 2, Math.min(width, height) * 0.42,
      width / 2, height / 2, Math.max(width, height) * 0.75,
    );
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(8,4,18,0.5)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, width, height);
  }

  if (state.grain) {
    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = grainPattern(ctx);
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }
  return canvas;
}
