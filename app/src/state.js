// Golden Hour Cover Studio — state.
//
// One plain object holds everything the editor shows: the layout, the
// grade, the caption, the effects, and one photo slot per panel. Panels
// are counted per layout; the geometry lives in layoutRects() so the
// renderer and the hit-tester agree on every rect.

export const LAYOUTS = {
  triptych: { panels: 3, label: 'Triptych' },
  hero: { panels: 3, label: 'Hero + Strip' },
  quad: { panels: 4, label: 'Quad 2×2' },
};

export const GRADES = ['sunset', 'neon', 'vivid', 'mono', 'original'];

export const EXPORT_SIZES = {
  '1080x1080': { w: 1080, h: 1080 },
  '1080x1350': { w: 1080, h: 1350 },
  '1920x1080': { w: 1920, h: 1080 },
};

const GUTTER = 0.012; // panel gap, as a fraction of the shorter side

function emptyPanel() {
  return { image: null, src: '', zoom: 1.4, anchorX: 0.5, anchorY: 0.5 };
}

export function freshState() {
  return {
    layout: 'triptych',
    grade: 'sunset',
    caption: { text: 'NEON NIGHTS', size: 0.16, y: 0.86, style: 'outline' },
    glow: 0.6,
    vignette: true,
    grain: true,
    exportSize: '1920x1080',
    selected: 0,
    panels: [emptyPanel(), emptyPanel(), emptyPanel(), emptyPanel()],
  };
}

// Panel rectangles for a layout, in fractions of the canvas (x, y, w, h).
// Every layout leaves the same thin gutter between panels.
export function layoutRects(layout, w, h) {
  const g = GUTTER * Math.min(w, h);
  const inset = g / 2;
  if (layout === 'triptych') {
    const pw = (w - 4 * g) / 3;
    return [0, 1, 2].map((i) => ({ x: g + i * (pw + g), y: inset, w: pw, h: h - g }));
  }
  if (layout === 'hero') {
    const heroW = w * 0.62 - g;
    const stripX = w * 0.62 + g / 2;
    const stripW = w - stripX - g;
    const stripH = (h - 3 * g) / 2;
    return [
      { x: inset, y: inset, w: heroW, h: h - g },
      { x: stripX, y: inset, w: stripW, h: stripH },
      { x: stripX, y: inset + stripH + g, w: stripW, h: stripH },
    ];
  }
  // quad: 2×2 grid.
  const cw = (w - 3 * g) / 2;
  const ch = (h - 3 * g) / 2;
  return [
    { x: g, y: g, w: cw, h: ch },
    { x: g + cw + g, y: g, w: cw, h: ch },
    { x: g, y: g + ch + g, w: cw, h: ch },
    { x: g + cw + g, y: g + ch + g, w: cw, h: ch },
  ];
}

export function panelCount(layout) {
  return LAYOUTS[layout].panels;
}

export function exportDims(sizeKey) {
  return EXPORT_SIZES[sizeKey];
}
