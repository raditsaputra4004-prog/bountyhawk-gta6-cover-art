// The editor's controls: size and layout switching, photo picking, panel
// selection, caption and grade inputs, and dragging the preview to pan the
// selected photo. Every change re-renders the live preview.

import { LAYOUTS, SIZES, syncPanelsToLayout } from './state.js';
import { addPhotos, addSample } from './photos.js';
import { drawCover } from './render.js';
import { exportPng } from './export.js';

const $ = (id) => document.getElementById(id);

export function wireUi(state, preview) {
  const render = () => {
    drawCover(preview, state);
    $('stageLabel').textContent =
      `${LAYOUTS[state.layoutKey].label} · ${SIZES[state.sizeKey].label}`;
    renderPanelStrip(state);
    renderPhotoList(state);
    syncPanelControls(state);
  };

  // -- size -----------------------------------------------------------------
  for (const btn of document.querySelectorAll('.size-btn')) {
    btn.addEventListener('click', () => {
      state.sizeKey = btn.dataset.size;
      document.querySelectorAll('.size-btn').forEach((b) => b.classList.toggle('active', b === btn));
      preview.width = SIZES[state.sizeKey].width;
      preview.height = SIZES[state.sizeKey].height;
      render();
    });
  }

  // -- layout ---------------------------------------------------------------
  for (const btn of document.querySelectorAll('.layout-btn')) {
    btn.addEventListener('click', () => {
      state.layoutKey = btn.dataset.layout;
      syncPanelsToLayout(state);
      document.querySelectorAll('.layout-btn').forEach((b) => b.classList.toggle('active', b === btn));
      render();
    });
  }

  // -- photos ---------------------------------------------------------------
  $('photoInput').addEventListener('change', async (event) => {
    const files = [...event.target.files];
    event.target.value = '';
    if (files.length === 0) return;
    try {
      await addPhotos(state, files);
    } catch (err) {
      alert(err.message);
    }
    render();
  });
  for (const btn of document.querySelectorAll('.sample-btn')) {
    btn.addEventListener('click', async () => {
      const index = await addSample(state, btn.dataset.sample, btn.textContent.replace('Sample: ', ''));
      state.panels[state.selectedPanel].photoIndex = index;
      render();
    });
  }
  $('fillAllBtn').addEventListener('click', () => {
    if (state.photos.length === 0) return;
    const index = state.panels[state.selectedPanel].photoIndex;
    for (const panel of state.panels) panel.photoIndex = index;
    render();
  });

  // -- selected panel ---------------------------------------------------------
  $('panelPhoto').addEventListener('change', (event) => {
    state.panels[state.selectedPanel].photoIndex = Number(event.target.value);
    render();
  });
  $('zoomRange').addEventListener('input', (event) => {
    state.panels[state.selectedPanel].zoom = Number(event.target.value);
    $('zoomVal').textContent = `${state.panels[state.selectedPanel].zoom.toFixed(2)}×`;
    render();
  });
  $('filterSelect').addEventListener('change', (event) => {
    state.panels[state.selectedPanel].filter = event.target.value;
    render();
  });
  $('resetPanelBtn').addEventListener('click', () => {
    const panel = state.panels[state.selectedPanel];
    panel.dx = 0;
    panel.dy = 0;
    panel.zoom = 1;
    render();
  });

  // -- caption ----------------------------------------------------------------
  $('captionInput').addEventListener('input', (event) => {
    state.caption = event.target.value;
    render();
  });
  $('captionSize').addEventListener('input', (event) => {
    state.captionSize = Number(event.target.value);
    $('captionSizeVal').textContent = String(state.captionSize);
    render();
  });
  $('captionPos').addEventListener('change', (event) => {
    state.captionPosition = event.target.value;
    render();
  });
  $('captionStyle').addEventListener('change', (event) => {
    state.captionStyle = event.target.value;
    render();
  });

  // -- finish -----------------------------------------------------------------
  $('glowRange').addEventListener('input', (event) => {
    state.glow = Number(event.target.value) / 100;
    $('glowVal').textContent = `${event.target.value}%`;
    render();
  });
  $('vignetteCheck').addEventListener('change', (event) => {
    state.vignette = event.target.checked;
    render();
  });
  $('grainCheck').addEventListener('change', (event) => {
    state.grain = event.target.checked;
    render();
  });
  $('exportBtn').addEventListener('click', async () => {
    try {
      await exportPng(state);
    } catch (err) {
      alert(err.message);
    }
  });

  // -- drag to pan the selected photo, wheel to zoom ---------------------------
  let dragging = null;
  preview.addEventListener('pointerdown', (event) => {
    dragging = { x: event.clientX, y: event.clientY };
    preview.setPointerCapture(event.pointerId);
  });
  preview.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const rect = preview.getBoundingClientRect();
    const panel = state.panels[state.selectedPanel];
    panel.dx += (event.clientX - dragging.x) / rect.width;
    panel.dy += (event.clientY - dragging.y) / rect.height;
    panel.dx = Math.max(-1, Math.min(1, panel.dx));
    panel.dy = Math.max(-1, Math.min(1, panel.dy));
    dragging = { x: event.clientX, y: event.clientY };
    render();
  });
  const endDrag = () => { dragging = null; };
  preview.addEventListener('pointerup', endDrag);
  preview.addEventListener('pointercancel', endDrag);
  preview.addEventListener('wheel', (event) => {
    event.preventDefault();
    const panel = state.panels[state.selectedPanel];
    panel.zoom = Math.max(1, Math.min(3, panel.zoom * (event.deltaY < 0 ? 1.08 : 0.93)));
    render();
  }, { passive: false });

  // -- panel strip + photo list (rebuilt on every render) -----------------------
  function renderPanelStrip(state) {
    const strip = $('panelStrip');
    strip.innerHTML = '';
    state.panels.forEach((panel, i) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = `panel-chip${i === state.selectedPanel ? ' active' : ''}`;
      const photo = state.photos[panel.photoIndex];
      chip.textContent = `Panel ${i + 1}${photo ? ` · ${photo.name}` : ' · empty'}`;
      chip.addEventListener('click', () => {
        state.selectedPanel = i;
        render();
      });
      strip.appendChild(chip);
    });
  }

  function renderPhotoList(state) {
    const list = $('photoList');
    list.innerHTML = '';
    state.photos.forEach((photo, i) => {
      const row = document.createElement('div');
      row.className = 'photo-item';
      const label = document.createElement('span');
      label.textContent = `${i + 1}. ${photo.name}`;
      const use = document.createElement('button');
      use.type = 'button';
      use.textContent = 'Use in selected panel';
      use.addEventListener('click', () => {
        state.panels[state.selectedPanel].photoIndex = i;
        render();
      });
      row.append(label, use);
      list.appendChild(row);
    });
    const select = $('panelPhoto');
    select.innerHTML = '';
    state.photos.forEach((photo, i) => {
      const option = document.createElement('option');
      option.value = String(i);
      option.textContent = photo.name;
      select.appendChild(option);
    });
    select.value = String(state.panels[state.selectedPanel].photoIndex ?? 0);
  }

  function syncPanelControls(state) {
    const panel = state.panels[state.selectedPanel];
    $('zoomRange').value = String(panel.zoom);
    $('zoomVal').textContent = `${panel.zoom.toFixed(2)}×`;
    $('filterSelect').value = panel.filter;
  }

  render();
  return render;
}
