import React, { useEffect, useRef } from 'react';
import { Square } from 'lucide-react';
import { stopRecording, useStoryRecorder } from '../lib/storyRecorder';

const formatClock = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

export const StoryRecordingBar: React.FC<{ onFinished: () => void }> = ({ onFinished }) => {
  const recorder = useStoryRecorder();
  const previousStatus = useRef(recorder.status);

  useEffect(() => {
    if (previousStatus.current === 'recording' && recorder.status === 'review' && recorder.mode === 'screen') onFinished();
    previousStatus.current = recorder.status;
  }, [recorder.status, recorder.mode]);

  if (recorder.status !== 'recording' || recorder.mode !== 'screen') return null;

  return (
    <div
      role="status"
      className="fixed bottom-5 left-1/2 z-[300000] flex -translate-x-1/2 items-center gap-3 rounded-full border border-white/25 bg-white/15 py-2 pl-4 pr-2 shadow-[0_8px_30px_rgba(0,0,0,0.35)] backdrop-blur-2xl"
    >
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
      </span>
      <span className="font-mono text-xs font-bold text-white">Gravando {formatClock(recorder.seconds)}</span>
      <button
        type="button"
        onClick={() => void stopRecording()}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-red-500 px-4 py-1.5 text-xs font-extrabold uppercase tracking-wider text-white transition hover:bg-red-400"
      >
        <Square size={11} className="fill-current" /> Parar
      </button>
    </div>
  );
};
