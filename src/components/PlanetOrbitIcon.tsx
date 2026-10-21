import React from 'react';

interface PlanetOrbitIconProps {
  size?: number;
  style?: React.CSSProperties;
  className?: string;
}

export const PlanetOrbitIcon: React.FC<PlanetOrbitIconProps> = ({
  size = 20,
  style,
  className,
}) => (
  <svg
    aria-hidden="true"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={style}
    className={className}
  >
    <ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(-32 12 12)" />
    <circle cx="12" cy="12" r="4.6" />
    <circle cx="19.5" cy="6.2" r="1" fill="currentColor" stroke="none" />
  </svg>
);
