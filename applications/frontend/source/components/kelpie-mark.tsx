/** Brand geometry from the user-provided Kelpie landing page. */
export function KelpieMark(): UIElement {
  return (
    <svg viewBox="12 0 84 96" className="kelpie-mark" aria-hidden="true" focusable="false">
      <polygon
        fill="var(--brand-primary)"
        points="28,96 28,58 26,48 24,44 16,8 34,38 40,38 52,2 62,36 66,44 68,48 92,56 92,61 66,66 60,72 54,82 58,96"
      />
      <polygon fill="var(--brand-detail)" points="45,34 52,7 58,32" />
      <polygon fill="var(--brand-detail)" points="44,96 58,96 54,82 46,87" />
      <polygon fill="var(--background)" points="55,47 63,49.5 57,53 53,50" />
      <polygon fill="var(--foreground)" points="56,47.8 59.5,48.9 56.5,50.2" />
    </svg>
  );
}
