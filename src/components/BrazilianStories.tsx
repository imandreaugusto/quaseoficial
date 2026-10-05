import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Camera,
  Check,
  Copy,
  Download,
  FileText,
  Instagram,
  Loader2,
  MessageCircle,
  Monitor,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Square,
  Trophy,
  Video,
  X
} from 'lucide-react';
import { motion } from 'motion/react';
import { StorySubmission, UserProfile } from '../types';
import {
  deleteStoryFromSupabase,
  loadStoriesFromSupabase,
  saveStoryToSupabase,
  updateStoryStatusInSupabase
} from '../utils/supabaseClient';
import {
  MAX_STORY_SECONDS,
  canRecordScreen,
  discardRecording,
  getRecordedBlob,
  openCamera,
  startRecording,
  startScreenRecording,
  stopRecording,
  useStoryRecorder
} from '../lib/storyRecorder';

interface StoryPromptOption {
  id: string;
  category: StorySubmission['category'];
  title: string;
  teleprompterEn: string;
  teleprompterPt: string;
  suggestedCaption: string;
  hashtags: string;
}

const STORY_PROMPTS: StoryPromptOption[] = [
  {
    id: 'evolution',
    category: 'challenge',
    title: 'Minha evolução na BIA',
    teleprompterEn: "Hi everyone! I want to show you my progress at Brazilian in Action. Look at what I have been doing: I practice every day and I can feel my English getting better. Let me show you!",
    teleprompterPt: 'Oi pessoal! Quero mostrar minha evolução na Brazilian in Action. Olhem o que venho fazendo: pratico todo dia e sinto meu inglês melhorando. Vou mostrar!',
    suggestedCaption: 'Mostrando minha evolução no inglês com a @brazilianinaction! Cada dia um passo mais perto da fluência 🇺🇸🔥',
    hashtags: '#BrazilianInAction #EnglishPractice #MinhaEvolucao #BIAStories'
  },
  {
    id: 'episoden-victory',
    category: 'episoden',
    title: 'Minha rodada de conversação',
    teleprompterEn: "Hey guys! I just finished a conversation round on Brazilian Practice. I talked with someone from another country and it was awesome! I am unlocking my English every day!",
    teleprompterPt: 'E aí pessoal! Acabei de terminar uma rodada de conversação no Brazilian Practice. Conversei com alguém de outro país e foi incrível! Destravando meu inglês todo dia!',
    suggestedCaption: 'Mais um dia destravando o inglês ao vivo com a @brazilianinaction! Conversar com gente de outro país aumenta a confiança 🌎🔥',
    hashtags: '#BrazilianInAction #EnglishPractice #FluenciaReal #BIAStories'
  },
  {
    id: 'daily-expression',
    category: 'expression',
    title: 'Expressão em inglês do dia',
    teleprompterEn: "Today I learned a new expression: 'Cut to the chase'. It means to get straight to the point without wasting time. Did you know this one? Let me know in the comments!",
    teleprompterPt: "Hoje aprendi a expressão 'Cut to the chase'. Significa ir direto ao ponto sem enrolar. E você, já conhecia? Me conta nos comentários!",
    suggestedCaption: 'Expressão do dia direto da minha aula na @brazilianinaction! Quem já conhecia essa? 📚✨',
    hashtags: '#DicaDeIngles #BrazilianInAction #AprenderIngles #EnglishTips'
  },
  {
    id: 'read-club-flow',
    category: 'readclub',
    title: 'Leitura e pronúncia no Read Club',
    teleprompterEn: 'I am practicing my reading and pronunciation with the Read Club on Brazilian in Action. I listen to the audio and repeat each sentence. The accent training here is next level!',
    teleprompterPt: 'Estou praticando leitura e pronúncia com o Read Club da Brazilian in Action. Ouço o áudio e repito cada frase. O treino de sotaque aqui é de outro nível!',
    suggestedCaption: 'Treino de pronúncia e leitura no Read Club da @brazilianinaction! 🎧🇺🇸',
    hashtags: '#ReadClub #Pronunciation #BrazilianInAction #ReadingInEnglish'
  }
];

const STORY_MURAL_DAYS = 7;

const CATEGORY_LABELS: Record<StorySubmission['category'], string> = {
  challenge: 'Evolução',
  episoden: 'Conversação',
  readclub: 'Read Club',
  expression: 'Expressão',
  routine: 'Rotina'
};

const STATUS_LABELS: Record<StorySubmission['status'], string> = {
  pending: 'Em análise',
  approved: 'Aprovado',
  featured: 'Destaque'
};

const STATUS_CLASSES: Record<StorySubmission['status'], string> = {
  pending: 'border-yellow-300/40 bg-yellow-400/15 text-yellow-100',
  approved: 'border-emerald-300/40 bg-emerald-400/15 text-emerald-100',
  featured: 'border-amber-300/50 bg-amber-400/20 text-amber-100'
};

const GLASS = 'rounded-3xl border border-white/20 bg-white/[0.08] backdrop-blur-2xl shadow-[0_8px_40px_rgba(0,0,0,0.2)]';
const GRADIENT_BUTTON = 'bg-gradient-to-r from-blue-500 to-violet-500 text-white shadow-lg shadow-violet-500/25 hover:brightness-110';
const GLASS_BUTTON = 'border border-white/20 bg-white/10 text-white/85 backdrop-blur-xl hover:bg-white/20 hover:text-white';

const formatClock = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Barra fixa visível em qualquer tela do app enquanto a tela está sendo gravada.
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

interface BrazilianStoriesProps {
  currentUser?: UserProfile | null;
  isAdmin?: boolean;
  accentColor?: string;
  onShowFloatingCamera?: (show: boolean) => void;
}

export const BrazilianStories: React.FC<BrazilianStoriesProps> = ({
  currentUser,
  isAdmin = false,
  onShowFloatingCamera
}) => {
  const recorder = useStoryRecorder();
  const screenSupported = canRecordScreen();

  const [activeTab, setActiveTab] = useState<'hall' | 'recorder' | 'moderation'>('hall');
  const [mode, setMode] = useState<'screen' | 'camera'>(screenSupported ? 'screen' : 'camera');
  const [selectedPrompt, setSelectedPrompt] = useState<StoryPromptOption>(STORY_PROMPTS[0]);
  const [showTeleprompter, setShowTeleprompter] = useState(false);
  const [stories, setStories] = useState<StorySubmission[]>([]);
  const [studentInstagram, setStudentInstagram] = useState('');
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [sending, setSending] = useState(false);
  const [postLink, setPostLink] = useState('');
  const [linkSent, setLinkSent] = useState(false);
  const [highlightForm, setHighlightForm] = useState({ url: '', title: '', name: '', handle: '' });
  const [notice, setNotice] = useState<{ type: 'error' | 'info'; text: string } | null>(null);

  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  const myId = currentUser?.auth_user_id || currentUser?.id || '';
  const caption = `${selectedPrompt.suggestedCaption}\n\n${selectedPrompt.hashtags}`;

  useEffect(() => {
    void loadStoriesFromSupabase().then((remote) => setStories(remote as StorySubmission[]));
  }, [activeTab]);

  // O elemento de vídeo só existe depois do render; por isso o stream é ligado aqui.
  useEffect(() => {
    if (liveVideoRef.current && recorder.liveStream) {
      liveVideoRef.current.srcObject = recorder.liveStream;
      void liveVideoRef.current.play().catch(() => {});
    }
  }, [recorder.liveStream, activeTab]);

  useEffect(() => {
    if (recorder.error) onShowFloatingCamera?.(false);
  }, [recorder.error]);

  useEffect(() => {
    if (recorder.status === 'review') {
      onShowFloatingCamera?.(false);
      setActiveTab('recorder');
    }
  }, [recorder.status]);

  useEffect(() => {
    return () => {
      if (recorder.status === 'preview') discardRecording();
    };
  }, []);

  const handleStartScreen = async () => {
    setNotice(null);
    onShowFloatingCamera?.(true);
    await startScreenRecording();
  };

  const handleReset = () => {
    discardRecording();
    onShowFloatingCamera?.(false);
    setPostLink('');
    setLinkSent(false);
    setNotice(null);
  };

  const handleCopyCaption = async () => {
    await navigator.clipboard.writeText(caption).catch(() => {});
    setCopiedCaption(true);
    window.setTimeout(() => setCopiedCaption(false), 2500);
  };

  const handleDownload = () => {
    if (!recorder.url) return;
    const link = document.createElement('a');
    link.href = recorder.url;
    link.download = `brazilian-in-action-story-${Date.now()}.${recorder.extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // O vídeo não fica na plataforma: só o link do post público no Instagram é guardado.
  const handleSubmitLink = async () => {
    if (sending || !postLink.trim()) return;
    setSending(true);
    setNotice(null);
    try {
      const story = (await saveStoryToSupabase({
        title: selectedPrompt.title,
        category: selectedPrompt.category,
        promptUsed: selectedPrompt.title,
        instagramUrl: postLink.trim(),
        instagramHandle: studentInstagram.trim() || undefined
      })) as StorySubmission;
      setStories((prev) => [story, ...prev.filter((item) => item.id !== story.id)]);
      setLinkSent(true);
      setNotice({
        type: 'info',
        text: isAdmin ? 'Publicado como destaque no Mural.' : 'Link enviado! A equipe vai avaliar e, se aprovado, o seu post aparece no Mural.'
      });
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Não foi possível enviar o link.' });
    } finally {
      setSending(false);
    }
  };

  const handleAddHighlight = async () => {
    if (sending || !highlightForm.url.trim() || !highlightForm.title.trim()) return;
    setSending(true);
    setNotice(null);
    try {
      const story = (await saveStoryToSupabase({
        title: highlightForm.title.trim(),
        category: 'challenge',
        promptUsed: highlightForm.title.trim(),
        instagramUrl: highlightForm.url.trim(),
        instagramHandle: highlightForm.handle.trim() || undefined,
        studentName: highlightForm.name.trim() || undefined
      })) as StorySubmission;
      setStories((prev) => [story, ...prev.filter((item) => item.id !== story.id)]);
      setHighlightForm({ url: '', title: '', name: '', handle: '' });
      setNotice({ type: 'info', text: 'Destaque adicionado ao Mural.' });
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Não foi possível adicionar o destaque.' });
    } finally {
      setSending(false);
    }
  };

  const handleShareInstagram = async () => {
    const blob = getRecordedBlob();
    if (!blob) return;
    await navigator.clipboard.writeText(caption).catch(() => {});
    const file = new File([blob], `story-bia.${recorder.extension}`, { type: recorder.mimeType || blob.type });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: caption, title: 'Meu story na Brazilian in Action' });
        return;
      }
    } catch (error) {
      if ((error as { name?: string })?.name === 'AbortError') return;
    }
    handleDownload();
    window.open('https://www.instagram.com/brazilianinaction/', '_blank', 'noopener,noreferrer');
    setNotice({
      type: 'info',
      text: 'Vídeo baixado e legenda copiada. Passe o vídeo para o celular, abra o Instagram e marque @brazilianinaction no story.'
    });
  };

  const handleWhatsApp = async () => {
    const blob = getRecordedBlob();
    if (!blob) return;
    const file = new File([blob], `story-bia.${recorder.extension}`, { type: recorder.mimeType || blob.type });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: caption, title: 'Meu story na Brazilian in Action' });
        return;
      }
    } catch (error) {
      if ((error as { name?: string })?.name === 'AbortError') return;
    }
    handleDownload();
    window.open('https://web.whatsapp.com/', '_blank', 'noopener,noreferrer');
    setNotice({ type: 'info', text: 'Vídeo baixado. Anexe o arquivo na conversa ou no grupo do WhatsApp.' });
  };

  const handleModeration = async (story: StorySubmission, status: 'approved' | 'featured') => {
    try {
      await updateStoryStatusInSupabase(story.id, status);
      setStories((prev) => prev.map((item) => (item.id === story.id ? { ...item, status } : item)));
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Não foi possível atualizar o story.' });
    }
  };

  const handleDelete = async (story: StorySubmission) => {
    if (!window.confirm('Excluir este story definitivamente?')) return;
    try {
      await deleteStoryFromSupabase(story.id);
      setStories((prev) => prev.filter((item) => item.id !== story.id));
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Não foi possível excluir o story.' });
    }
  };

  // Posts somem do Mural após 7 dias (o servidor também apaga o link e depois o registro).
  const publicStories = stories.filter((story) => story.status !== 'pending' && story.videoUrl && Date.now() - new Date(story.createdAt).getTime() < STORY_MURAL_DAYS * 86_400_000);
  const myStories = stories.filter((story) => story.studentId === myId && story.videoUrl);
  const pendingCount = stories.filter((story) => story.status === 'pending').length;

  const tabClass = (tab: typeof activeTab) =>
    `inline-flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${
      activeTab === tab ? 'bg-gradient-to-r from-blue-500 to-violet-500 text-white shadow-lg shadow-violet-500/25' : 'text-white/70 hover:bg-white/10 hover:text-white'
    }`;

  const noticeBanner = notice && (
    <div
      role="status"
      className={`flex w-full max-w-2xl items-start gap-2 rounded-2xl border p-3 text-xs backdrop-blur-xl ${
        notice.type === 'error' ? 'border-red-300/40 bg-red-400/15 text-red-100' : 'border-emerald-300/40 bg-emerald-400/15 text-emerald-100'
      }`}
    >
      {notice.type === 'error' ? <AlertCircle size={14} className="mt-0.5 shrink-0" /> : <Check size={14} className="mt-0.5 shrink-0" />}
      <span>{notice.text}</span>
    </div>
  );

  return (
    <div className="z-10 mx-auto flex w-full max-w-7xl select-none flex-col gap-6 px-4 py-6 sm:px-6">
      {/* HEADER */}
      <header className={`relative flex flex-col justify-between gap-6 overflow-hidden p-6 sm:p-9 md:flex-row md:items-end ${GLASS}`}>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
        <div className="pointer-events-none absolute -left-16 -top-20 h-60 w-60 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-10 h-60 w-60 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="relative">
          <div className="mb-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-white/75">
            <Instagram size={15} /> Brazilian Post
          </div>
          <h1 className="text-3xl font-black leading-[1.05] tracking-tight text-white sm:text-5xl">
            Grave. Compartilhe.
            <span className="block bg-gradient-to-r from-blue-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Mostre sua evolução.</span>
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/75">
            Grave um vídeo falando inglês, poste no seu Instagram marcando <strong className="font-semibold text-white">@brazilianinaction</strong> e cole o link aqui para aparecer no Mural.
          </p>
        </div>
        <nav className="relative flex flex-wrap items-center gap-1 self-start rounded-full border border-white/20 bg-white/10 p-1.5 backdrop-blur-xl md:self-auto" aria-label="Seções do Brazilian Post">
          <button type="button" className={tabClass('hall')} onClick={() => setActiveTab('hall')}><Trophy size={14} /> Mural</button>
          <button type="button" className={tabClass('recorder')} onClick={() => setActiveTab('recorder')}><Camera size={14} /> Gravar Story</button>
          {isAdmin && (
            <button type="button" className={tabClass('moderation')} onClick={() => setActiveTab('moderation')}>
              <ShieldCheck size={14} /> Moderação{pendingCount > 0 ? ` (${pendingCount})` : ''}
            </button>
          )}
        </nav>
      </header>

      {/* MURAL */}
      {activeTab === 'hall' && (
        <section className="space-y-6" aria-label="Mural de destaques">
          {publicStories.length === 0 ? (
            <div className={`flex flex-col items-center gap-4 p-10 text-center ${GLASS}`}>
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white/10 text-violet-200"><Video size={24} /></div>
              <h2 className="text-lg font-extrabold text-white">Os destaques da comunidade aparecem aqui</h2>
              <p className="max-w-md text-sm text-white/70">Poste o seu vídeo no Instagram marcando @brazilianinaction e cole o link na aba Gravar Story. Os posts aprovados ficam no mural por 7 dias.</p>
              <button type="button" onClick={() => setActiveTab('recorder')} className={`inline-flex cursor-pointer items-center gap-2 rounded-2xl px-6 py-3 text-xs font-extrabold uppercase tracking-wider transition ${GRADIENT_BUTTON}`}>
                <Camera size={15} /> Gravar meu story
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {publicStories.map((story) => (
                <motion.article key={story.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/20 bg-white/[0.08] shadow-[0_8px_30px_rgba(0,0,0,0.2)] backdrop-blur-xl transition hover:-translate-y-1 hover:border-white/40">
                  <div className="relative bg-black/30">
                    <iframe
                      src={`${story.videoUrl}embed`}
                      title={`Post de ${story.studentName} no Instagram`}
                      loading="lazy"
                      allow="encrypted-media; fullscreen"
                      referrerPolicy="strict-origin-when-cross-origin"
                      className="block h-[540px] w-full border-0"
                    />
                    {story.status === 'featured' && (
                      <span className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1 rounded-full border border-amber-300/50 bg-amber-400/25 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-100 backdrop-blur-xl">
                        <Trophy size={10} /> Destaque
                      </span>
                    )}
                  </div>
                  <div className="space-y-1 p-4">
                    <span className="inline-block rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/70">{CATEGORY_LABELS[story.category] || 'Story'}</span>
                    <h3 className="text-sm font-bold leading-snug text-white">{story.title}</h3>
                    <p className="text-xs text-white/65">
                      {story.studentName}
                      {story.instagramHandle && <span className="ml-1.5 font-mono text-fuchsia-200">{story.instagramHandle}</span>}
                    </p>
                    <a href={story.videoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-violet-200 hover:text-white"><Instagram size={11} /> Ver no Instagram</a>
                  </div>
                </motion.article>
              ))}
            </div>
          )}

          {myStories.length > 0 && (
            <div className={`p-5 ${GLASS}`}>
              <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-white/75">Meus envios</h2>
              <ul className="divide-y divide-white/10">
                {myStories.map((story) => (
                  <li key={story.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <span className="truncate text-white/85">{story.title} <span className="text-xs text-white/45">· {formatDate(story.createdAt)}</span></span>
                    <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_CLASSES[story.status]}`}>{STATUS_LABELS[story.status]}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* GRAVAR */}
      {activeTab === 'recorder' && (
        <section className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12" aria-label="Gravar story">
          <div className="space-y-5 lg:col-span-5">
            <div className={`space-y-3 p-5 ${GLASS}`}>
              <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-white/80"><FileText size={14} className="text-violet-200" /> 1. Escolha o tema</h2>
              <div className="space-y-2">
                {STORY_PROMPTS.map((prompt) => (
                  <button
                    key={prompt.id}
                    type="button"
                    disabled={recorder.status === 'recording'}
                    onClick={() => setSelectedPrompt(prompt)}
                    aria-pressed={selectedPrompt.id === prompt.id}
                    className={`w-full cursor-pointer rounded-2xl border p-3.5 text-left backdrop-blur-xl transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      selectedPrompt.id === prompt.id ? 'border-violet-300/60 bg-violet-400/20 shadow-[0_0_20px_rgba(139,92,246,0.3)]' : 'border-white/15 bg-white/[0.06] hover:border-white/35 hover:bg-white/10'
                    }`}
                  >
                    <span className="block text-sm font-bold text-white">{prompt.title}</span>
                    <span className="mt-1 line-clamp-2 block text-xs font-light text-white/60">{prompt.teleprompterPt}</span>
                  </button>
                ))}
              </div>
            </div>

            {recorder.status === 'idle' && (
              <div className={`space-y-3 p-5 ${GLASS}`}>
                <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-white/80"><Video size={14} className="text-violet-200" /> 2. Como você quer gravar?</h2>
                <button
                  type="button"
                  disabled={!screenSupported}
                  onClick={() => setMode('screen')}
                  aria-pressed={mode === 'screen'}
                  className={`flex w-full cursor-pointer items-start gap-3 rounded-2xl border p-3.5 text-left backdrop-blur-xl transition disabled:cursor-not-allowed disabled:opacity-45 ${mode === 'screen' ? 'border-violet-300/60 bg-violet-400/20' : 'border-white/15 bg-white/[0.06] hover:bg-white/10'}`}
                >
                  <Monitor size={18} className="mt-0.5 shrink-0 text-violet-200" />
                  <span>
                    <span className="block text-sm font-bold text-white">Mostrar minha tela com a câmera em círculo</span>
                    <span className="block text-xs font-light text-white/60">{screenSupported ? 'Você navega pelo app mostrando o que fez, falando ao microfone.' : 'Disponível só no computador.'}</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('camera')}
                  aria-pressed={mode === 'camera'}
                  className={`flex w-full cursor-pointer items-start gap-3 rounded-2xl border p-3.5 text-left backdrop-blur-xl transition ${mode === 'camera' ? 'border-violet-300/60 bg-violet-400/20' : 'border-white/15 bg-white/[0.06] hover:bg-white/10'}`}
                >
                  <Camera size={18} className="mt-0.5 shrink-0 text-violet-200" />
                  <span>
                    <span className="block text-sm font-bold text-white">Gravar só eu, na vertical</span>
                    <span className="block text-xs font-light text-white/60">Vídeo de selfie no formato de story. Funciona no celular.</span>
                  </span>
                </button>
              </div>
            )}

            <div className={`space-y-3 p-5 ${GLASS}`}>
              <div className="flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-white/80"><Instagram size={14} className="text-fuchsia-200" /> Legenda para o Instagram</h2>
                <button type="button" onClick={() => void handleCopyCaption()} className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition ${GLASS_BUTTON}`}>
                  {copiedCaption ? <><Check size={11} className="text-emerald-300" /> Copiado</> : <><Copy size={11} /> Copiar</>}
                </button>
              </div>
              <p className="whitespace-pre-line rounded-2xl border border-white/15 bg-white/[0.06] p-3 text-xs leading-relaxed text-white/80">
                {selectedPrompt.suggestedCaption}
                {'\n\n'}
                <span className="text-fuchsia-200">{selectedPrompt.hashtags}</span>
              </p>
              <label className="block">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-white/60">Seu @ do Instagram (opcional)</span>
                <input
                  value={studentInstagram}
                  onChange={(event) => setStudentInstagram(event.target.value)}
                  placeholder="@seunome"
                  maxLength={40}
                  className="w-full rounded-2xl border border-white/20 bg-white/10 px-3 py-2 font-mono text-xs text-white outline-none backdrop-blur-xl placeholder:text-white/40 focus:border-violet-300/70"
                />
              </label>
            </div>
          </div>

          <div className="flex flex-col items-center gap-4 lg:col-span-7">
            {noticeBanner}
            {recorder.error && (
              <div role="alert" className="flex w-full max-w-2xl items-start gap-2 rounded-2xl border border-red-300/40 bg-red-400/15 p-3 text-xs text-red-100 backdrop-blur-xl">
                <AlertCircle size={14} className="mt-0.5 shrink-0" /> <span>{recorder.error}</span>
              </div>
            )}

            {recorder.status === 'idle' && (
              <div className={`flex w-full max-w-2xl flex-col items-center gap-5 p-8 text-center ${GLASS}`}>
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-white/10 text-violet-200">
                  {mode === 'screen' ? <Monitor size={28} /> : <Camera size={28} />}
                </div>
                {mode === 'screen' ? (
                  <>
                    <h2 className="text-xl font-extrabold text-white">Grave a tela do app com a sua câmera em círculo</h2>
                    <ol className="space-y-1.5 text-left text-sm text-white/75">
                      <li>1. Clique em <strong className="text-white">Começar a gravar</strong> e escolha <strong className="text-white">Esta guia</strong> na janela do navegador.</li>
                      <li>2. Fale ao microfone e navegue pelo app mostrando a sua evolução. A câmera em círculo aparece no vídeo.</li>
                      <li>3. Clique em <strong className="text-white">Parar</strong> na barra de gravação para revisar e enviar.</li>
                    </ol>
                    <p className="text-xs text-white/50">Limite de {MAX_STORY_SECONDS} segundos.</p>
                    <button type="button" onClick={() => void handleStartScreen()} className={`inline-flex cursor-pointer items-center gap-2 rounded-2xl px-7 py-3.5 text-xs font-extrabold uppercase tracking-wider transition ${GRADIENT_BUTTON}`}>
                      <Video size={16} /> Começar a gravar
                    </button>
                  </>
                ) : (
                  <>
                    <h2 className="text-xl font-extrabold text-white">Ative a câmera e grave seu story</h2>
                    <p className="max-w-md text-sm text-white/70">Você vê o roteiro na tela enquanto grava. O vídeo sai no formato vertical, pronto para o Instagram.</p>
                    <button type="button" onClick={() => void openCamera()} className={`inline-flex cursor-pointer items-center gap-2 rounded-2xl px-7 py-3.5 text-xs font-extrabold uppercase tracking-wider transition ${GRADIENT_BUTTON}`}>
                      <Camera size={16} /> Ativar câmera
                    </button>
                  </>
                )}
              </div>
            )}

            {(recorder.status === 'preview' || (recorder.status === 'recording' && recorder.mode === 'camera')) && (
              <div className="relative flex aspect-[9/16] w-full max-w-sm flex-col justify-between overflow-hidden rounded-3xl border border-white/25 bg-black shadow-2xl">
                <video ref={liveVideoRef} autoPlay muted playsInline className="absolute inset-0 h-full w-full -scale-x-100 object-cover" />
                <div className="relative z-20 m-3 flex items-center justify-between">
                  <button type="button" onClick={() => setShowTeleprompter((value) => !value)} className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold transition ${showTeleprompter ? 'bg-violet-500 text-white' : GLASS_BUTTON}`}>
                    <FileText size={13} /> {showTeleprompter ? 'Ocultar roteiro' : 'Ver roteiro'}
                  </button>
                  {recorder.status === 'preview' && (
                    <button type="button" onClick={handleReset} className={`rounded-full p-1.5 transition ${GLASS_BUTTON}`} aria-label="Fechar câmera"><X size={14} /></button>
                  )}
                </div>
                {showTeleprompter && (
                  <div className="relative z-20 mx-3 space-y-1.5 rounded-2xl border border-white/25 bg-black/45 p-3.5 text-center backdrop-blur-xl">
                    <p className="text-sm font-bold leading-snug text-white">“{selectedPrompt.teleprompterEn}”</p>
                    <p className="text-[10px] leading-tight text-white/65">{selectedPrompt.teleprompterPt}</p>
                  </div>
                )}
                <div className="relative z-20 flex flex-col items-center gap-3 bg-gradient-to-t from-black/80 to-transparent p-4">
                  {recorder.status === 'recording' && (
                    <span className="rounded-full border border-red-300/60 bg-red-600/80 px-3 py-1 font-mono text-xs font-bold text-white">GRAVANDO {formatClock(recorder.seconds)}</span>
                  )}
                  {recorder.status === 'preview' ? (
                    <button type="button" onClick={startRecording} className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-full border-4 border-white/30 bg-red-600 shadow-[0_0_20px_rgba(239,68,68,0.5)] transition hover:scale-105" aria-label="Iniciar gravação">
                      <span className="h-6 w-6 rounded-full bg-white" />
                    </button>
                  ) : (
                    <button type="button" onClick={() => void stopRecording()} className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-full border-4 border-red-500 bg-neutral-900 text-red-500 transition hover:scale-105" aria-label="Parar gravação">
                      <Square size={24} className="fill-current" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {recorder.status === 'recording' && recorder.mode === 'screen' && (
              <div className={`flex w-full max-w-2xl flex-col items-center gap-4 p-8 text-center ${GLASS}`}>
                <span className="relative flex h-4 w-4"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" /><span className="relative inline-flex h-4 w-4 rounded-full bg-red-500" /></span>
                <h2 className="text-xl font-extrabold text-white">Gravando {formatClock(recorder.seconds)}</h2>
                <p className="text-sm text-white/70">Navegue pelo app mostrando sua evolução. Use a barra de gravação para parar quando terminar.</p>
                <button type="button" onClick={() => void stopRecording()} className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-red-500 px-6 py-3 text-xs font-extrabold uppercase tracking-wider text-white transition hover:bg-red-400">
                  <Square size={13} className="fill-current" /> Parar gravação
                </button>
              </div>
            )}

            {recorder.status === 'review' && recorder.url && (
              <div className={`flex w-full flex-col gap-4 p-5 ${recorder.mode === 'camera' ? 'max-w-sm' : 'max-w-2xl'} ${GLASS}`}>
                <video src={recorder.url} controls playsInline className={`w-full rounded-2xl bg-black object-contain ${recorder.mode === 'camera' ? 'aspect-[9/16]' : 'aspect-video'}`} />
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button type="button" onClick={() => void handleShareInstagram()} className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl px-4 py-3 text-xs font-extrabold uppercase tracking-wider transition sm:col-span-2 ${GRADIENT_BUTTON}`}>
                    <Instagram size={15} /> Postar no Instagram
                  </button>
                  <button type="button" onClick={() => void handleWhatsApp()} className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition ${GLASS_BUTTON}`}>
                    <MessageCircle size={14} /> Enviar no WhatsApp
                  </button>
                  <button type="button" onClick={handleDownload} className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition ${GLASS_BUTTON}`}>
                    <Download size={14} /> Baixar vídeo
                  </button>
                  <button type="button" onClick={handleReset} className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition sm:col-span-2 ${GLASS_BUTTON}`}>
                    <RotateCcw size={14} /> Regravar
                  </button>
                </div>
                <ol className="space-y-1 rounded-2xl border border-white/15 bg-white/[0.06] p-3 text-[11px] leading-relaxed text-white/70">
                  <li>1. Toque em <strong className="text-white">Postar no Instagram</strong> e escolha <strong className="text-white">Stories</strong> (no celular).</li>
                  <li>2. Cole a legenda (já copiada) e marque <strong className="text-white">@brazilianinaction</strong> com o adesivo @.</li>
                  <li>3. No computador, passe o vídeo baixado para o celular e poste de lá.</li>
                </ol>
                <div className="space-y-2 rounded-2xl border border-white/15 bg-white/[0.06] p-3">
                  <p className="flex items-start gap-2 text-[11px] leading-relaxed text-white/65"><Sparkles size={12} className="mt-0.5 shrink-0 text-violet-200" /> Postou como reel ou post público? Cole o link para a equipe BIA ver e destacar no Mural. O vídeo não fica guardado aqui.</p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      value={postLink}
                      onChange={(event) => setPostLink(event.target.value)}
                      placeholder="https://www.instagram.com/reel/..."
                      inputMode="url"
                      disabled={linkSent}
                      className="min-w-0 flex-1 rounded-2xl border border-white/20 bg-white/10 px-3 py-2 font-mono text-xs text-white outline-none backdrop-blur-xl placeholder:text-white/40 focus:border-violet-300/70 disabled:opacity-60"
                    />
                    <button type="button" onClick={() => void handleSubmitLink()} disabled={sending || linkSent || !postLink.trim()} className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold uppercase tracking-wider transition disabled:cursor-not-allowed disabled:opacity-50 ${GRADIENT_BUTTON}`}>
                      {sending ? <><Loader2 size={14} className="animate-spin" /> Enviando…</> : linkSent ? <><Check size={14} /> Enviado</> : <><Send size={14} /> Enviar link</>}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* MODERAÇÃO */}
      {activeTab === 'moderation' && isAdmin && (
        <section className="space-y-4" aria-label="Moderação de stories">
          {noticeBanner}
          <div className={`space-y-3 p-5 ${GLASS}`}>
            <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-white/80"><Instagram size={14} className="text-fuchsia-200" /> Adicionar destaque do Instagram</h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {([['url', 'Link do reel ou post público'], ['title', 'Título do destaque'], ['name', 'Nome do aluno (opcional)'], ['handle', '@ do aluno (opcional)']] as const).map(([field, label]) => (
                <input
                  key={field}
                  value={highlightForm[field]}
                  onChange={(event) => setHighlightForm((prev) => ({ ...prev, [field]: event.target.value }))}
                  placeholder={label}
                  aria-label={label}
                  className="rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-xs text-white outline-none backdrop-blur-xl placeholder:text-white/40 focus:border-violet-300/70"
                />
              ))}
            </div>
            <button type="button" onClick={() => void handleAddHighlight()} disabled={sending || !highlightForm.url.trim() || !highlightForm.title.trim()} className={`inline-flex cursor-pointer items-center gap-2 rounded-2xl px-5 py-2.5 text-xs font-extrabold uppercase tracking-wider transition disabled:cursor-not-allowed disabled:opacity-50 ${GRADIENT_BUTTON}`}>
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Trophy size={14} />} Adicionar ao Mural
            </button>
          </div>
          {stories.length === 0 ? (
            <p className={`p-8 text-center text-sm text-white/70 ${GLASS}`}>Nenhum story enviado ainda.</p>
          ) : (
            stories.map((story) => (
              <div key={story.id} className="flex flex-col gap-4 rounded-2xl border border-white/20 bg-white/[0.08] p-4 backdrop-blur-xl sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-white">{story.studentName} {story.instagramHandle && <span className="ml-1 font-mono text-xs text-fuchsia-200">{story.instagramHandle}</span>}</p>
                  <p className="mt-0.5 text-xs text-white/65">{story.title} · {formatDate(story.createdAt)}{story.promptUsed && !story.videoUrl ? ` · ${story.promptUsed}` : ''}</p>
                  {story.videoUrl && <a href={story.videoUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-violet-200 hover:text-white"><Instagram size={11} /> Abrir no Instagram</a>}
                  <span className={`mt-2 block w-fit rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${story.videoUrl ? STATUS_CLASSES[story.status] : 'border-white/20 bg-white/10 text-white/60'}`}>{story.videoUrl ? STATUS_LABELS[story.status] : 'Registro'}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {story.status === 'pending' && (
                    <button type="button" onClick={() => void handleModeration(story, 'approved')} className="cursor-pointer rounded-xl bg-emerald-400/90 px-3 py-2 text-xs font-bold uppercase tracking-wider text-emerald-950 transition hover:bg-emerald-300">Aprovar</button>
                  )}
                  {story.status !== 'featured' && (
                    <button type="button" onClick={() => void handleModeration(story, 'featured')} className="inline-flex cursor-pointer items-center gap-1 rounded-xl bg-amber-400/90 px-3 py-2 text-xs font-bold uppercase tracking-wider text-amber-950 transition hover:bg-amber-300"><Trophy size={12} /> Destacar</button>
                  )}
                  <button type="button" onClick={() => void handleDelete(story)} aria-label="Excluir story" className="cursor-pointer rounded-xl border border-red-300/40 bg-red-400/15 p-2 text-red-200 transition hover:bg-red-400/30"><X size={14} /></button>
                </div>
              </div>
            ))
          )}
        </section>
      )}
    </div>
  );
};
