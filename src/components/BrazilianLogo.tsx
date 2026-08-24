import React from 'react';

interface BrazilianLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  variant?: 'full' | 'monogram' | 'icon' | 'vector' | 'badge' | 'image';
  showText?: boolean;
}

export const BrazilianLogo: React.FC<BrazilianLogoProps> = ({
  className = '',
  size = 'md',
  variant = 'full',
  showText = true,
}) => {
  const sizeMap = {
    xs: { height: 22, textTop: 'text-[9px]', textBot: 'text-[9px]', bWidth: 22, bHeight: 26, gap: 'gap-1.5' },
    sm: { height: 30, textTop: 'text-[11px]', textBot: 'text-[11px]', bWidth: 28, bHeight: 32, gap: 'gap-2' },
    md: { height: 42, textTop: 'text-sm', textBot: 'text-sm', bWidth: 38, bHeight: 44, gap: 'gap-2.5' },
    lg: { height: 56, textTop: 'text-lg', textBot: 'text-lg', bWidth: 50, bHeight: 58, gap: 'gap-3.5' },
    xl: { height: 74, textTop: 'text-2xl', textBot: 'text-2xl', bWidth: 66, bHeight: 76, gap: 'gap-4' },
    '2xl': { height: 96, textTop: 'text-3xl', textBot: 'text-3xl', bWidth: 86, bHeight: 98, gap: 'gap-5' },
  };

  const currentSize = sizeMap[size];
  const isMonogramOnly = variant === 'monogram' || variant === 'icon' || !showText;

  // The Iconic Stylized 'B' SVG with American Flag Palette (USA Red, Navy Blue & Pure White)
  const renderIconicB = () => (
    <div
      className="relative shrink-0 flex items-center justify-center select-none"
      style={{ width: `${currentSize.bWidth}px`, height: `${currentSize.bHeight}px` }}
    >
      <svg
        viewBox="0 0 160 175"
        className="w-full h-full drop-shadow-[0_3px_10px_rgba(239,30,40,0.45)]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Left Vertical Pinstripes (US flag influence) */}
        <line x1="12" y1="52" x2="12" y2="120" stroke="#FFFFFF" strokeWidth="2.5" strokeOpacity="0.8" />
        <line x1="17" y1="52" x2="17" y2="120" stroke="#FFFFFF" strokeWidth="2.5" strokeOpacity="0.8" />

        {/* Top-Right Red Accent Square */}
        <rect x="118" y="10" width="18" height="18" fill="#EF1E28" rx="2" />

        {/* Bottom-Right Geometric Triangle Accent */}
        <polygon points="120,158 152,158 136,128" stroke="#EF1E28" strokeWidth="2.5" fill="none" strokeOpacity="0.85" />
        <circle cx="120" cy="158" r="1.5" fill="#EF1E28" />
        <circle cx="152" cy="158" r="1.5" fill="#EF1E28" />
        <circle cx="136" cy="128" r="1.5" fill="#EF1E28" />

        {/* Outer Red Outline B Shape */}
        <path
          d="M 32 30 
             H 95 
             C 118 30 134 44 134 64 
             C 134 76 126 86 114 91 
             C 128 96 138 108 138 126 
             C 138 148 119 160 95 160 
             H 32 
             Z"
          fill="#EF1E28"
          stroke="#EF1E28"
          strokeWidth="3"
          strokeLinejoin="round"
        />

        {/* Inner Solid White B Core */}
        <path
          d="M 38 36 
             H 94 
             C 114 36 127 48 127 64 
             C 127 75 119 84 106 87 
             C 121 91 130 102 130 124 
             C 130 143 115 154 94 154 
             H 38 
             Z"
          fill="#FFFFFF"
        />

        {/* Upper Counter Cutout (Red with 3D Depth) */}
        <g>
          {/* Shadow layer */}
          <path
            d="M 60 52 H 88 C 96 52 102 57 102 65 C 102 73 96 78 88 78 H 60 Z"
            fill="#B91C1C"
          />
          {/* Main Cutout */}
          <path
            d="M 60 52 H 86 C 94 52 99 57 99 64 C 99 71 94 76 86 76 H 60 Z"
            fill="#EF1E28"
          />
          {/* Inner Navy shadow bar */}
          <rect x="66" y="58" width="16" height="12" rx="2" fill="#0A1C43" />
        </g>

        {/* Lower Counter Cutout (Red with 3D Depth) */}
        <g>
          {/* Shadow layer */}
          <path
            d="M 60 98 H 92 C 101 98 108 104 108 114 C 108 124 101 130 92 130 H 60 Z"
            fill="#B91C1C"
          />
          {/* Main Cutout */}
          <path
            d="M 60 98 H 90 C 98 98 105 104 105 113 C 105 122 98 128 90 128 H 60 Z"
            fill="#EF1E28"
          />
          {/* Inner Navy shadow bar */}
          <rect x="66" y="104" width="18" height="15" rx="2" fill="#0A1C43" />
        </g>

        {/* 5 US Flag Stars Stacked Vertically in White Stem (⭐⭐⭐⭐⭐) */}
        {[48, 70, 92, 114, 136].map((y, idx) => (
          <path
            key={idx}
            d={`M 44 ${y} L 45.2 ${y-2.5} L 46.5 ${y} L 49.2 ${y+0.4} L 47.2 ${y+2.2} L 48 ${y+4.8} L 45.8 ${y+3.3} L 43.5 ${y+4.8} L 44.3 ${y+2.2} L 42.4 ${y+0.4} Z`}
            stroke="#EF1E28"
            strokeWidth="0.75"
            fill="#FFFFFF"
          />
        ))}
      </svg>
    </div>
  );

  if (isMonogramOnly) {
    return (
      <div className={`inline-flex items-center justify-center ${className}`}>
        {renderIconicB()}
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center select-none ${currentSize.gap} ${className}`}>
      {renderIconicB()}

      {/* Brand Typography (BRAZILIAN IN ACTION) */}
      <div className="flex flex-col justify-center leading-none tracking-tight">
        {/* Upper Line: BRAZILIAN */}
        <div className="flex items-center gap-1">
          <span
            className={`font-black uppercase tracking-wider text-white ${currentSize.textTop}`}
            style={{
              fontFamily: `'Impact', 'Montserrat', 'Arial Black', sans-serif`,
              letterSpacing: '0.04em',
              textShadow: '0 2px 6px rgba(0,0,0,0.85), 0 0 1px #EF1E28'
            }}
          >
            BRAZILIAN
          </span>
          {/* Small Red Square Accent */}
          <span className="w-1.5 h-1.5 bg-[#EF1E28] rounded-[1px] inline-block -mt-1.5 shadow-sm shadow-red-500" />
        </div>

        {/* Lower Line: IN ACTION */}
        <div className="flex items-center gap-1 mt-0.5">
          <span
            className={`font-black uppercase tracking-widest text-white ${currentSize.textBot}`}
            style={{
              fontFamily: `'Impact', 'Montserrat', 'Arial Black', sans-serif`,
              letterSpacing: '0.08em',
              textShadow: '0 2px 6px rgba(0,0,0,0.85), 0 0 1px #EF1E28'
            }}
          >
            IN ACTION
          </span>
          {/* Subtle triangle line */}
          <svg viewBox="0 0 16 16" className="w-2.5 h-2.5 text-[#EF1E28] stroke-current fill-none stroke-[2] -mb-0.5">
            <polygon points="1,14 15,14 8,2" />
          </svg>
        </div>
      </div>
    </div>
  );
};
