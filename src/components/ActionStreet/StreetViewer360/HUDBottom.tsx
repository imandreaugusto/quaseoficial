import { useState } from 'react';
import { ChevronUp, MapPin } from 'lucide-react';

interface Props {
  title: string;
  text: string;
}

export default function HUDBottom({ title, text }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20">
      {/* Collapsible panel */}
      <div
        className={`bg-black/60 backdrop-blur-md border-t border-white/20 transition-all duration-300 overflow-hidden ${
          isExpanded ? 'max-h-96' : 'max-h-20'
        }`}
      >
        {/* Header - always visible */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-6 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-orange-400" />
            <span className="font-semibold text-white">{title}</span>
          </div>
          <ChevronUp
            className={`w-5 h-5 text-white/60 transition-transform ${
              isExpanded ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* Content - expanded */}
        {isExpanded && (
          <div className="px-6 pb-4 text-white/80 text-sm leading-relaxed max-h-64 overflow-y-auto">
            <p>{text}</p>

            {/* Call to action */}
            <div className="mt-4 p-3 bg-white/5 rounded border border-white/10 text-xs text-white/60">
              💡 Clique nos números para aprender vocabulário relacionado ao local
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
