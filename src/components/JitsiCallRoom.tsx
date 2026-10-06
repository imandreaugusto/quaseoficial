import { useEffect, useRef, useState } from 'react';
import { Loader2, UserPlus, X } from 'lucide-react';

interface JitsiApiInstance {
  addEventListener: (event: string, listener: () => void) => void;
  dispose: () => void;
}

interface JitsiCallRoomProps {
  roomName: string;
  displayName: string;
  onClose: () => void;
  onInvite: () => void;
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

export function JitsiCallRoom({ roomName, displayName, onClose, onInvite }: JitsiCallRoomProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    let api: JitsiApiInstance | null = null;

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
            prejoinPageEnabled: true,
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            disableDeepLinking: true,
            fileRecordingsEnabled: false,
            liveStreamingEnabled: false,
            transcriptionEnabled: false,
            localRecording: false,
          },
          interfaceConfigOverwrite: {
            TOOLBAR_BUTTONS: ['microphone', 'camera', 'hangup', 'chat', 'participants-pane', 'tileview', 'fullscreen', 'raisehand'],
          },
        });
        api.addEventListener('videoConferenceJoined', () => setIsLoading(false));
        api.addEventListener('readyToClose', onClose);
        api.addEventListener('videoConferenceLeft', onClose);
        setIsLoading(false);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Não foi possível iniciar a chamada.');
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
      api?.dispose();
    };
  }, [displayName, onClose, roomName]);

  return (
    <div className="friends-call-backdrop" role="dialog" aria-modal="true" aria-label="Videochamada do Brazilian Friends">
      <section className="friends-call-window">
        <header className="friends-call-header">
          <div>
            <strong>Videochamada · Brazilian Friends</strong>
            <span>As chamadas não são gravadas pelo Brazilian in Action.</span>
          </div>
          <div className="friends-call-actions">
            <button type="button" onClick={onInvite} className="friends-call-invite" aria-label="Convidar colega para a chamada">
              <UserPlus size={16} />
              <span>Convidar colega</span>
            </button>
            <button type="button" onClick={onClose} className="friends-call-close" aria-label="Encerrar chamada">
              <X size={17} />
            </button>
          </div>
        </header>
        <div className="friends-call-frame" ref={containerRef}>
          {isLoading && !error && (
            <div className="friends-call-loading">
              <Loader2 size={22} className="animate-spin" />
              <span>Conectando à sala segura...</span>
            </div>
          )}
          {error && <p className="friends-call-error" role="alert">{error}</p>}
        </div>
      </section>
    </div>
  );
}
