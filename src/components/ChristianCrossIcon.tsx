import type { CSSProperties } from 'react';

interface ChristianCrossIconProps {
  size?: number;
  style?: CSSProperties;
  className?: string;
}

export const ChristianCrossIcon = ({ size = 20, style, className }: ChristianCrossIconProps) => (
  <svg
    aria-hidden="true"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    style={style}
    className={className}
  >
    <path d="M10 22V10H4V7h6V2h4v5h6v3h-6v12z" />
  </svg>
);
