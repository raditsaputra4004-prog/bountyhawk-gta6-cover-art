// Boot: bring the editor up. Size the preview to the export size's
// aspect, load the sunset sample into the first panel so the app opens
// with cover art on screen, then hand the controls over to ui.js.

import { freshState, EXPORT_SIZES } from './state.js';
import { drawCover } from './render.js';
import { loadSample } from './photos.js';
import { initControls } from './ui.js';

const PREVIEW_LONG_SIDE = 900;

const state = freshState();
const preview = document.getElementById('preview');

// Size the preview canvas to the chosen export size's aspect at a
// display-friendly resolution.
function sizePreview() {
  const size = EXPORT_SIZES[state.exportSize] ?? EXPORT_SIZES['1920x1080'];
  const scale = PREVIEW_LONG_SIDE / Math.max(size.width, size.height);
  preview.width = Math.round(size.width * scale);
  preview.height = Math.round(size.height * scale);
}

function redraw() {
  sizePreview();
  const ctx = preview.getContext('2d');
  drawCover(ctx, preview.width, preview.height, state);
}

// Wait for the caption font, then draw — the first paint should already
// carry the poster's lettering.
function start() {
  initControls(state, redraw);
  redraw();
  loadSample('sunset')
    .then((img) => {
      state.panels[0].photo = img;
      redraw();
    })
    .catch(() => {
      // The app still works without the sample; the panel shows its
      // placeholder until the user loads a photo.
    });
}

if (document.fonts && document.fonts.load) {
  document.fonts.load('900 110px "GoldenHour"').finally(start);
} else {
  start();
}
