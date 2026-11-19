// Export: render the cover once more, at the full post size, and hand
// the browser a PNG download. The export draws through the same code as
// the preview, so the file matches the screen.

import { EXPORT_SIZES } from './state.js';
import { drawCover } from './render.js';

// Render the cover at one of the post sizes and resolve with a PNG blob.
export function exportCoverPng(state) {
  const size = EXPORT_SIZES[state.exportSize] ?? EXPORT_SIZES['1920x1080'];
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext('2d');
  drawCover(ctx, size.width, size.height, state);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('the browser could not write a PNG'));
    }, 'image/png');
  });
}

// Trigger the download of a blob as a file.
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function exportFilename(state) {
  const size = EXPORT_SIZES[state.exportSize] ?? EXPORT_SIZES['1920x1080'];
  return `golden-hour-${size.width}x${size.height}.png`;
}
