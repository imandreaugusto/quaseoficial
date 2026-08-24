import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Camera, RefreshCw, X, Maximize2, Minimize2, Move, AlertCircle } from 'lucide-react';

interface GlobalFloatingCameraProps {
  isActive: boolean;
  onClose: () => void;
}

export const GlobalFloatingCamera: React.FC<GlobalFloatingCameraProps> = ({ isActive, onClose }) => {
  const [size, setSize] = useState<'sm' | 'md' | 'lg'>('md'); // sm: 128px, md: 176px, lg: 240px
  const [isFlipped, setIsFlipped] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Start / Stop camera stream based on isActive
  useEffect(() => {
    let isMounted = true;

    async function startCamera() {
      if (!isActive) return;
      setHasError(false);
      setErrorMessage('');

      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Câmera não suportada neste navegador.');
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio: false,
        });

        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      } catch (err: any) {
        if (!isMounted) return;
        setHasError(true);
        const isPermissionDenied =
          err.name === 'NotAllowedError' ||
          err.name === 'PermissionDeniedError' ||
          err.message?.toLowerCase().includes('permission denied');

        setErrorMessage(
          isPermissionDenied
            ? 'Acesso à câmera bloqueado. Permita a câmera no ícone de cadeado do navegador.'
            : 'Câmera não encontrada ou em uso por outro programa.'
        );
      }
    }

    if (isActive) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, [isActive]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const cycleSize = () => {
    if (size === 'sm') setSize('md');
    else if (size === 'md') setSize('lg');
    else setSize('sm');
  };

  if (!isActive) return null;

  // Size dimensions
  const sizeClasses = {
    sm: 'w-32 h-32 sm:w-36 sm:h-36',
    md: 'w-44 h-44 sm:w-52 sm:h-52',
    lg: 'w-60 h-60 sm:w-72 sm:h-72',
  };

  return (
    <motion.div
      drag
      dragMomentum={false}
      initial={{ opacity: 0, scale: 0.8, x: 20, y: -20 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="fixed z-[9999] select-none cursor-grab active:cursor-grabbing group"
      style={{ top: '80px', right: '30px' }}
    >
      <div className={`relative rounded-full border-4 border-amber-400 bg-neutral-950 shadow-[0_15px_40px_rgba(0,0,0,0.85)] overflow-hidden transition-all duration-300 ${sizeClasses[size]}`}>
        {/* WEBCAM VIDEO OR ERROR */}
        {!hasError ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover transition-transform duration-200 ${
              isFlipped ? 'scale-x-[-1]' : ''
            }`}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-neutral-950/95 text-amber-300">
            <AlertCircle size={22} className="mb-1.5 text-amber-400 shrink-0" />
            <span className="text-[10px] font-semibold leading-tight text-white/90 px-1">{errorMessage}</span>
            <div className="flex items-center gap-1.5 mt-2">
              <button
                type="button"
                onClick={() => {
                  setHasError(false);
                  setIsFlipped((f) => !f); // trigger reload
                }}
                className="px-2 py-0.5 rounded-full bg-amber-500 hover:bg-amber-400 text-black text-[9px] font-bold uppercase transition-all cursor-pointer shadow"
              >
                Tentar
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-2 py-0.5 rounded-full bg-white/10 hover:bg-white/20 text-white/70 text-[9px] font-semibold transition-all cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        )}

        {/* HOVER CONTROLS OVERLAY */}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-between p-3 z-20 pointer-events-auto">
          {/* Top Drag Hint */}
          <div className="flex items-center gap-1 text-[10px] text-amber-300 font-extrabold uppercase bg-black/70 px-2 py-0.5 rounded-full border border-amber-400/30">
            <Move size={10} />
            <span>Arraste Livre</span>
          </div>

          {/* Center Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Cycle Size Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                cycleSize();
              }}
              className="p-2 rounded-full bg-neutral-900/90 text-amber-400 hover:bg-amber-400 hover:text-neutral-950 transition-all cursor-pointer shadow border border-amber-400/30"
              title="Mudar tamanho do círculo (Pequeno / Médio / Grande)"
            >
              {size === 'lg' ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>

            {/* Flip / Mirror Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsFlipped(!isFlipped);
              }}
              className="p-2 rounded-full bg-neutral-900/90 text-amber-400 hover:bg-amber-400 hover:text-neutral-950 transition-all cursor-pointer shadow border border-amber-400/30"
              title="Espelhar Câmera"
            >
              <RefreshCw size={14} />
            </button>
          </div>

          {/* Bottom Close Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="flex items-center gap-1 bg-red-600 hover:bg-red-500 text-white font-bold text-[10px] uppercase px-3 py-1 rounded-full shadow cursor-pointer transition-all"
          >
            <X size={12} />
            <span>Fechar Câmera</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
};
