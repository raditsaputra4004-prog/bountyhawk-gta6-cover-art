// Golden Hour Cover Studio — boot.
//
// Starts the editor: sizes the preview canvas to the chosen export
// aspect, loads the two bundled samples into the first panels, wires the
// controls, and paints the first preview. The app is plain static files;
// if a sample fails to load, the editor still opens with empty panels.

import { freshState, exportDims } from './state.js';
import { loadImage, SAMPLE_SUNSET, SAMPLE_NEON } from './photos.js';
import { drawCover } from './render.js';
import { wireControls } from './ui.js';

const state = freshState();
const canvas = document.getElementById('preview');

function sizePreview() {
  const { w, h } = exportDims(state.exportSize);
  // Preview resolution: same aspect as the export, capped at 960 wide.
  const scale = Math.min(1, 960 / w);
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
}

function redraw() {
  sizePreview();
  const ctx = canvas.getContext('2d');
  drawCover(ctx, state, canvas.width, canvas.height);
}

async function loadSamples() {
  try {
    const sunset = await loadImage(SAMPLE_SUNSET);
    state.panels[0].image = sunset;
    state.panels[0].src = SAMPLE_SUNSET;
  } catch (err) {
    console.warn(err.message);
  }
  try {
    const neon = await loadImage(SAMPLE_NEON);
    state.panels[1].image = neon;
    state.panels[1].src = SAMPLE_NEON;
    if (state.layout !== 'quad') {
      state.panels[2].image = neon;
      state.panels[2].src = SAMPLE_NEON;
    }
  } catch (err) {
    console.warn(err.message);
  }
}

wireControls(state, redraw);
await loadSamples();
redraw();
