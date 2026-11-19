// Boot: build the default state, wire the editor, load the caption font, and
// optionally stage a demo cover from the URL (?demo=triptych|hero|quad with an
// optional &size=square|portrait|wide and &caption=...). The demo is how the
// screenshots are staged reproducibly; it uses only the bundled samples.

import { defaultState, syncPanelsToLayout } from './state.js';
import { addSample } from './photos.js';
import { wireUi } from './ui.js';
import { drawCover } from './render.js';
import { exportPng } from './export.js';
import { SIZES } from './state.js';

const state = defaultState();
const preview = document.getElementById('preview');
const render = wireUi(state, preview);

// Test hooks for the maker's own Playwright checks (not part of the UI).
window.__goldenHour = { state, render, drawCover, exportPng };

function setSizeButtons(sizeKey) {
  for (const btn of document.querySelectorAll('.size-btn')) {
    btn.classList.toggle('active', btn.dataset.size === sizeKey);
  }
  preview.width = SIZES[sizeKey].width;
  preview.height = SIZES[sizeKey].height;
}

function setLayoutButtons(layoutKey) {
  for (const btn of document.querySelectorAll('.layout-btn')) {
    btn.classList.toggle('active', btn.dataset.layout === layoutKey);
  }
}

async function applyDemo() {
  const params = new URLSearchParams(location.search);
  const demo = params.get('demo');
  if (!demo) return;
  const layouts = { triptych: 'triptych', hero: 'hero', quad: 'quad' };
  if (!layouts[demo]) return;
  const size = params.get('size');
  if (size && SIZES[size]) {
    state.sizeKey = size;
    setSizeButtons(size);
  }
  const caption = params.get('caption');
  if (caption) {
    state.caption = caption;
    document.getElementById('captionInput').value = caption;
  }
  state.layoutKey = layouts[demo];
  setLayoutButtons(state.layoutKey);
  syncPanelsToLayout(state);
  const sunset = await addSample(state, 'samples/sample-sunset.jpg', 'Sunset');
  const neon = await addSample(state, 'samples/sample-neon.jpg', 'Neon');
  const picks = demo === 'hero' ? [neon, sunset, neon] : [sunset, neon, sunset, neon];
  state.panels.forEach((panel, i) => { panel.photoIndex = picks[i % picks.length]; });
  render();
}

// The caption font must be ready before the first real paint, or the letters
// fall back to a system font for one frame.
document.fonts.load('700 96px "CoverFont"').catch(() => {}).finally(() => {
  applyDemo().then(render).catch((err) => console.error(err));
});
