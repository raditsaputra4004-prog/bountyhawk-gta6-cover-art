// Golden Hour Cover Studio — controls.
//
// Wires every control in index.html to the state and repaints the preview
// after each change. Dragging on the preview pans the selected panel's
// photo; the zoom slider scales it. All handlers are small and local.

import { layoutRects, panelCount } from './state.js';
import { loadImage, readPickedFile, fillAllPanels, SAMPLE_SUNSET, SAMPLE_NEON } from './photos.js';
import { exportPng } from './export.js';

function $(id) {
  return document.getElementById(id);
}

function setActive(groupEl, attr, value) {
  for (const btn of groupEl.querySelectorAll('button')) {
    btn.classList.toggle('active', btn.dataset[attr] === value);
  }
}

export function wireControls(state, redraw) {
  const canvas = $('preview');

  // --- panel chips ------------------------------------------------------
  const chips = $('panelChips');
  function rebuildChips() {
    chips.innerHTML = '';
    const n = panelCount(state.layout);
    for (let i = 0; i < n; i++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = `Panel ${i + 1}`;
      btn.classList.toggle('active', state.selected === i);
      btn.addEventListener('click', () => {
        state.selected = i;
        rebuildChips();
        syncZoom();
        redraw();
      });
      chips.appendChild(btn);
    }
  }

  // --- photo ------------------------------------------------------------
  $('photoFile').addEventListener('change', async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    try {
      const dataUrl = await readPickedFile(file);
      const image = await loadImage(dataUrl);
      state.panels[state.selected].image = image;
      state.panels[state.selected].src = `upload:${file.name}`;
      redraw();
    } catch (err) {
      alert(err.message);
    }
  });

  async function loadSample(src) {
    try {
      const image = await loadImage(src);
      state.panels[state.selected].image = image;
      state.panels[state.selected].src = src;
      redraw();
    } catch (err) {
      alert(err.message);
    }
  }
  $('sampleSunset').addEventListener('click', () => loadSample(SAMPLE_SUNSET));
  $('sampleNeon').addEventListener('click', () => loadSample(SAMPLE_NEON));
  $('fillAll').addEventListener('click', () => {
    if (!fillAllPanels(state)) alert('Load a photo into the selected panel first.');
    redraw();
  });

  // --- layout and grade ---------------------------------------------------
  $('layoutRow').addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-layout]');
    if (!btn) return;
    state.layout = btn.dataset.layout;
    if (state.selected >= panelCount(state.layout)) state.selected = 0;
    setActive($('layoutRow'), 'layout', state.layout);
    rebuildChips();
    redraw();
  });
  $('gradeRow').addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-grade]');
    if (!btn) return;
    state.grade = btn.dataset.grade;
    setActive($('gradeRow'), 'grade', state.grade);
    redraw();
  });

  // --- caption ------------------------------------------------------------
  $('captionText').addEventListener('input', (event) => {
    state.caption.text = event.target.value;
    redraw();
  });
  $('captionSize').addEventListener('input', (event) => {
    state.caption.size = Number(event.target.value) / 100;
    $('captionSizeOut').textContent = `${event.target.value}%`;
    redraw();
  });
  $('captionY').addEventListener('input', (event) => {
    state.caption.y = Number(event.target.value) / 100;
    $('captionYOut').textContent = `${event.target.value}%`;
    redraw();
  });
  $('captionStyle').addEventListener('change', (event) => {
    state.caption.style = event.target.value;
    redraw();
  });

  // --- effects ------------------------------------------------------------
  $('glow').addEventListener('input', (event) => {
    state.glow = Number(event.target.value) / 100;
    $('glowOut').textContent = `${event.target.value}%`;
    redraw();
  });
  $('vignette').addEventListener('change', (event) => {
    state.vignette = event.target.checked;
    redraw();
  });
  $('grain').addEventListener('change', (event) => {
    state.grain = event.target.checked;
    redraw();
  });

  // --- zoom and export ------------------------------------------------------
  function syncZoom() {
    const panel = state.panels[state.selected];
    const pct = Math.round(panel.zoom * 100);
    $('zoom').value = String(pct);
    $('zoomOut').textContent = `${panel.zoom.toFixed(2)}×`;
  }
  $('zoom').addEventListener('input', (event) => {
    state.panels[state.selected].zoom = Number(event.target.value) / 100;
    $('zoomOut').textContent = `${(Number(event.target.value) / 100).toFixed(2)}×`;
    redraw();
  });
  $('sizeRow').addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-size]');
    if (!btn) return;
    state.exportSize = btn.dataset.size;
    setActive($('sizeRow'), 'size', state.exportSize);
    redraw();
  });
  $('exportBtn').addEventListener('click', async () => {
    try {
      const info = await exportPng(state);
      console.log(`exported ${info.width}×${info.height} PNG (${info.bytes} bytes)`);
    } catch (err) {
      alert(err.message);
    }
  });

  // --- drag to pan ------------------------------------------------------------
  let drag = null;
  function canvasPoint(event) {
    const box = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - box.left) * (canvas.width / box.width),
      y: (event.clientY - box.top) * (canvas.height / box.height),
    };
  }
  canvas.addEventListener('pointerdown', (event) => {
    const p = canvasPoint(event);
    const rects = layoutRects(state.layout, canvas.width, canvas.height);
    const hit = rects.findIndex((r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h);
    if (hit < 0) return;
    state.selected = hit;
    rebuildChips();
    syncZoom();
    const panel = state.panels[hit];
    drag = { startX: p.x, startY: p.y, ax: panel.anchorX, ay: panel.anchorY };
    canvas.setPointerCapture(event.pointerId);
    redraw();
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const p = canvasPoint(event);
    const panel = state.panels[state.selected];
    const rect = layoutRects(state.layout, canvas.width, canvas.height)[state.selected];
    const scale = Math.max(0.0001, (panel.zoom - 1) + 0.25);
    panel.anchorX = clamp(drag.ax - (p.x - drag.startX) / (rect.w * scale), 0, 1);
    panel.anchorY = clamp(drag.ay - (p.y - drag.startY) / (rect.h * scale), 0, 1);
    redraw();
  });
  function endDrag() {
    drag = null;
  }
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  rebuildChips();
  syncZoom();
  return { rebuildChips, syncZoom };
}

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}
