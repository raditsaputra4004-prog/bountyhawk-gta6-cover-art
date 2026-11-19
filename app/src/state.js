// The cover's state: one plain object, mutated only through the helpers
// here, so the preview, the export and the controls always agree.

export const LAYOUTS = {
  triptych: { panels: 3, label: 'Triptych' },
  hero: { panels: 3, label: 'Hero + Strip' },
  quad: { panels: 4, label: 'Quad 2×2' },
};

export const GRADES = ['original', 'sunset', 'neon', 'vivid', 'mono'];

export const EXPORT_SIZES = {
  '1080x1080': { width: 1080, height: 1080, label: '1080 × 1080' },
  '1080x1350': { width: 1080, height: 1350, label: '1080 × 1350' },
  '1920x1080': { width: 1920, height: 1080, label: '1920 × 1080' },
};

export const CAPTION_STYLES = ['outline', 'sunset', 'neon'];

export function emptyPanel() {
  return { photo: null, zoom: 1, dx: 0, dy: 0 };
}

export function freshState() {
  return {
    layout: 'triptych',
    panels: [emptyPanel(), emptyPanel(), emptyPanel(), emptyPanel()],
    selected: 0,
    caption: { text: 'NEON NIGHTS', size: 110, place: 'bottom', style: 'outline' },
    grade: 'sunset',
    glow: 0.55,
    vignette: true,
    grain: true,
    exportSize: '1920x1080',
  };
}

// How many panels the current layout actually draws.
export function panelCount(state) {
  return LAYOUTS[state.layout].panels;
}

// The rectangles each panel occupies on a cover of the given size, as
// fractions turned into pixels. A thin gutter separates the panels, the
// poster's signature look.
export function panelRects(state, width, height) {
  const gap = Math.round(width * 0.012);
  if (state.layout === 'triptych') {
    const w = Math.floor((width - gap * 2) / 3);
    return [0, 1, 2].map((i) => ({ x: i * (w + gap), y: 0, w, h: height }));
  }
  if (state.layout === 'hero') {
    const heroW = Math.floor(width * 0.62);
    const stripX = heroW + gap;
    const stripW = width - stripX;
    const stripH = Math.floor((height - gap) / 2);
    return [
      { x: 0, y: 0, w: heroW, h: height },
      { x: stripX, y: 0, w: stripW, h: stripH },
      { x: stripX, y: stripH + gap, w: stripW, h: stripH },
    ];
  }
  const w = Math.floor((width - gap) / 2);
  const h = Math.floor((height - gap) / 2);
  return [
    { x: 0, y: 0, w, h },
    { x: w + gap, y: 0, w, h },
    { x: 0, y: h + gap, w, h },
    { x: w + gap, y: h + gap, w, h },
  ];
}
