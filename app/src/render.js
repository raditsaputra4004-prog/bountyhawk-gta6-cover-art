// Golden Hour Cover Studio — rendering.
//
// One draw function paints the whole cover at any size: panels with their
// colour grade, the sunset glow, the bold poster caption, then vignette
// and film grain. The preview and the export both call it, so what you
// see is exactly what you get.

import { layoutRects } from './state.js';
import { drawPhotoInto } from './photos.js';

export const CAPTION_FONT = `'DejaVu Sans', Arial, Helvetica, sans-serif`;

// Canvas filter per grade, applied while the photo is drawn.
const GRADE_FILTERS = {
  sunset: 'saturate(1.35) contrast(1.08) brightness(1.04) sepia(0.18)',
  neon: 'saturate(1.6) contrast(1.15) brightness(1.0) hue-rotate(-12deg)',
  vivid: 'saturate(1.8) contrast(1.18) brightness(1.05)',
  mono: 'grayscale(1) contrast(1.12) brightness(1.03)',
  original: 'none',
};

// A tint washed over each panel after the photo, per grade.
function gradeTint(ctx, rect, grade, w, h) {
  if (grade === 'original') return;
  const g = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  if (grade === 'sunset') {
    g.addColorStop(0, 'rgba(255, 122, 26, 0.16)');
    g.addColorStop(0.6, 'rgba(255, 64, 110, 0.10)');
    g.addColorStop(1, 'rgba(40, 8, 60, 0.22)');
  } else if (grade === 'neon') {
    g.addColorStop(0, 'rgba(0, 229, 255, 0.14)');
    g.addColorStop(0.55, 'rgba(255, 0, 128, 0.10)');
    g.addColorStop(1, 'rgba(10, 0, 40, 0.26)');
  } else if (grade === 'vivid') {
    g.addColorStop(0, 'rgba(255, 200, 0, 0.08)');
    g.addColorStop(1, 'rgba(0, 40, 120, 0.14)');
  } else if (grade === 'mono') {
    g.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
    g.addColorStop(1, 'rgba(0, 0, 0, 0.18)');
  }
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = g;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

// Deterministic grain: a small noise tile made once per size, tiled over
// the canvas. A seeded shuffle keeps the pattern identical every run.
function grainTile(size, seed) {
  const tile = document.createElement('canvas');
  tile.width = size;
  tile.height = size;
  const tctx = tile.getContext('2d');
  const img = tctx.createImageData(size, size);
  let s = seed;
  const next = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(next() * 255);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  tctx.putImageData(img, 0, 0);
  return tile;
}

function drawGrain(ctx, w, h) {
  const tile = grainTile(128, 20261119);
  const pattern = ctx.createPattern(tile, 'repeat');
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function drawVignette(ctx, w, h) {
  const r = Math.hypot(w, h) / 2;
  const g = ctx.createRadialGradient(w / 2, h / 2, r * 0.45, w / 2, h / 2, r);
  g.addColorStop(0, 'rgba(0, 0, 0, 0)');
  g.addColorStop(1, 'rgba(0, 0, 0, 0.42)');
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function drawGlow(ctx, w, h, strength) {
  if (strength <= 0) return;
  const cy = h * 0.62;
  const g = ctx.createRadialGradient(w / 2, cy, 0, w / 2, cy, w * 0.55);
  g.addColorStop(0, `rgba(255, 150, 50, ${0.5 * strength})`);
  g.addColorStop(0.5, `rgba(255, 80, 120, ${0.22 * strength})`);
  g.addColorStop(1, 'rgba(255, 80, 120, 0)');
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function drawCaption(ctx, w, h, caption) {
  const text = (caption.text || '').trim().toUpperCase();
  if (!text) return;
  // Shrink the type until it fits the canvas: a long caption on a narrow
  // (square or portrait) cover must never run off the edges.
  let size = Math.round(h * caption.size);
  const maxWidth = w * 0.92;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  while (size > 10) {
    ctx.font = `700 ${size}px ${CAPTION_FONT}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size = Math.floor(size * 0.95);
  }
  ctx.font = `700 ${size}px ${CAPTION_FONT}`;
  const y = Math.round(h * caption.y);
  if (caption.style === 'shadow') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillText(text, w / 2 + size * 0.06, y + size * 0.07);
    ctx.fillStyle = '#fff7ec';
    ctx.fillText(text, w / 2, y);
  } else if (caption.style === 'solid') {
    ctx.fillStyle = '#fff7ec';
    ctx.fillText(text, w / 2, y);
  } else {
    // Bold outline: dark rim, warm-white face, thin inner glow line.
    ctx.lineWidth = Math.max(2, size / 9);
    ctx.strokeStyle = '#14060f';
    ctx.strokeText(text, w / 2, y);
    const face = ctx.createLinearGradient(0, y - size / 2, 0, y + size / 2);
    face.addColorStop(0, '#fffdf8');
    face.addColorStop(0.55, '#ffe9c4');
    face.addColorStop(1, '#ffb26b');
    ctx.fillStyle = face;
    ctx.fillText(text, w / 2, y);
  }
  ctx.restore();
}

// Paint the whole cover. `state` is the editor state; `w` and `h` are
// the canvas size in pixels. Panels without a photo stay dark plum.
export function drawCover(ctx, state, w, h) {
  ctx.save();
  ctx.fillStyle = '#14060f';
  ctx.fillRect(0, 0, w, h);
  const rects = layoutRects(state.layout, w, h);
  const count = rects.length;
  for (let i = 0; i < count; i++) {
    const panel = state.panels[i];
    const rect = rects[i];
    if (panel.image) {
      ctx.save();
      ctx.filter = GRADE_FILTERS[state.grade] || 'none';
      drawPhotoInto(ctx, panel.image, rect, panel.zoom, panel.anchorX, panel.anchorY);
      ctx.restore();
      gradeTint(ctx, rect, state.grade, w, h);
    } else {
      ctx.fillStyle = '#2b1530';
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    }
    ctx.strokeStyle = 'rgba(20, 6, 15, 0.9)';
    ctx.lineWidth = Math.max(1, Math.min(w, h) * 0.004);
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  }
  drawGlow(ctx, w, h, state.glow);
  drawCaption(ctx, w, h, state.caption);
  if (state.vignette) drawVignette(ctx, w, h);
  if (state.grain) drawGrain(ctx, w, h);
  ctx.restore();
}
