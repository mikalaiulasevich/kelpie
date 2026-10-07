/** Decorative diagrams explain the product without presenting invented analytics. */
export function JourneyIllustration(): UIElement {
  return (
    <svg
      className="flow-illustration journey-illustration"
      viewBox="0 0 320 150"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        className="flow-guide"
        d="M28 75H115C145 75 140 32 174 32H285M115 75C145 75 140 118 174 118H285"
      />
      <path className="flow-route" d="M28 75H115C145 75 140 32 174 32H285" />
      <g className="flow-node">
        <rect x="16" y="51" width="48" height="48" rx="16" />
        <path d="M31 75h18m-7-7 7 7-7 7" />
      </g>
      <g className="flow-node flow-node-middle">
        <rect x="104" y="51" width="48" height="48" rx="16" />
        <path d="m128 63 12 12-12 12-12-12Z" />
      </g>
      <g className="flow-node flow-node-success">
        <rect x="235" y="9" width="62" height="46" rx="16" />
        <path d="m255 32 7 7 14-14" />
      </g>
      <g className="flow-node flow-node-muted">
        <rect x="235" y="95" width="62" height="46" rx="16" />
        <path d="M257 118h18" />
      </g>
      <circle className="flow-signal" cx="188" cy="32" r="4" />
    </svg>
  );
}

export function ExperimentIllustration(): UIElement {
  return (
    <svg
      className="flow-illustration experiment-illustration"
      viewBox="0 0 240 100"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path className="flow-guide" d="M25 50h45c20 0 14-28 38-28h30M70 50c20 0 14 28 38 28h30" />
      <circle className="flow-origin" cx="25" cy="50" r="9" />
      <g className="flow-node">
        <rect x="134" y="4" width="80" height="36" rx="12" />
        <text x="174" y="27" textAnchor="middle">
          A
        </text>
      </g>
      <g className="flow-node flow-node-success">
        <rect x="134" y="60" width="80" height="36" rx="12" />
        <text x="174" y="83" textAnchor="middle">
          B
        </text>
      </g>
    </svg>
  );
}

export function VersionIllustration(): UIElement {
  return (
    <svg
      className="flow-illustration version-illustration"
      viewBox="0 0 240 110"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <g className="flow-node flow-layer-back">
        <rect x="90" y="12" width="78" height="82" rx="14" />
      </g>
      <g className="flow-node flow-layer-middle">
        <rect x="72" y="20" width="78" height="82" rx="14" />
      </g>
      <g className="flow-node">
        <rect x="54" y="28" width="78" height="76" rx="14" />
        <path d="M75 50v23a9 9 0 0 0 9 9h25M75 62h34" />
        <circle cx="75" cy="47" r="4" />
        <circle cx="111" cy="62" r="4" />
        <circle cx="111" cy="82" r="4" />
      </g>
      <circle className="flow-origin" cx="178" cy="74" r="17" />
      <path className="flow-check" d="m171 74 5 5 10-11" />
    </svg>
  );
}
