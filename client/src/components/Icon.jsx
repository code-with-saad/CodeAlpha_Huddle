// Every icon in the app goes through this wrapper so stroke weight and size stay consistent.
export const ICON_STROKE = 1.5;

export default function Icon({ as: Glyph, size = 16, ...rest }) {
  return <Glyph size={size} strokeWidth={ICON_STROKE} aria-hidden="true" focusable="false" {...rest} />;
}
