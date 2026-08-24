import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  Video, 
  Play, 
  Square, 
  RotateCcw, 
  Download, 
  Send, 
  Instagram, 
  Sparkles, 
  Trophy, 
  Flame, 
  Award, 
  CheckCircle2, 
  Copy, 
  Eye, 
  ChevronRight, 
  ThumbsUp, 
  Heart, 
  Share2, 
  Zap, 
  Volume2, 
  VolumeX, 
  FileText, 
  Layers, 
  HelpCircle,
  Clock,
  Check,
  X,
  Radio,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, StorySubmission, StoryBadge } from '../types';

interface StoryPromptOption {
  id: string;
  category: 'challenge' | 'episoden' | 'readclub' | 'expression' | 'routine';
  title: string;
  badgeTitle: string;
  teleprompterEn: string;
  teleprompterPt: string;
  suggestedCaption: string;
  hashtags: string;
  level: string;
}

const STORY_PROMPTS: StoryPromptOption[] = [
  {
    id: 'episoden-victory',
    category: 'episoden',
    title: 'Minha Rodada no Episoden',
    badgeTitle: 'Global Speaker',
    level: 'Iniciante ao Avançado',
    teleprompterEn: "Hey guys! I just finished my 7-minute conversation round on Brazilian Practice live. I talked with someone from another country and it was awesome! Destravando meu inglês todos os dias na Brazilian in Action! 🚀🔥",
    teleprompterPt: "E aí pessoal! Acabei de terminar minha rodada de 7 minutos no Brazilian Practice. Conversei com alguém de outro país e foi incrível! Destravando meu inglês todos os dias na Brazilian in Action! 🚀🔥",
    suggestedCaption: "Mais um dia destravando o inglês ao vivo no @brazilianinaction! 7 minutinhos de conversa e a confiança só aumenta. 🇺🇸🔥",
    hashtags: "#BrazilianInAction #EnglishPractice #EpisodenLive #FluenciaReal #BIAStories"
  },
  {
    id: 'daily-expression',
    category: 'expression',
    title: 'Expressão em Inglês do Dia',
    badgeTitle: 'Daily Teacher',
    level: 'Todos os Níveis',
    teleprompterEn: "Today at Brazilian in Action I learned the expression 'Piece of cake' / 'Break a leg' / 'Cut to the chase'. It means going straight to the point without wasting time. How about you? Did you know this one? Drop a comment! 💬✨",
    teleprompterPt: "Hoje na Brazilian in Action eu aprendi a expressão 'Cut to the chase'. Significa ir direto ao ponto sem enrolar. E você, já conhecia essa? Me conta aqui! 💬✨",
    suggestedCaption: "Expressão do dia direto da minha aula na @brazilianinaction! Quem já conhecia essa gíria? 📚✨",
    hashtags: "#DicaDeIngles #BrazilianInAction #AprenderIngles #EnglishTips"
  },
  {
    id: 'read-club-flow',
    category: 'readclub',
    title: 'Leitura & Pronúncia no Read Club',
    badgeTitle: 'Fluent Reader',
    level: 'Iniciante / Intermediário',
    teleprompterEn: "Practicing my reading and pronunciation today with the Read Club library on Brazilian in Action. Listening to the native audio and repeating each sentence. The accent training here is next level! 📖🎧",
    teleprompterPt: "Praticando minha leitura e pronúncia hoje com a biblioteca do Read Club na Brazilian in Action. Ouvindo o áudio nativo e repetindo cada frase. O treino de sotaque aqui é de outro nível! 📖🎧",
    suggestedCaption: "Treino pesado de pronúncia e reading no Read Club do @brazilianinaction! Cada dia um passo mais perto da fluência 🎧🇺🇸",
    hashtags: "#ReadClub #Pronunciation #BrazilianInAction #ReadingInEnglish"
  },
  {
    id: 'study-routine',
    category: 'routine',
    title: 'Minha Rotina de Estudos BIA',
    badgeTitle: 'Disciplined Hero',
    level: 'Todos os Níveis',
    teleprompterEn: "Consistency is key! Starting my English session right now on the Brazilian in Action platform. 15 minutes of quiz, practice, and conversation. No excuses, let's get it! 💪⚡",
    teleprompterPt: "Constância é a chave! Começando minha sessão de inglês agora mesmo na plataforma Brazilian in Action. 15 minutos de quiz, prática e conversação. Sem desculpas, bora! 💪⚡",
    suggestedCaption: "Rotina de estudos em dia! 15 minutinhos diários na melhor plataforma: @brazilianinaction 💪🔥",
    hashtags: "#EstudarIngles #StudyGram #BrazilianInAction #FocoFluencia"
  }
];

const INITIAL_STORIES: StorySubmission[] = [
  {
    id: 'story-1',
    studentId: 'aluno-1',
    studentName: 'Lucas Ferreira',
    studentAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    title: 'Falei 7 min em inglês pela primeira vez!',
    category: 'episoden',
    promptUsed: 'Minha Rodada no Episoden',
    createdAt: 'Hoje às 14:20',
    status: 'featured',
    likesCount: 28,
    instagramHandle: '@lucas_ferreirabjj'
  },
  {
    id: 'story-2',
    studentId: 'aluno-2',
    studentName: 'Camila Duarte',
    studentAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    title: 'Treino de pronúncia com as histórias do Read Club',
    category: 'readclub',
    promptUsed: 'Leitura & Pronúncia no Read Club',
    createdAt: 'Ontem às 19:10',
    status: 'approved',
    likesCount: 19,
    instagramHandle: '@camiladuarte_eng'
  },
  {
    id: 'story-3',
    studentId: 'aluno-3',
    studentName: 'Rodrigo Mello',
    studentAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
    title: 'Dica da expressão Hit the books!',
    category: 'expression',
    promptUsed: 'Expressão em Inglês do Dia',
    createdAt: 'Há 2 dias',
    status: 'approved',
    likesCount: 34,
    instagramHandle: '@rodrigomello_dev'
  }
];

const DEFAULT_BADGES: StoryBadge[] = [
  {
    id: 'badge-1',
    name: 'Primeiro Story BIA',
    description: 'Gravou e compartilhou o primeiro vídeo de inglês.',
    icon: '🎬',
    unlocked: true,
    dateUnlocked: '12/08/2026'
  },
  {
    id: 'badge-2',
    name: 'Global Speaker',
    description: 'Completou o desafio de falar sobre o treino no Episoden / Brazilian Practice.',
    icon: '🌍',
    unlocked: true,
    dateUnlocked: '14/08/2026'
  },
  {
    id: 'badge-3',
    name: 'Repost Oficial',
    description: 'Teve seu vídeo avaliado e repostado no Instagram oficial @brazilianinaction.',
    icon: '⭐',
    unlocked: false
  },
  {
    id: 'badge-4',
    name: 'Influencer da Fluência',
    description: 'Enviou 3 ou mais Stories na comunidade BIA.',
    icon: '👑',
    unlocked: false
  }
];

interface BrazilianStoriesProps {
  currentUser?: UserProfile | null;
  isAdmin?: boolean;
  accentColor?: string;
}

export const BrazilianStories: React.FC<BrazilianStoriesProps> = ({
  currentUser,
  isAdmin = false,
  accentColor = '#f59e0b'
}) => {
  const [activeTab, setActiveTab] = useState<'hall' | 'recorder' | 'rewards' | 'admin_submissions'>('hall');
  const [selectedPrompt, setSelectedPrompt] = useState<StoryPromptOption>(STORY_PROMPTS[0]);
  const [showTeleprompter, setShowTeleprompter] = useState(false);
  const [teleprompterSpeed, setTeleprompterSpeed] = useState<number>(2); // 1 to 3
  
  // Camera & Recording states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Submissions storage
  const [stories, setStories] = useState<StorySubmission[]>(() => {
    const saved = localStorage.getItem('bia_stories_submissions');
    return saved ? JSON.parse(saved) : INITIAL_STORIES;
  });

  // User badges & points
  const [badges, setBadges] = useState<StoryBadge[]>(() => {
    const saved = localStorage.getItem('bia_user_story_badges');
    return saved ? JSON.parse(saved) : DEFAULT_BADGES;
  });

  const [studentInstagram, setStudentInstagram] = useState<string>('');
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [likedStories, setLikedStories] = useState<string[]>([]);
  const [viewingStory, setViewingStory] = useState<StorySubmission | null>(null);

  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerIntervalRef = useRef<any>(null);

  // Save stories
  useEffect(() => {
    localStorage.setItem('bia_stories_submissions', JSON.stringify(stories));
  }, [stories]);

  // Clean up camera stream on unmount or tab change
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 720 }, height: { ideal: 1280 }, facingMode: 'user' },
        audio: true
      });
      streamRef.current = stream;
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError('Permissão da câmera ou microfone negada. Verifique as permissões do seu navegador.');
    }
  };

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const handleStartRecording = () => {
    if (!streamRef.current) return;
    setRecordedChunks([]);
    setRecordedVideoUrl(null);
    setRecordingSeconds(0);

    try {
      const recorder = new MediaRecorder(streamRef.current, { mimeType: 'video/webm' });
      mediaRecorderRef.current = recorder;

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedVideoUrl(url);
        setRecordedChunks(chunks);
        stopCameraStream();
      };

      recorder.start(100);
      setIsRecording(true);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 60) {
            // max 60s
            handleStopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.error('MediaRecorder error:', err);
      setCameraError('Seu navegador não suporta a gravação direta de vídeo.');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    clearInterval(timerIntervalRef.current);
    setIsRecording(false);
  };

  const handleResetRecording = () => {
    setRecordedVideoUrl(null);
    setRecordedChunks([]);
    setRecordingSeconds(0);
    setSubmissionSuccess(false);
    startCamera();
  };

  const handleDownloadStory = () => {
    if (!recordedVideoUrl) return;
    const a = document.createElement('a');
    a.href = recordedVideoUrl;
    a.download = `brazilian-in-action-story-${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopyInstagramCaption = () => {
    const textToCopy = `${selectedPrompt.suggestedCaption}\n\n${selectedPrompt.hashtags}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2500);
  };

  const handleSendToBIA = () => {
    const studentName = currentUser?.full_name || currentUser?.email?.split('@')[0] || 'Aluno BIA';
    
    const newSubmission: StorySubmission = {
      id: 'story-' + Date.now(),
      studentId: currentUser?.id || 'temp-id',
      studentName,
      title: selectedPrompt.title,
      category: selectedPrompt.category,
      promptUsed: selectedPrompt.title,
      videoUrl: recordedVideoUrl || undefined,
      createdAt: 'Agora mesmo',
      status: 'pending',
      likesCount: 1,
      instagramHandle: studentInstagram.trim() || undefined
    };

    setStories((prev) => [newSubmission, ...prev]);
    setSubmissionSuccess(true);

    // Unlock badges if needed
    setBadges((prev) =>
      prev.map((b) => (b.id === 'badge-1' ? { ...b, unlocked: true, dateUnlocked: 'Hoje' } : b))
    );
  };

  const handleLikeStory = (storyId: string) => {
    if (likedStories.includes(storyId)) return;
    setLikedStories((prev) => [...prev, storyId]);
    setStories((prev) =>
      prev.map((s) => (s.id === storyId ? { ...s, likesCount: s.likesCount + 1 } : s))
    );
  };

  const handleApproveStory = (storyId: string, featured: boolean = false) => {
    setStories((prev) =>
      prev.map((s) =>
        s.id === storyId ? { ...s, status: featured ? 'featured' : 'approved' } : s
      )
    );
  };

  const handleDeleteStory = (storyId: string) => {
    setStories((prev) => prev.filter((s) => s.id !== storyId));
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-8 select-none z-10">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-pink-500/20 to-orange-500/20 border border-pink-500/40 text-pink-300 font-mono text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 shadow-md">
              <Sparkles size={11} className="text-amber-400" />
              <span>O Palco Oficial da Sua Fluência</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-mono text-[10px] font-bold uppercase tracking-widest">
              Grave & Apareça no Instagram
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <span>Brazilian Post</span>
          </h1>

          <p className="text-xs sm:text-sm text-white/60 max-w-2xl mt-1.5 font-light leading-relaxed">
            Grave seus vídeos de prática em inglês no formato de stories/posts com câmera integrada, baixe para publicar no seu Instagram, marque <strong className="text-white font-medium">@brazilianinaction</strong> e envie para ser destaque no Instagram oficial e no Mural da Fama!
          </p>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex flex-wrap items-center gap-1.5 bg-neutral-950/80 border border-white/15 p-1.5 rounded-2xl backdrop-blur-xl shadow-xl self-start md:self-auto">
          <button
            onClick={() => {
              setActiveTab('hall');
              stopCameraStream();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold font-mono uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'hall'
                ? 'bg-amber-500 text-neutral-950 shadow-lg shadow-amber-500/20 font-extrabold'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Trophy size={14} />
            <span>Mural da Fama</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('recorder');
              startCamera();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold font-mono uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'recorder'
                ? 'bg-gradient-to-r from-pink-500 to-orange-500 text-white shadow-lg shadow-pink-500/25 font-extrabold'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Camera size={14} />
            <span>Gravar Story</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('rewards');
              stopCameraStream();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold font-mono uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'rewards'
                ? 'bg-amber-500 text-neutral-950 shadow-lg shadow-amber-500/20 font-extrabold'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Award size={14} />
            <span>Conquistas & Badges</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => {
                setActiveTab('admin_submissions');
                stopCameraStream();
              }}
              className={`px-3 py-2 rounded-xl text-xs font-bold font-mono uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'admin_submissions'
                  ? 'bg-red-500 text-white shadow-lg shadow-red-500/20'
                  : 'text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/30'
              }`}
            >
              <ShieldCheck size={14} />
              <span>Moderação ({stories.filter((s) => s.status === 'pending').length})</span>
            </button>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: MURAL DA FAMA (STORIES GALLERY & REPOST SHOWCASE) */}
      {/* ======================================================== */}
      {activeTab === 'hall' && (
        <div className="space-y-8">
          
          {/* TOP HIGHLIGHT BANNER */}
          <div className="relative rounded-3xl bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 border border-amber-500/40 p-6 sm:p-8 overflow-hidden shadow-[0_0_40px_rgba(245,158,11,0.1)]">
            <div className="absolute top-0 right-0 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-pink-500 text-white font-mono text-[10px] font-extrabold uppercase tracking-widest flex items-center gap-1.5 shadow-md">
                    <Instagram size={12} />
                    <span>Instagram Oficial @brazilianinaction</span>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white/70 font-mono text-[10px]">
                    Vídeos Destravando o Inglês
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  Compartilhe sua voz. Inspire a comunidade.
                </h2>

                <p className="text-xs sm:text-sm text-white/70 font-light leading-relaxed">
                  Quem fala inglês de verdade perde a vergonha e mostra para o mundo. Grave seu vídeo no teleprompter oficial, publique nos seus stories marcando <span className="text-pink-400 font-semibold">@brazilianinaction</span> e mande para a nossa equipe repostar você!
                </p>
              </div>

              <button
                onClick={() => {
                  setActiveTab('recorder');
                  startCamera();
                }}
                className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-orange-500 hover:from-pink-400 hover:to-orange-400 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2.5 cursor-pointer shadow-xl shadow-pink-500/25 hover:scale-[1.02] shrink-0"
              >
                <Camera size={16} />
                <span>Gravar Meu Story Agora</span>
              </button>
            </div>
          </div>

          {/* STORIES GRID */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="text-orange-400" size={16} />
                <h3 className="text-xs uppercase tracking-[0.2em] font-mono font-bold text-white/80">
                  Destaques da Comunidade BIA
                </h3>
              </div>
              <span className="text-[10px] text-white/40 font-mono">
                {stories.filter((s) => s.status !== 'pending').length} Vídeos Aprovados
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {stories
                .filter((s) => s.status !== 'pending' || isAdmin)
                .map((story) => (
                  <div
                    key={story.id}
                    className="relative rounded-2xl bg-neutral-950/80 border border-white/15 overflow-hidden backdrop-blur-xl hover:border-pink-500/50 transition-all flex flex-col justify-between group shadow-lg"
                  >
                    {/* Story Preview Card Header */}
                    <div className="p-4 flex items-center justify-between border-b border-white/10 bg-white/[0.02]">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={story.studentAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
                          alt={story.studentName}
                          className="w-8 h-8 rounded-full border border-pink-500/40 object-cover"
                        />
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-white leading-tight">
                            {story.studentName}
                          </span>
                          {story.instagramHandle && (
                            <span className="text-[10px] text-pink-400 font-mono">
                              {story.instagramHandle}
                            </span>
                          )}
                        </div>
                      </div>

                      {story.status === 'featured' && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[9px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                          <Trophy size={9} />
                          <span>Destaque</span>
                        </span>
                      )}
                      {story.status === 'pending' && (
                        <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 text-[9px] font-mono font-bold uppercase tracking-wider">
                          Pendente
                        </span>
                      )}
                    </div>

                    {/* Story Body */}
                    <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                      <div>
                        <span className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-white/50">
                          {story.promptUsed}
                        </span>

                        <h4 className="text-sm font-semibold text-white/90 mt-2 leading-snug">
                          "{story.title}"
                        </h4>
                      </div>

                      {/* Mock Vertical Video Screen Player or Real Video Blob */}
                      <div className="relative rounded-xl overflow-hidden bg-neutral-900 border border-white/10 aspect-[9/12] flex items-center justify-center group-hover:border-pink-500/40 transition-colors">
                        {story.videoUrl ? (
                          <video
                            src={story.videoUrl}
                            controls
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-center p-4 space-y-2">
                            <div className="w-12 h-12 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center mx-auto border border-pink-500/30">
                              <Play size={20} className="fill-current ml-0.5" />
                            </div>
                            <span className="text-[11px] text-white/60 font-mono block">
                              Story Gravado via BIA
                            </span>
                            <span className="text-[9px] text-white/40 block">
                              {story.createdAt}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Footer Actions */}
                    <div className="p-3.5 border-t border-white/10 bg-white/[0.01] flex items-center justify-between">
                      <button
                        onClick={() => handleLikeStory(story.id)}
                        className={`flex items-center gap-1.5 text-xs font-mono transition-colors cursor-pointer ${
                          likedStories.includes(story.id)
                            ? 'text-pink-500 font-bold'
                            : 'text-white/50 hover:text-pink-400'
                        }`}
                      >
                        <Heart size={14} className={likedStories.includes(story.id) ? 'fill-current' : ''} />
                        <span>{story.likesCount}</span>
                      </button>

                      <span className="text-[10px] text-white/40 font-mono">
                        {story.createdAt}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: GRAVADOR INTEGRADO (CAMERA + TELEPROMPTER 9:16)  */}
      {/* ======================================================== */}
      {activeTab === 'recorder' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT: TELEPROMPTER SELECTOR & PROMPT CARDS */}
          <div className="lg:col-span-5 space-y-4">
            
            <div className="flex items-center gap-2">
              <FileText className="text-amber-400" size={16} />
              <h3 className="text-xs uppercase tracking-[0.2em] font-mono font-bold text-white/80">
                1. Escolha o Tema do seu Story
              </h3>
            </div>

            <div className="space-y-2.5">
              {STORY_PROMPTS.map((prompt) => {
                const isSelected = selectedPrompt.id === prompt.id;
                return (
                  <div
                    key={prompt.id}
                    onClick={() => setSelectedPrompt(prompt)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-neutral-900 border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                        : 'bg-neutral-950/70 border-white/10 hover:border-white/25'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">
                        {prompt.title}
                      </span>
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-white/70">
                        {prompt.badgeTitle}
                      </span>
                    </div>

                    <p className="text-[11px] text-white/50 mt-1 line-clamp-2 font-light">
                      "{prompt.teleprompterPt}"
                    </p>
                  </div>
                );
              })}
            </div>

            {/* INSTAGRAM HANDLE & CAPTION HELPER */}
            <div className="p-4 rounded-2xl bg-neutral-950/80 border border-white/15 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Instagram size={14} className="text-pink-400" />
                  <span>Legenda Pronta para o Instagram</span>
                </span>
                
                <button
                  onClick={handleCopyInstagramCaption}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-pink-500 hover:text-white text-[10px] font-mono font-bold uppercase tracking-wider text-white/80 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedCaption ? (
                    <>
                      <Check size={11} className="text-emerald-400" />
                      <span>Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={11} />
                      <span>Copiar Texto</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-2.5 rounded-xl bg-black/50 border border-white/10 text-[11px] text-white/70 font-mono whitespace-pre-line leading-relaxed">
                {selectedPrompt.suggestedCaption}
                {'\n\n'}
                <span className="text-pink-400/80">{selectedPrompt.hashtags}</span>
              </div>

              <div>
                <label className="text-[10px] font-mono text-white/60 uppercase block mb-1">
                  Seu @ do Instagram (Opcional para marcação):
                </label>
                <input
                  type="text"
                  value={studentInstagram}
                  onChange={(e) => setStudentInstagram(e.target.value)}
                  placeholder="@seunome"
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>
            </div>
          </div>

          {/* RIGHT: LIVE CAMERA & TELEPROMPTER HUD (9:16 RATIO) */}
          <div className="lg:col-span-7 flex flex-col items-center">
            
            <div className="w-full max-w-sm relative rounded-3xl overflow-hidden border-2 border-white/20 shadow-2xl bg-black aspect-[9/16] flex flex-col justify-between">
              
              {/* LIVE CAMERA OR RECORDED VIDEO */}
              {recordedVideoUrl ? (
                <video
                  src={recordedVideoUrl}
                  controls
                  autoPlay
                  loop
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : isCameraActive ? (
                <video
                  ref={videoPreviewRef}
                  autoPlay
                  muted
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover -scale-x-100"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-3 bg-neutral-950">
                  <div className="w-16 h-16 rounded-full bg-white/5 border border-white/15 flex items-center justify-center text-white/40">
                    <Camera size={28} />
                  </div>
                  <p className="text-xs text-white/60 max-w-xs font-light">
                    {cameraError || 'Clique abaixo para ativar sua câmera e começar a gravar com o teleprompter embutido.'}
                  </p>
                  <button
                    onClick={startCamera}
                    className="px-4 py-2.5 rounded-xl bg-amber-500 text-neutral-950 text-xs font-bold font-mono uppercase tracking-wider transition-all hover:bg-amber-400 cursor-pointer shadow-lg"
                  >
                    Ativar Câmera
                  </button>
                </div>
              )}

              {/* TOP CAMERA CONTROLS: OPTIONAL TELEPROMPTER BUTTON */}
              {!recordedVideoUrl && isCameraActive && (
                <div className="relative z-30 m-3 flex items-center justify-between pointer-events-auto">
                  <button
                    type="button"
                    onClick={() => setShowTeleprompter(!showTeleprompter)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer backdrop-blur-md border shadow-lg ${
                      showTeleprompter
                        ? 'bg-amber-500 text-black border-amber-400 font-extrabold'
                        : 'bg-black/60 text-white/90 border-white/20 hover:bg-black/80 hover:text-white'
                    }`}
                    title={showTeleprompter ? 'Ocultar Teleprompter' : 'Exibir Teleprompter com roteiro'}
                  >
                    <FileText size={13} className={showTeleprompter ? 'text-black' : 'text-amber-400'} />
                    <span>{showTeleprompter ? 'Teleprompter Ligado' : 'Abrir Teleprompter'}</span>
                  </button>

                  <div className="px-2.5 py-1 rounded-full bg-black/60 border border-white/15 text-[10px] font-mono text-white/70 backdrop-blur-md">
                    9:16 HD
                  </div>
                </div>
              )}

              {/* OVERLAY: TELEPROMPTER TOP HUD (ENGLISH & PORTUGUESE) */}
              {!recordedVideoUrl && isCameraActive && showTeleprompter && (
                <div className="relative z-20 mx-3 mb-2 p-3.5 rounded-2xl bg-black/80 backdrop-blur-md border border-amber-500/30 text-center space-y-2 shadow-2xl animate-in fade-in">
                  <div className="flex items-center justify-between text-[9px] font-mono text-amber-400 font-bold uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                      <Sparkles size={11} />
                      <span>Roteiro de Apoio</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowTeleprompter(false)}
                      className="p-0.5 hover:bg-white/10 rounded text-white/60 hover:text-white cursor-pointer pointer-events-auto"
                      title="Fechar teleprompter"
                    >
                      <X size={12} />
                    </button>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-white leading-snug drop-shadow-md">
                    "{selectedPrompt.teleprompterEn}"
                  </p>
                  <p className="text-[10px] text-white/60 leading-tight">
                    ({selectedPrompt.teleprompterPt})
                  </p>
                </div>
              )}

              {/* OVERLAY: BOTTOM RECORDING CONTROLS */}
              <div className="relative z-20 mt-auto p-4 w-full bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col items-center gap-3">
                
                {/* RECORDING STATUS & STOPWATCH */}
                {isRecording && (
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/80 border border-red-400 text-white font-mono text-xs font-bold animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                    <span>GRAVANDO 00:{String(recordingSeconds).padStart(2, '0')}</span>
                  </div>
                )}

                {/* CONTROLS */}
                {!recordedVideoUrl ? (
                  isCameraActive && (
                    <div className="flex items-center gap-4">
                      {!isRecording ? (
                        <button
                          onClick={handleStartRecording}
                          className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.5)] transition-transform hover:scale-105 cursor-pointer border-4 border-white/20"
                          title="Iniciar Gravação"
                        >
                          <div className="w-6 h-6 rounded-full bg-white" />
                        </button>
                      ) : (
                        <button
                          onClick={handleStopRecording}
                          className="w-16 h-16 rounded-full bg-neutral-900 border-4 border-red-500 text-red-500 flex items-center justify-center shadow-lg transition-transform hover:scale-105 cursor-pointer"
                          title="Parar Gravação"
                        >
                          <Square size={24} className="fill-current" />
                        </button>
                      )}
                    </div>
                  )
                ) : (
                  /* POST RECORDING ACTIONS */
                  <div className="w-full space-y-2">
                    {submissionSuccess ? (
                      <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-center space-y-1">
                        <CheckCircle2 size={24} className="text-emerald-400 mx-auto" />
                        <span className="text-xs font-bold text-white block">
                          Story Enviado para a Brazilian in Action!
                        </span>
                        <span className="text-[10px] text-white/70 font-light block">
                          Nossa equipe vai avaliar para repostar você no Instagram oficial. Baixe o vídeo abaixo para postar agora no seu próprio story!
                        </span>
                      </div>
                    ) : (
                      <button
                        onClick={handleSendToBIA}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-400 hover:to-orange-400 text-white font-bold text-xs font-mono uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-pink-500/30"
                      >
                        <Send size={14} />
                        <span>Enviar para a Brazilian in Action</span>
                      </button>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={handleDownloadStory}
                        className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs font-mono uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Download size={14} />
                        <span>Baixar Vídeo</span>
                      </button>

                      <button
                        onClick={handleResetRecording}
                        className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-mono uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer"
                        title="Gravar Novamente"
                      >
                        <RotateCcw size={14} />
                        <span>Regravar</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: CONQUISTAS & BADGES (GAMIFICAÇÃO & RECOMPENSAS)   */}
      {/* ======================================================== */}
      {activeTab === 'rewards' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-neutral-950/80 border border-white/15 space-y-4">
            <div className="flex items-center gap-2">
              <Award className="text-amber-400" size={20} />
              <h2 className="text-lg font-bold text-white">
                Seu Progresso & Crachás de Fluência
              </h2>
            </div>
            <p className="text-xs text-white/60 max-w-xl font-light">
              Grave seus stories em inglês, marque a Brazilian in Action e desbloqueie crachás exclusivos que provam que você fala inglês sem medo na prática!
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              {badges.map((badge) => (
                <div
                  key={badge.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                    badge.unlocked
                      ? 'bg-amber-500/[0.08] border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
                      : 'bg-white/[0.02] border-white/10 opacity-50'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="text-3xl">{badge.icon}</div>
                    <h4 className="text-sm font-bold text-white">
                      {badge.name}
                    </h4>
                    <p className="text-[11px] text-white/60 font-light">
                      {badge.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] font-mono">
                    <span className={badge.unlocked ? 'text-amber-400 font-bold' : 'text-white/40'}>
                      {badge.unlocked ? 'Desbloqueado' : 'Bloqueado'}
                    </span>
                    {badge.dateUnlocked && (
                      <span className="text-white/40">{badge.dateUnlocked}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: PAINEL DE MODERAÇÃO DO CEO / ADMIN               */}
      {/* ======================================================== */}
      {activeTab === 'admin_submissions' && isAdmin && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm uppercase tracking-widest font-mono font-bold text-white">
              Painel de Avaliação de Stories ({stories.length})
            </h3>
            <span className="text-xs text-white/50 font-mono">
              Aprove ou destaque os vídeos enviados pelos alunos
            </span>
          </div>

          <div className="space-y-3">
            {stories.map((story) => (
              <div
                key={story.id}
                className="p-4 rounded-2xl bg-neutral-950/80 border border-white/15 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={story.studentAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
                    alt={story.studentName}
                    className="w-10 h-10 rounded-full object-cover border border-white/20"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{story.studentName}</span>
                      {story.instagramHandle && (
                        <span className="text-xs text-pink-400 font-mono">{story.instagramHandle}</span>
                      )}
                    </div>
                    <p className="text-xs text-white/60 font-light mt-0.5">
                      "{story.title}" • <span className="font-mono text-amber-400">{story.promptUsed}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-auto">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase ${
                    story.status === 'featured'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : story.status === 'approved'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
                  }`}>
                    {story.status}
                  </span>

                  {story.status === 'pending' && (
                    <button
                      onClick={() => handleApproveStory(story.id, false)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500 text-neutral-950 text-xs font-bold font-mono uppercase tracking-wider transition-all hover:bg-emerald-400 cursor-pointer"
                    >
                      Aprovar
                    </button>
                  )}

                  <button
                    onClick={() => handleApproveStory(story.id, true)}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 text-neutral-950 text-xs font-bold font-mono uppercase tracking-wider transition-all hover:bg-amber-400 cursor-pointer flex items-center gap-1"
                  >
                    <Trophy size={12} />
                    <span>Destacar</span>
                  </button>

                  <button
                    onClick={() => handleDeleteStory(story.id)}
                    className="p-1.5 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all cursor-pointer"
                    title="Excluir"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
