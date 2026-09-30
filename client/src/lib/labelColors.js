// Label colours are chosen by people, so they are data, not interface chrome. These are the swatches
// offered in the picker; any stored #rrggbb value is rendered as is, with text picked for contrast.
export const LABEL_SWATCHES = [
  '#b3382c', '#b45309', '#a16207', '#4d7c0f', '#0f766e',
  '#0b6580', '#1d4ed8', '#6b7280', '#9a3412', '#be185d',
];

function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Black or white text, whichever contrasts more with the label colour.
export function textOn(hex) {
  const l = luminance(hex);
  return (1.05 / (l + 0.05)) >= ((l + 0.05) / 0.05) ? '#ffffff' : '#111111';
}
