// Controls: every button, slider and input in the editor, and the drag
// that pans a panel's photo. Each control edits the state and asks the
// caller to redraw the preview.

import { GRADES, LAYOUTS, EXPORT_SIZES, CAPTION_STYLES, panelCount, panelRects } from './state.js';
import { loadSample, loadUserFile, SAMPLES } from './photos.js';
import { downloadBlob, exportCoverPng, exportFilename } from './export.js';

function $(id) {
  return document.getElementById(id);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

// Which panel sits under a pointer on the preview canvas, in canvas pixels.
function panelAt(state, canvas, clientX, clientY) {
  const box = canvas.getBoundingClientRect();
  const x = ((clientX - box.left) / box.width) * canvas.width;
  const y = ((clientY - box.top) / box.height) * canvas.height;
  const rects = panelRects(state, canvas.width, canvas.height);
  for (let i = 0; i < panelCount(state); i++) {
    const r = rects[i];
    if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return { index: i, rect: r };
  }
  return null;
}

function markActive(container, attr, value) {
  for (const button of container.querySelectorAll('button')) {
    button.classList.toggle('active', button.dataset[attr] === value);
  }
}

export function initControls(state, redraw) {
  const preview = $('preview');
  const chips = $('panelChips');

  // Panel chips: one per panel in the layout, click to select.
  function buildChips() {
    chips.innerHTML = '';
    for (let i = 0; i < panelCount(state); i++) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip' + (i === state.selected ? ' active' : '');
      chip.textContent = `Panel ${i + 1}`;
      chip.addEventListener('click', () => {
        state.selected = i;
        syncPanelControls();
        buildChips();
        redraw();
      });
      chips.appendChild(chip);
    }
  }

  // Layout buttons.
  for (const button of document.querySelectorAll('[data-layout]')) {
    button.addEventListener('click', () => {
      state.layout = button.dataset.layout;
      if (state.selected >= panelCount(state)) state.selected = 0;
      markActive($('layoutRow'), 'layout', state.layout);
      syncPanelControls();
      buildChips();
      redraw();
    });
  }

  // Grade buttons.
  for (const button of document.querySelectorAll('[data-grade]')) {
    button.addEventListener('click', () => {
      state.grade = button.dataset.grade;
      markActive($('gradeRow'), 'grade', state.grade);
      redraw();
    });
  }

  // Caption controls.
  $('captionText').addEventListener('input', (e) => {
    state.caption.text = e.target.value;
    redraw();
  });
  $('captionSize').addEventListener('input', (e) => {
    state.caption.size = Number(e.target.value);
    $('captionSizeVal').textContent = `${state.caption.size} px`;
    redraw();
  });
  $('captionPlace').addEventListener('change', (e) => {
    state.caption.place = e.target.value;
    redraw();
  });
  $('captionStyle').addEventListener('change', (e) => {
    state.caption.style = e.target.value;
    redraw();
  });

  // Effects.
  $('glowRange').addEventListener('input', (e) => {
    state.glow = Number(e.target.value) / 100;
    $('glowVal').textContent = `${e.target.value}%`;
    redraw();
  });
  $('vignetteToggle').addEventListener('change', (e) => {
    state.vignette = e.target.checked;
    redraw();
  });
  $('grainToggle').addEventListener('change', (e) => {
    state.grain = e.target.checked;
    redraw();
  });

  // Zoom for the selected panel.
  $('zoomRange').addEventListener('input', (e) => {
    state.panels[state.selected].zoom = Number(e.target.value) / 100;
    $('zoomVal').textContent = `${(state.panels[state.selected].zoom).toFixed(2)}×`;
    redraw();
  });

  function syncPanelControls() {
    const panel = state.panels[state.selected];
    $('zoomRange').value = Math.round(panel.zoom * 100);
    $('zoomVal').textContent = `${panel.zoom.toFixed(2)}×`;
  }

  // Photo loading: a file from disk goes into the selected panel.
  $('photoInput').addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      state.panels[state.selected].photo = await loadUserFile(file);
      state.panels[state.selected].dx = 0;
      state.panels[state.selected].dy = 0;
      state.panels[state.selected].zoom = 1;
      syncPanelControls();
      redraw();
    } catch (err) {
      $('exportStatus').textContent = `Could not load that photo: ${err.message}`;
    }
    e.target.value = '';
  });

  // Sample buttons: a bundled illustration into the selected panel.
  for (const button of document.querySelectorAll('[data-sample]')) {
    button.addEventListener('click', async () => {
      try {
        state.panels[state.selected].photo = await loadSample(button.dataset.sample);
        state.panels[state.selected].dx = 0;
        state.panels[state.selected].dy = 0;
        state.panels[state.selected].zoom = 1;
        syncPanelControls();
        redraw();
      } catch (err) {
        $('exportStatus').textContent = `Could not load the sample: ${err.message}`;
      }
    });
  }

  // Fill every panel with the selected panel's photo.
  $('fillAllBtn').addEventListener('click', () => {
    const photo = state.panels[state.selected].photo;
    if (!photo) {
      $('exportStatus').textContent = 'Load a photo into the selected panel first.';
      return;
    }
    for (let i = 0; i < panelCount(state); i++) {
      state.panels[i].photo = photo;
      state.panels[i].dx = 0;
      state.panels[i].dy = 0;
      state.panels[i].zoom = 1;
    }
    syncPanelControls();
    redraw();
  });

  // Export size buttons and the export button.
  for (const button of document.querySelectorAll('[data-size]')) {
    button.addEventListener('click', () => {
      state.exportSize = button.dataset.size;
      markActive($('sizeRow'), 'size', state.exportSize);
      redraw();
    });
  }
  $('exportBtn').addEventListener('click', async () => {
    $('exportBtn').disabled = true;
    $('exportStatus').textContent = 'Rendering your cover…';
    try {
      const blob = await exportCoverPng(state);
      downloadBlob(blob, exportFilename(state));
      $('exportStatus').textContent = `Exported ${exportFilename(state)} (${Math.round(blob.size / 1024)} KiB).`;
    } catch (err) {
      $('exportStatus').textContent = `Export failed: ${err.message}`;
    }
    $('exportBtn').disabled = false;
  });

  // Drag on the preview pans the photo in the panel under the pointer.
  let drag = null;
  preview.addEventListener('pointerdown', (e) => {
    const hit = panelAt(state, preview, e.clientX, e.clientY);
    if (!hit) return;
    state.selected = hit.index;
    syncPanelControls();
    buildChips();
    drag = { x: e.clientX, y: e.clientY, rect: hit.rect };
    preview.setPointerCapture(e.pointerId);
    redraw();
  });
  preview.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const box = preview.getBoundingClientRect();
    const panel = state.panels[state.selected];
    panel.dx = clamp(panel.dx + ((e.clientX - drag.x) / box.width) * (preview.width / drag.rect.w), -0.5, 0.5);
    panel.dy = clamp(panel.dy + ((e.clientY - drag.y) / box.height) * (preview.height / drag.rect.h), -0.5, 0.5);
    drag = { x: e.clientX, y: e.clientY, rect: drag.rect };
    redraw();
  });
  preview.addEventListener('pointerup', () => {
    drag = null;
  });
  preview.addEventListener('pointercancel', () => {
    drag = null;
  });

  // Initial state of the controls.
  markActive($('layoutRow'), 'layout', state.layout);
  markActive($('gradeRow'), 'grade', state.grade);
  markActive($('sizeRow'), 'size', state.exportSize);
  $('captionText').value = state.caption.text;
  $('captionSize').value = state.caption.size;
  $('captionSizeVal').textContent = `${state.caption.size} px`;
  $('captionPlace').value = state.caption.place;
  $('captionStyle').value = state.caption.style;
  $('glowRange').value = Math.round(state.glow * 100);
  $('glowVal').textContent = `${Math.round(state.glow * 100)}%`;
  $('vignetteToggle').checked = state.vignette;
  $('grainToggle').checked = state.grain;
  syncPanelControls();
  buildChips();
}
