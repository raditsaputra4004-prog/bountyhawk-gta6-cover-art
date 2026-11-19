// Drawing: everything the cover shows, painted onto any canvas at any
// size — the live preview and the exported PNG share this one path, so
// what you see is what you get.

import { panelCount, panelRects } from './state.js';

// A tiny seeded generator, so the film grain looks the same on every
// render of the same cover instead of flickering.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const GRADE_FILTERS = {
  original: 'none',
  sunset: 'saturate(1.25) contrast(1.08)',
  neon: 'saturate(1.45) contrast(1.12)',
  vivid: 'saturate(1.6) contrast(1.15)',
  mono: 'grayscale(1) contrast(1.1)',
};

// Paint one panel's photo, cropped to fill the panel, panned by the
// panel's drag offset and scaled by its zoom.
function paintPhoto(ctx, rect, panel) {
  const img = panel.photo;
  if (!img || !img.naturalWidth) {
    const shade = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
    shade.addColorStop(0, '#2a2140');
    shade.addColorStop(1, '#120e1f');
    ctx.fillStyle = shade;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = `600 ${Math.max(14, rect.w * 0.05)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Add a photo', rect.x + rect.w / 2, rect.y + rect.h / 2);
    return;
  }
  const base = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight);
  const scale = base * panel.zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const dx = rect.x + (rect.w - dw) / 2 + panel.dx * rect.w;
  const dy = rect.y + (rect.h - dh) / 2 + panel.dy * rect.h;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

// A colour wash over the whole cover, the grade's signature.
function paintGradeWash(ctx, width, height, grade) {
  if (grade === 'sunset') {
    const wash = ctx.createLinearGradient(0, 0, 0, height);
    wash.addColorStop(0, 'rgba(255, 140, 60, 0.20)');
    wash.addColorStop(0.55, 'rgba(255, 90, 120, 0.16)');
    wash.addColorStop(1, 'rgba(90, 30, 120, 0.22)');
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'source-over';
  } else if (grade === 'neon') {
    const wash = ctx.createLinearGradient(0, 0, width, height);
    wash.addColorStop(0, 'rgba(0, 220, 255, 0.14)');
    wash.addColorStop(1, 'rgba(255, 0, 180, 0.16)');
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'source-over';
  }
}

function paintCaption(ctx, width, height, caption) {
  const size = Math.round(caption.size * (width / 1080));
  const y =
    caption.place === 'top'
      ? height * 0.14
      : caption.place === 'center'
        ? height * 0.5
        : height * 0.87;
  ctx.save();
  ctx.font = `900 ${size}px "GoldenHour", "DejaVu Sans", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  if (caption.style === 'sunset') {
    const fill = ctx.createLinearGradient(0, y - size / 2, 0, y + size / 2);
    fill.addColorStop(0, '#ffd76a');
    fill.addColorStop(0.5, '#ff7a3d');
    fill.addColorStop(1, '#ff3d7e');
    ctx.fillStyle = fill;
    ctx.strokeStyle = 'rgba(20, 8, 30, 0.9)';
    ctx.lineWidth = size / 14;
    ctx.strokeText(caption.text, width / 2, y);
    ctx.fillText(caption.text, width / 2, y);
  } else if (caption.style === 'neon') {
    ctx.shadowColor = '#ff00b4';
    ctx.shadowBlur = size / 4;
    ctx.fillStyle = '#7df3ff';
    ctx.strokeStyle = '#12002e';
    ctx.lineWidth = size / 14;
    ctx.strokeText(caption.text, width / 2, y);
    ctx.fillText(caption.text, width / 2, y);
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = 'rgba(10, 5, 20, 0.95)';
    ctx.lineWidth = size / 9;
    ctx.strokeText(caption.text, width / 2, y);
    ctx.fillText(caption.text, width / 2, y);
  }
  ctx.restore();
}

function paintGlow(ctx, width, height, strength) {
  if (strength <= 0) return;
  const glow = ctx.createRadialGradient(
    width * 0.78, height * 0.16, 0,
    width * 0.78, height * 0.16, width * 0.55,
  );
  glow.addColorStop(0, `rgba(255, 190, 90, ${0.5 * strength})`);
  glow.addColorStop(1, 'rgba(255, 190, 90, 0)');
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
  ctx.globalCompositeOperation = 'source-over';
}

function paintVignette(ctx, width, height) {
  const shade = ctx.createRadialGradient(
    width / 2, height / 2, Math.min(width, height) * 0.42,
    width / 2, height / 2, Math.max(width, height) * 0.75,
  );
  shade.addColorStop(0, 'rgba(0,0,0,0)');
  shade.addColorStop(1, 'rgba(0,0,0,0.42)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, width, height);
}

function paintGrain(ctx, width, height) {
  const rand = mulberry32(1337);
  const dots = Math.floor((width * height) / 900);
  ctx.save();
  for (let i = 0; i < dots; i++) {
    const light = rand() > 0.5;
    ctx.fillStyle = light ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
    ctx.fillRect(rand() * width, rand() * height, 1.4, 1.4);
  }
  ctx.restore();
}

// Draw the whole cover onto ctx at the given size.
export function drawCover(ctx, width, height, state) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#0d0a18';
  ctx.fillRect(0, 0, width, height);
  const rects = panelRects(state, width, height);
  const count = panelCount(state);
  ctx.filter = GRADE_FILTERS[state.grade] ?? 'none';
  for (let i = 0; i < count; i++) {
    paintPhoto(ctx, rects[i], state.panels[i]);
  }
  ctx.filter = 'none';
  paintGradeWash(ctx, width, height, state.grade);
  paintGlow(ctx, width, height, state.glow);
  paintCaption(ctx, width, height, state.caption);
  if (state.vignette) paintVignette(ctx, width, height);
  if (state.grain) paintGrain(ctx, width, height);
}
