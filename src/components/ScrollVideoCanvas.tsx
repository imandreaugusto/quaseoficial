import React, { useEffect, useRef, useState } from 'react';

interface ScrollVideoCanvasProps {
  videoUrl: string;
  targetWidth?: number;
  fit?: 'cover' | 'contain';
  className?: string;
}

export const ScrollVideoCanvas: React.FC<ScrollVideoCanvasProps> = ({
  videoUrl,
  targetWidth = 1280,
  fit = 'cover',
  className = ''
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const framesRef = useRef<ImageBitmap[]>([]);
  const dimensionsRef = useRef({ width: 0, height: 0 });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !videoUrl) return;

    let cancelled = false;
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) return;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(canvas.clientWidth * ratio));
      canvas.height = Math.max(1, Math.round(canvas.clientHeight * ratio));
      drawFrame(lastFrame);
    };

    let lastFrame = 0;
    const drawFrame = (index: number) => {
      const frame = framesRef.current[index];
      const { width: sourceWidth, height: sourceHeight } = dimensionsRef.current;
      if (!frame || !sourceWidth || !sourceHeight || !canvas.width || !canvas.height) return;

      const scale = fit === 'cover'
        ? Math.max(canvas.width / sourceWidth, canvas.height / sourceHeight)
        : Math.min(canvas.width / sourceWidth, canvas.height / sourceHeight);
      const width = sourceWidth * scale;
      const height = sourceHeight * scale;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(frame, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
      lastFrame = index;
    };

    const render = () => {
      const bounds = canvas.getBoundingClientRect();
      const range = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const progress = Math.min(1, Math.max(0, (window.scrollY + bounds.top) / range));
      drawFrame(Math.round(progress * Math.max(0, framesRef.current.length - 1)));
    };

    const capture = async () => {
      if (cancelled || !video.videoWidth || !video.videoHeight) return;
      const duration = video.duration || 1;
      const step = 1 / 24;
      const frames: ImageBitmap[] = [];
      for (let time = 0; time < duration && !cancelled; time += step) {
        video.currentTime = time;
        await new Promise<void>((resolve) => video.addEventListener('seeked', () => resolve(), { once: true }));
        const bitmap = await createImageBitmap(video, targetWidth > 0 ? {
          resizeWidth: targetWidth,
          resizeHeight: Math.round(targetWidth * video.videoHeight / video.videoWidth),
          resizeQuality: 'high'
        } : undefined);
        frames.push(bitmap);
      }
      if (cancelled || !frames.length) return;
      framesRef.current = frames;
      dimensionsRef.current = { width: frames[0].width, height: frames[0].height };
      resize();
      drawFrame(0);
      setIsReady(true);
      render();
    };

    const start = () => { void capture(); };
    video.addEventListener('loadedmetadata', start, { once: true });
    window.addEventListener('resize', resize);
    window.addEventListener('scroll', render, { passive: true });
    if (video.readyState >= 1) start();

    return () => {
      cancelled = true;
      video.removeEventListener('loadedmetadata', start);
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', render);
      framesRef.current.forEach((frame) => frame.close());
      framesRef.current = [];
    };
  }, [fit, targetWidth, videoUrl]);

  return (
    <div className={`relative h-screen w-full overflow-hidden ${className}`}>
      <video ref={videoRef} src={videoUrl} muted playsInline preload="auto" className="absolute h-px w-px opacity-0 pointer-events-none" aria-hidden="true" />
      <canvas ref={canvasRef} className="sticky top-0 block h-screen w-full" aria-label="Vídeo em sequência de rolagem" />
      <div className={`pointer-events-none absolute inset-0 bg-black/20 backdrop-blur-xl transition-opacity duration-700 ${isReady ? 'opacity-0' : 'opacity-100'}`} />
    </div>
  );
};
