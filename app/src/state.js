// The cover's state: which size, layout, photos, per-panel crop, caption and grade.
// Everything the renderer needs lives here, so the preview, the export and the
// demo mode all draw from the same state object.

export const SIZES = {
  square: { label: '1080 × 1080', width: 1080, height: 1080 },
  portrait: { label: '1080 × 1350', width: 1080, height: 1350 },
  wide: { label: '1920 × 1080', width: 1920, height: 1080 },
};

// Panel rectangles as fractions of the cover (x, y, w, h). The caption band takes
// the top or bottom 18%; the panels fill the rest.
export const LAYOUTS = {
  triptych: {
    label: 'Triptych',
    panels: [
      { x: 0.0, y: 0, w: 1 / 3, h: 1 },
      { x: 1 / 3, y: 0, w: 1 / 3, h: 1 },
      { x: 2 / 3, y: 0, w: 1 / 3, h: 1 },
    ],
  },
  hero: {
    label: 'Hero + Strip',
    panels: [
      { x: 0.0, y: 0, w: 0.62, h: 1 },
      { x: 0.62, y: 0, w: 0.38, h: 0.5 },
      { x: 0.62, y: 0.5, w: 0.38, h: 0.5 },
    ],
  },
  quad: {
    label: 'Quad',
    panels: [
      { x: 0.0, y: 0, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0, w: 0.5, h: 0.5 },
      { x: 0.0, y: 0.5, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
    ],
  },
};

export const FILTERS = {
  sunset: 'saturate(1.5) contrast(1.08) sepia(0.28) brightness(1.02)',
  neon: 'saturate(1.9) contrast(1.15) hue-rotate(-18deg)',
  vivid: 'saturate(1.7) contrast(1.12)',
  mono: 'grayscale(1) contrast(1.1)',
  original: 'none',
};

export const CAPTION_STYLES = {
  white: { fill: '#ffffff', stroke: '#14081e', shadow: 'rgba(0,0,0,0.55)' },
  gold: { fill: '#ffd23f', stroke: '#1c0a00', shadow: 'rgba(0,0,0,0.6)' },
  neon: { fill: '#ff5da2', stroke: '#2a0033', shadow: 'rgba(255,45,149,0.7)' },
  black: { fill: '#14101d', stroke: '#ffffff', shadow: 'rgba(255,255,255,0.35)' },
};

function freshPanel(photoIndex) {
  return { photoIndex, zoom: 1, dx: 0, dy: 0, filter: 'sunset' };
}

export function defaultState() {
  return {
    sizeKey: 'square',
    layoutKey: 'triptych',
    selectedPanel: 0,
    // photos: [{ name, img }] — img is an HTMLImageElement, loaded locally.
    photos: [],
    panels: [freshPanel(0), freshPanel(0), freshPanel(0)],
    caption: 'GOLDEN HOUR',
    captionSize: 96,
    captionPosition: 'bottom',
    captionStyle: 'white',
    glow: 0.6,
    vignette: true,
    grain: true,
  };
}

// Keep the panel list in step with the layout: reuse a panel's settings when the
// layout still has that slot, otherwise start it fresh.
export function syncPanelsToLayout(state) {
  const count = LAYOUTS[state.layoutKey].panels.length;
  const next = [];
  for (let i = 0; i < count; i++) next.push(state.panels[i] ?? freshPanel(0));
  state.panels = next;
  state.selectedPanel = Math.min(state.selectedPanel, count - 1);
}
