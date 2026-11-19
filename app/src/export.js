// Golden Hour Cover Studio — export.
//
// The export renders the same drawCover() the preview uses, at the full
// post size, into an offscreen canvas, then downloads it as a PNG. No
// server, no upload: the file is made in the browser and saved locally.

import { exportDims } from './state.js';
import { drawCover } from './render.js';

export function renderExport(state) {
  const { w, h } = exportDims(state.exportSize);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  drawCover(ctx, state, w, h);
  return canvas;
}

export function exportPng(state) {
  return new Promise((resolve, reject) => {
    const canvas = renderExport(state);
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('the browser could not make the PNG'));
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const stamp = state.caption.text.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'cover';
      a.href = url;
      a.download = `golden-hour-${stamp}-${state.exportSize}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      resolve({ width: canvas.width, height: canvas.height, bytes: blob.size });
    }, 'image/png');
  });
}
