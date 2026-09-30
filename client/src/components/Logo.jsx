// The Huddle mark in a small rounded tile. The image has its own light background, so it reads the same in both themes.
export function Logo({ size = 28 }) {
  return <img className="logo" src="/logo.png" alt="" width={size} height={size} />;
}

// Mark plus name. `name` can be hidden (icon rail) with the `label` class.
export function Wordmark({ size = 28 }) {
  return (
    <span className="wordmark-row">
      <Logo size={size} />
      <span className="label wordmark-text">Huddle</span>
    </span>
  );
}
