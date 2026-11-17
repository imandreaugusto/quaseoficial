import { useEffect, useRef, useState } from 'react';
import { Camera, Download, Image, Loader2, Share2, X } from 'lucide-react';
import { createPostcardArtwork, loadPostcardPhotos, savePostcardPhoto, type PostcardPhoto } from '../../lib/actionStreet/photoAlbum';
import { useActionStreet } from './ActionStreetContext';
import { glass } from './shared/glass';

type Tab = 'camera' | 'album';

interface Props {
  cityId: string;
  cityName: string;
  spotName: string;
  onClose: () => void;
}

function photoId() {
  return globalThis.crypto?.randomUUID?.() ?? `photo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function stopTracks(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

function fileSlug(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function PolaroidCamera({ cityId, cityName, spotName, onClose }: Props) {
  const { reportActivity } = useActionStreet();
  const [tab, setTab] = useState<Tab>('camera');
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [flash, setFlash] = useState(false);
  const [developingPhotoId, setDevelopingPhotoId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<PostcardPhoto[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<PostcardPhoto | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const flashTimeoutRef = useRef<number | null>(null);
  const revealTimeoutRef = useRef<number | null>(null);
  const tabRef = useRef(tab);
  const mountedRef = useRef(true);
  const onCloseRef = useRef(onClose);

  tabRef.current = tab;
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!selectedPhoto) {
      setPreviewUrl('');
      return;
    }
    const url = URL.createObjectURL(selectedPhoto.image);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedPhoto]);

  useEffect(() => {
    const urls = photos.map((photo) => [photo.id, URL.createObjectURL(photo.image)] as const);
    setPhotoUrls(Object.fromEntries(urls));
    return () => urls.forEach(([, url]) => URL.revokeObjectURL(url));
  }, [photos]);

  useEffect(() => {
    mountedRef.current = true;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      mountedRef.current = false;
      window.removeEventListener('keydown', onKeyDown);
      stopTracks(streamRef.current);
      if (flashTimeoutRef.current !== null) window.clearTimeout(flashTimeoutRef.current);
      if (revealTimeoutRef.current !== null) window.clearTimeout(revealTimeoutRef.current);
    };
  }, []);

  const stopCamera = () => {
    stopTracks(streamRef.current);
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraReady(false);
  };

  const startCamera = async () => {
    setError('');
    setNotice('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('A câmera não está disponível neste navegador ou nesta conexão.');
      return;
    }

    setCameraStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      if (!mountedRef.current || tabRef.current !== 'camera') {
        stopTracks(stream);
        return;
      }
      streamRef.current = stream;
      if (!videoRef.current) throw new Error('Não foi possível iniciar a prévia da câmera.');
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setCameraReady(true);
    } catch (reason) {
      stopCamera();
      const cameraError = reason instanceof Error ? reason : new Error('Falha desconhecida ao iniciar a câmera.');
      setError(
        cameraError.name === 'NotAllowedError' || cameraError.name === 'PermissionDeniedError'
          ? 'Permissão da câmera negada. Libere o acesso nas configurações do navegador e tente novamente.'
          : cameraError.message
      );
    } finally {
      setCameraStarting(false);
    }
  };

  const openAlbum = async () => {
    tabRef.current = 'album';
    stopCamera();
    setTab('album');
    setError('');
    setNotice('');
    setBusy(true);
    try {
      setPhotos(await loadPostcardPhotos());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível abrir o álbum.');
    } finally {
      setBusy(false);
    }
  };

  const capturePhoto = async () => {
    const video = videoRef.current;
    if (!video || !cameraReady || !video.videoWidth || !video.videoHeight) {
      setError('A câmera ainda não está pronta para fotografar.');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    setFlash(true);
    if (flashTimeoutRef.current !== null) window.clearTimeout(flashTimeoutRef.current);
    flashTimeoutRef.current = window.setTimeout(() => setFlash(false), 110);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Não foi possível processar a foto neste navegador.');
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const image = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('A câmera não conseguiu gerar a foto.'))), 'image/jpeg', 0.92);
      });
      const photo: PostcardPhoto = { id: photoId(), cityId, cityName, spotName, createdAt: Date.now(), image };
      await savePostcardPhoto(photo);
      reportActivity('photo', cityId);
      setPhotos((previous) => [photo, ...previous]);
      setSelectedPhoto(photo);
      setDevelopingPhotoId(photo.id);
      setNotice('Foto capturada. Revelando a lembrança...');
      if (revealTimeoutRef.current !== null) window.clearTimeout(revealTimeoutRef.current);
      revealTimeoutRef.current = window.setTimeout(() => {
        setDevelopingPhotoId(null);
        setNotice('Foto revelada e salva no álbum deste dispositivo.');
      }, 1_200);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível salvar a foto.');
    } finally {
      setBusy(false);
    }
  };

  const sharePostcard = async (photo: PostcardPhoto) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const artwork = await createPostcardArtwork(photo);
      const file = new File([artwork], `action-street-${fileSlug(photo.cityName)}-${photo.createdAt}.png`, { type: 'image/png' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Cartão-postal de ${photo.cityName}`, text: `${photo.spotName} · Action Street` });
        setNotice('Cartão-postal compartilhado.');
      } else {
        const url = URL.createObjectURL(artwork);
        const link = document.createElement('a');
        link.href = url;
        link.download = file.name;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
        setNotice('Cartão-postal 9:16 baixado. Agora você pode publicar onde quiser.');
      }
    } catch (reason) {
      if (reason instanceof Error && reason.name === 'AbortError') return;
      setError(reason instanceof Error ? reason.message : 'Não foi possível compartilhar o cartão-postal.');
    } finally {
      setBusy(false);
    }
  };

  const selectTab = () => {
    tabRef.current = 'camera';
    setTab('camera');
    setError('');
    setNotice('');
  };

  return (
    <div className={`absolute inset-0 z-[70] flex items-center justify-center p-3 sm:p-6 ${glass.backdrop}`} onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Câmera Polaroid e álbum"
        onClick={(event) => event.stopPropagation()}
        className={`relative max-h-[94dvh] w-full max-w-5xl overflow-y-auto p-4 text-white sm:p-6 ${glass.panelOverImagery}`}
      >
        <header className="relative flex items-start justify-between gap-4">
          <div>
            <p className={glass.label}>Action Street · {cityName}</p>
            <h2 className="text-xl font-black sm:text-2xl">Câmera Polaroid</h2>
            <p className="mt-1 text-sm text-white/65">{spotName}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              tabRef.current = 'album';
              onClose();
            }}
            aria-label="Fechar câmera"
            className={glass.iconButton}
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <nav className={`relative mt-4 flex gap-2 p-1 ${glass.chip}`} aria-label="Câmera e álbum">
          <button type="button" aria-pressed={tab === 'camera'} onClick={selectTab} className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${tab === 'camera' ? 'bg-blue-400/30 text-white' : 'text-white/65'}`}>
            <Camera className="h-4 w-4" /> Câmera
          </button>
          <button type="button" aria-pressed={tab === 'album'} onClick={() => void openAlbum()} className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${tab === 'album' ? 'bg-blue-400/30 text-white' : 'text-white/65'}`}>
            <Image className="h-4 w-4" /> Álbum <span className="text-xs text-white/60">({photos.length})</span>
          </button>
        </nav>

        {tab === 'camera' ? (
          <div className="relative mt-5 grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(15rem,0.8fr)]">
            <div className="mx-auto w-full max-w-sm">
              <div className="rounded-[1.75rem] bg-[#f7f2e7] p-3 pb-16 shadow-[0_18px_45px_rgba(0,0,0,0.35)] sm:p-4 sm:pb-20">
                <div className="relative aspect-[9/16] overflow-hidden bg-slate-900">
                  <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" aria-label="Prévia ao vivo da câmera" />
                  <div aria-hidden="true" className={`pointer-events-none absolute inset-0 z-20 bg-white transition-opacity duration-100 ${flash ? 'opacity-90' : 'opacity-0'}`} />
                  {!cameraReady && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/85 px-5 text-center">
                      <Camera className="h-9 w-9 text-amber-200" />
                      <p className="text-sm text-white/75">A câmera só será ativada quando você tocar no botão.</p>
                      <button type="button" onClick={() => void startCamera()} disabled={cameraStarting} className={glass.primaryButton}>
                        {cameraStarting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                        {cameraStarting ? 'Abrindo...' : 'Ativar câmera'}
                      </button>
                    </div>
                  )}
                  {busy && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/45" role="status">
                      <Loader2 className="h-8 w-8 animate-spin text-white" />
                    </div>
                  )}
                </div>
                <p className="mt-3 text-center font-serif text-lg font-bold text-stone-800">Uma lembrança de {cityName}</p>
              </div>
            </div>

            <div className="flex flex-col justify-center">
              <p className={glass.label}>Seu cartão-postal vertical</p>
              <h3 className="mt-1 text-lg font-extrabold">Fotografe o momento e guarde no álbum.</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/65">A foto fica armazenada apenas neste dispositivo. Ao compartilhar, montamos um cartão 9:16 com o local e a data.</p>
              <button type="button" onClick={() => void capturePhoto()} disabled={!cameraReady || busy} className={`mt-5 ${glass.primaryButton}`}>
                <Camera className="h-5 w-5" /> Revelar foto
              </button>
              {selectedPhoto && previewUrl && (
                <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/15 bg-white/5 p-3">
                  <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-lg">
                    <img
                      src={previewUrl}
                      alt={`Foto de ${selectedPhoto.spotName}`}
                      className={`h-full w-full object-cover transition-all duration-[1200ms] ${
                        developingPhotoId === selectedPhoto.id ? 'scale-110 opacity-30 blur-[3px] grayscale' : 'scale-100 opacity-100 blur-0'
                      }`}
                    />
                    {developingPhotoId === selectedPhoto.id && <span className="absolute inset-0 flex items-center justify-center bg-black/25 text-[8px] font-black uppercase text-white">Revelando</span>}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold">{developingPhotoId === selectedPhoto.id ? 'Revelando a foto' : 'Foto revelada'}</p>
                    <p className="truncate text-xs text-white/60">{selectedPhoto.spotName}</p>
                    <button type="button" onClick={() => void sharePostcard(selectedPhoto)} disabled={busy} className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-blue-200 hover:text-white">
                      <Share2 className="h-3.5 w-3.5" /> Compartilhar cartão-postal
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="relative mt-5">
            {busy && photos.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-white/70" role="status">
                <Loader2 className="h-5 w-5 animate-spin" /> Abrindo álbum...
              </div>
            ) : photos.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/20 px-5 py-12 text-center">
                <Image className="mx-auto h-8 w-8 text-white/45" />
                <p className="mt-3 font-bold">Seu álbum ainda está vazio.</p>
                <button type="button" onClick={selectTab} className={`mt-4 ${glass.secondaryButton}`}>Voltar para a câmera</button>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(15rem,0.75fr)]">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {photos.map((photo) => (
                    <button
                      key={photo.id}
                      type="button"
                      onClick={() => setSelectedPhoto(photo)}
                      aria-label={`Selecionar foto de ${photo.spotName}`}
                      aria-pressed={selectedPhoto?.id === photo.id}
                      className={`rounded-xl bg-[#f7f2e7] p-2 pb-8 text-left shadow-lg transition hover:-translate-y-1 ${selectedPhoto?.id === photo.id ? 'ring-2 ring-blue-300' : ''}`}
                    >
                      {photoUrls[photo.id] && <img src={photoUrls[photo.id]} alt="" className="aspect-[9/12] w-full object-cover" />}
                      <span className="mt-2 block truncate font-serif text-xs font-bold text-stone-800">{photo.cityName}</span>
                    </button>
                  ))}
                </div>
                {selectedPhoto && (
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-full max-w-[14rem] rounded-2xl bg-[#f7f2e7] p-3 pb-12 shadow-xl">
                      <img src={previewUrl} alt={`Foto de ${selectedPhoto.spotName}`} className="aspect-[9/12] w-full object-cover" />
                      <p className="mt-3 truncate text-center font-serif text-sm font-bold text-stone-800">{selectedPhoto.cityName}</p>
                      <p className="truncate text-center text-xs text-stone-600">{selectedPhoto.spotName}</p>
                    </div>
                    <button type="button" onClick={() => void sharePostcard(selectedPhoto)} disabled={busy} className={`mt-4 w-full max-w-[14rem] ${glass.primaryButton}`}>
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : navigator.share && navigator.canShare ? <Share2 className="h-4 w-4" /> : <Download className="h-4 w-4" />}
                      {navigator.share && navigator.canShare ? 'Compartilhar 9:16' : 'Baixar cartão 9:16'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {(notice || error) && (
          <p role={error ? 'alert' : 'status'} className={`relative mt-4 rounded-xl px-4 py-3 text-sm ${error ? 'border border-rose-300/30 bg-rose-400/10 text-rose-100' : 'border border-emerald-300/30 bg-emerald-400/10 text-emerald-100'}`}>
            {error || notice}
          </p>
        )}
      </section>
    </div>
  );
}
