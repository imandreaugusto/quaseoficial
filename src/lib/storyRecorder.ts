import { useSyncExternalStore } from 'react';

export type StoryRecorderStatus = 'idle' | 'preview' | 'recording' | 'review';
export type StoryRecorderMode = 'screen' | 'camera';

export interface StoryRecorderState {
  status: StoryRecorderStatus;
  mode: StoryRecorderMode | null;
  seconds: number;
  url: string | null;
  mimeType: string;
  extension: 'mp4' | 'webm';
  error: string | null;
  liveStream: MediaStream | null;
}

export const MAX_STORY_SECONDS = 90;

// Instagram aceita mp4 com mais facilidade; webm fica como alternativa.
const MIME_CANDIDATES = [
  'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
  'video/mp4',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm'
];

const initialState: StoryRecorderState = {
  status: 'idle',
  mode: null,
  seconds: 0,
  url: null,
  mimeType: '',
  extension: 'webm',
  error: null,
  liveStream: null
};

let state: StoryRecorderState = initialState;
let recordedBlob: Blob | null = null;
let recorder: MediaRecorder | null = null;
let chunks: Blob[] = [];
let timer: number | null = null;
let openStreams: MediaStream[] = [];
let audioContext: AudioContext | null = null;
let discarding = false;
let stopWaiters: Array<() => void> = [];
const listeners = new Set<() => void>();

const setState = (patch: Partial<StoryRecorderState>) => {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const useStoryRecorder = () => useSyncExternalStore(subscribe, () => state);
export const getRecordedBlob = () => recordedBlob;

export const canRecordScreen = () =>
  typeof navigator !== 'undefined' && typeof navigator.mediaDevices?.getDisplayMedia === 'function';

const pickMimeType = () =>
  typeof MediaRecorder === 'undefined' ? '' : MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type)) || '';

const releaseStreams = () => {
  openStreams.forEach((stream) => stream.getTracks().forEach((track) => track.stop()));
  openStreams = [];
  if (audioContext) {
    void audioContext.close().catch(() => {});
    audioContext = null;
  }
};

const clearTimer = () => {
  if (timer !== null) {
    window.clearInterval(timer);
    timer = null;
  }
};

const revokeUrl = () => {
  if (state.url) URL.revokeObjectURL(state.url);
};

const describeError = (error: unknown) => {
  const name = (error as { name?: string })?.name;
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'Permissão negada. Permita a câmera, o microfone e o compartilhamento da guia no navegador.';
  }
  if (name === 'NotFoundError') return 'Câmera ou microfone não encontrados neste dispositivo.';
  if (name === 'NotReadableError') return 'A câmera ou o microfone estão em uso por outro programa.';
  return 'Não foi possível iniciar a gravação neste navegador.';
};

const beginRecorder = (stream: MediaStream, mode: StoryRecorderMode) => {
  const mimeType = pickMimeType();
  chunks = [];
  discarding = false;
  recorder = new MediaRecorder(stream, {
    ...(mimeType ? { mimeType } : {}),
    videoBitsPerSecond: 2_500_000
  });

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };

  recorder.onstop = () => {
    clearTimer();
    const type = recorder?.mimeType || mimeType || 'video/webm';
    recorder = null;
    releaseStreams();
    if (discarding) {
      chunks = [];
      stopWaiters.forEach((resolve) => resolve());
      stopWaiters = [];
      return;
    }
    recordedBlob = new Blob(chunks, { type });
    chunks = [];
    revokeUrl();
    setState({
      status: 'review',
      url: URL.createObjectURL(recordedBlob),
      mimeType: type,
      extension: type.startsWith('video/mp4') ? 'mp4' : 'webm',
      liveStream: null
    });
    stopWaiters.forEach((resolve) => resolve());
    stopWaiters = [];
  };

  recorder.start(1000);
  setState({ status: 'recording', mode, seconds: 0, error: null, liveStream: mode === 'camera' ? stream : null });
  timer = window.setInterval(() => {
    if (state.seconds + 1 >= MAX_STORY_SECONDS) {
      void stopRecording();
      return;
    }
    setState({ seconds: state.seconds + 1 });
  }, 1000);
};

export const openCamera = async () => {
  if (state.status !== 'idle') return;
  setState({ error: null });
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 720 }, height: { ideal: 1280 }, facingMode: 'user' },
      audio: true
    });
    openStreams = [stream];
    setState({ status: 'preview', mode: 'camera', liveStream: stream });
  } catch (error) {
    setState({ error: describeError(error) });
  }
};

export const startRecording = () => {
  if (state.status !== 'preview' || !state.liveStream) return;
  try {
    beginRecorder(state.liveStream, 'camera');
  } catch (error) {
    releaseStreams();
    setState({ status: 'idle', mode: null, liveStream: null, error: describeError(error) });
  }
};

// Grava a própria guia do app (com a câmera em círculo) + microfone, para o aluno navegar mostrando a evolução.
export const startScreenRecording = async () => {
  if (state.status !== 'idle') return;
  setState({ error: null });
  try {
    const display = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: 30 },
      audio: true,
      preferCurrentTab: true,
      selfBrowserSurface: 'include'
    } as DisplayMediaStreamOptions);
    openStreams = [display];
    const mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    openStreams.push(mic);

    audioContext = new AudioContext();
    const destination = audioContext.createMediaStreamDestination();
    openStreams.forEach((stream) => {
      if (stream.getAudioTracks().length) audioContext?.createMediaStreamSource(stream).connect(destination);
    });

    const [videoTrack] = display.getVideoTracks();
    videoTrack.addEventListener('ended', () => void stopRecording());
    beginRecorder(new MediaStream([videoTrack, ...destination.stream.getAudioTracks()]), 'screen');
  } catch (error) {
    releaseStreams();
    setState({ status: 'idle', mode: null, liveStream: null, error: describeError(error) });
  }
};

export const stopRecording = () =>
  new Promise<void>((resolve) => {
    if (!recorder || recorder.state === 'inactive') {
      resolve();
      return;
    }
    stopWaiters.push(resolve);
    recorder.stop();
  });

export const discardRecording = () => {
  clearTimer();
  if (recorder && recorder.state !== 'inactive') {
    discarding = true;
    recorder.stop();
  }
  releaseStreams();
  revokeUrl();
  recordedBlob = null;
  setState({ ...initialState });
};
