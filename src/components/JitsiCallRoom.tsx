import { useEffect, useRef, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import gsap from 'gsap';

interface JitsiApiInstance {
  addEventListener: (event: string, listener: (...args: unknown[]) => void) => void;
  dispose: () => void;
}

interface JitsiCallRoomProps {
  roomName: string;
  displayName: string;
  remoteName: string;
  onClose: () => void;
  onJoined: (roomName: string) => void;
}

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (
      domain: string,
      options: {
        roomName: string;
        width: string;
        height: string;
        parentNode: HTMLElement;
        lang: string;
        userInfo: { displayName: string };
        configOverwrite: Record<string, unknown>;
        interfaceConfigOverwrite: Record<string, unknown>;
      }
    ) => JitsiApiInstance;
  }
}

const loadJitsiApi = () => new Promise<void>((resolve, reject) => {
  if (window.JitsiMeetExternalAPI) {
    resolve();
    return;
  }

  let script = document.querySelector<HTMLScriptElement>('script[data-jitsi-external-api]');
  if (!script) {
    script = document.createElement('script');
    script.src = 'https://meet.jit.si/external_api.js';
    script.async = true;
    script.dataset.jitsiExternalApi = 'true';
    document.head.appendChild(script);
  }

  script.addEventListener('load', () => resolve(), { once: true });
  script.addEventListener('error', () => reject(new Error('Não foi possível carregar a chamada de vídeo.')), { once: true });
});

export function JitsiCallRoom({ roomName, displayName, remoteName, onClose, onJoined }: JitsiCallRoomProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const windowRef = useRef<HTMLElement>(null);
  const onJoinedRef = useRef(onJoined);
  const [isLoading, setIsLoading] = useState(true);
  const [hasJoined, setHasJoined] = useState(false);
  const [hasRemoteJoined, setHasRemoteJoined] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    onJoinedRef.current = onJoined;
  }, [onJoined]);

  useEffect(() => {
    const backdrop = backdropRef.current;
    const callWindow = windowRef.current;
    if (!backdrop || !callWindow) return;

    const context = gsap.context(() => {
      gsap.fromTo(backdrop, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25, ease: 'power2.out' });
      gsap.fromTo(callWindow, { autoAlpha: 0, scale: 0.96, y: 14 }, {
        autoAlpha: 1,
        scale: 1,
        y: 0,
        duration: 0.38,
        ease: 'power3.out'
      });
    }, backdrop);
    return () => context.revert();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let api: JitsiApiInstance | null = null;
    let connectionTimeoutId: number | undefined;

    void loadJitsiApi()
      .then(() => {
        if (cancelled) return;
        const JitsiMeetExternalAPI = window.JitsiMeetExternalAPI;
        const parentNode = containerRef.current;
        if (!JitsiMeetExternalAPI || !parentNode) {
          throw new Error('A chamada de vídeo não ficou disponível neste navegador.');
        }

        api = new JitsiMeetExternalAPI('meet.jit.si', {
          roomName,
          width: '100%',
          height: '100%',
          parentNode,
          lang: 'pt-br',
          userInfo: { displayName: displayName.slice(0, 80) },
          configOverwrite: {
            prejoinPageEnabled: false,
            enableWelcomePage: false,
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            disableDeepLinking: true,
            disableInviteFunctions: true,
            fileRecordingsEnabled: false,
            liveStreamingEnabled: false,
            transcriptionEnabled: false,
            localRecording: false,
          },
          interfaceConfigOverwrite: {
            TOOLBAR_BUTTONS: ['microphone', 'camera', 'hangup', 'participants-pane', 'tileview', 'fullscreen'],
          },
        });
        api.addEventListener('videoConferenceJoined', () => {
          window.clearTimeout(connectionTimeoutId);
          setHasJoined(true);
          setIsLoading(false);
          setError('');
          onJoinedRef.current(roomName);
        });
        api.addEventListener('participantJoined', () => setHasRemoteJoined(true));
        api.addEventListener('readyToClose', onClose);
        api.addEventListener('videoConferenceLeft', onClose);
        connectionTimeoutId = window.setTimeout(() => {
          if (!cancelled) {
            setError('A chamada está demorando para conectar. Verifique sua conexão e tente novamente.');
            setIsLoading(false);
          }
        }, 30_000);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Não foi possível iniciar a chamada.');
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
      window.clearTimeout(connectionTimeoutId);
      api?.dispose();
    };
  }, [displayName, onClose, roomName]);

  return (
    <div ref={backdropRef} className="friends-call-backdrop" role="dialog" aria-modal="true" aria-label="Videochamada do Brazilian Friends">
      <section ref={windowRef} className="friends-call-window">
        <header className="friends-call-header">
          <div>
            <strong>{remoteName}</strong>
            <span>{error ? 'Não foi possível conectar' : hasRemoteJoined ? 'Conectado' : hasJoined ? 'Chamando...' : 'Conectando...'}</span>
          </div>
          <div className="friends-call-actions">
            <button type="button" onClick={onClose} className="friends-call-close" aria-label="Encerrar chamada">
              <X size={17} />
            </button>
          </div>
        </header>
        <div className="friends-call-frame" ref={containerRef}>
          {isLoading && !error && (
            <div className="friends-call-loading">
              <Loader2 size={22} className="animate-spin" />
              <span>Conectando à videochamada...</span>
            </div>
          )}
          {error && <p className="friends-call-error" role="alert">{error}</p>}
        </div>
      </section>
    </div>
  );
}
