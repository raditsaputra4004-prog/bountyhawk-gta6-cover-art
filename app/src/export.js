// Exporting: render the cover at full post size and hand the browser a PNG
// download. Nothing leaves the machine — the file is written locally.

import { drawCover } from './render.js';
import { SIZES } from './state.js';

export function exportFileName(state) {
  const size = SIZES[state.sizeKey];
  const slug = (state.caption || 'cover').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cover';
  return `golden-hour-${slug}-${size.width}x${size.height}.png`;
}

export function exportPng(state) {
  return new Promise((resolve, reject) => {
    const canvas = drawCover(document.createElement('canvas'), state);
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('the browser could not write the PNG'));
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = exportFileName(state);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      resolve(blob);
    }, 'image/png');
  });
}
