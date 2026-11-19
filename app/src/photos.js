// Golden Hour Cover Studio — photos.
//
// Photos arrive three ways: the two bundled code-drawn samples, a file the
// user picks on their own machine, or a copy of another panel's photo.
// Nothing is ever uploaded: a picked file is read with FileReader into a
// data URL and drawn from memory.

export const SAMPLE_SUNSET = 'samples/sample-sunset.jpg';
export const SAMPLE_NEON = 'samples/sample-neon.jpg';

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load image: ${src}`));
    img.src = src;
  });
}

export function readPickedFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('could not read that file'));
    reader.readAsDataURL(file);
  });
}

// Put a loaded image into one panel slot, keeping its pan and zoom.
export function setPanelPhoto(state, index, image, src) {
  const panel = state.panels[index];
  panel.image = image;
  panel.src = src;
}

// Copy the selected panel's photo into every panel of the current layout.
export function fillAllPanels(state) {
  const source = state.panels[state.selected];
  if (!source.image) return false;
  const n = state.layout === 'quad' ? 4 : 3;
  for (let i = 0; i < n; i++) {
    state.panels[i].image = source.image;
    state.panels[i].src = source.src;
  }
  return true;
}

// Draw one photo into its panel rect, honouring zoom and the anchor
// point: the anchor (0..1 across the photo) sits at the panel centre,
// and zoom scales the photo around it. The photo always covers the rect.
export function drawPhotoInto(ctx, image, rect, zoom, anchorX, anchorY) {
  const photoAspect = image.naturalWidth / image.naturalHeight;
  const rectAspect = rect.w / rect.h;
  let dw;
  let dh;
  if (photoAspect > rectAspect) {
    dh = rect.h * zoom;
    dw = dh * photoAspect;
  } else {
    dw = rect.w * zoom;
    dh = dw / photoAspect;
  }
  const dx = rect.x + rect.w / 2 - dw * anchorX;
  const dy = rect.y + rect.h / 2 - dh * anchorY;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(image, dx, dy, dw, dh);
  ctx.restore();
}
