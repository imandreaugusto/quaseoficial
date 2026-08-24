import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Languages,
  Send,
  Copy,
  Check,
  Volume2,
  Sparkles,
  Bookmark,
  History,
  Trash2,
  Globe,
  MessageSquare,
  X,
  Loader2,
  BookOpen,
  ArrowRight,
  Info,
  Maximize2,
  Minimize2,
  Smartphone,
  Camera,
  Video,
  VideoOff,
  Circle,
  Square,
  Sliders,
  Play,
  Mic,
  MicOff,
  ChevronDown
} from 'lucide-react';

export interface TranslationOption {
  badge?: string;
  title: string;
  english: string;
  context: string;
  toneAndEmphasis?: string;
}

export interface LiteralVsNative {
  literalEnglish: string;
  whyItSoundsWrong: string;
  nativeThinking: string;
}

export interface VocabularyHighlight {
  term: string;
  meaning: string;
}

export interface TranslationData {
  originalText: string;
  detectedLanguage?: string;
  literalVsNative?: LiteralVsNative;
  theWhyReason?: string;
  etiquetteTip?: string;
  options: TranslationOption[];
  culturalNote: string;
  vocabularyHighlights: VocabularyHighlight[];
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  input: string;
  result: TranslationData;
}

interface BrazilianTradutorProps {
  accentColor?: string;
  isModal?: boolean;
  onCloseModal?: () => void;
}

const FloatingCameraFeed: React.FC<{
  stream: MediaStream | null;
  shape: 'circle' | 'square' | 'badge_gold' | 'badge_emerald';
  pos: 'tr' | 'tl' | 'br' | 'bl';
  size: 'sm' | 'md' | 'lg';
}> = ({ stream, shape, pos, size }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  if (!stream) return null;

  const posClass =
    pos === 'tl'
      ? 'top-3 left-3'
      : pos === 'tr'
      ? 'top-3 right-3'
      : pos === 'bl'
      ? 'bottom-16 left-3'
      : 'bottom-16 right-3';

  const sizeClass =
    size === 'sm'
      ? 'w-24 h-24'
      : size === 'lg'
      ? 'w-40 h-40'
      : 'w-32 h-32';

  const shapeClass =
    shape === 'circle'
      ? 'rounded-full border-4 border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.6)] overflow-hidden'
      : shape === 'square'
      ? 'rounded-3xl border-4 border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.6)] overflow-hidden'
      : shape === 'badge_emerald'
      ? 'rounded-full border-4 border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.6)] overflow-hidden'
      : 'rounded-2xl border-4 border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.6)] overflow-hidden';

  return (
    <div className={`absolute z-30 transition-all duration-300 pointer-events-none ${posClass}`}>
      <div className={`relative bg-neutral-950 ${sizeClass} ${shapeClass}`}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
      </div>
    </div>
  );
};

export const BrazilianTradutor: React.FC<BrazilianTradutorProps> = ({
  accentColor = '#ff8c00',
  isModal = false,
  onCloseModal
}) => {
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentResult, setCurrentResult] = useState<TranslationData | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  // Collapsible History State (Always starts CLOSED)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Speech Recognition State for Voice Input
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Reconhecimento de voz não é suportado neste navegador.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) {
        setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
      }
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  };

  //  TikTok / Reels Creator Studio & WebCam State
  const [isReelsStudioMode, setIsReelsStudioMode] = useState(false);
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const [cameraShape, setCameraShape] = useState<'circle' | 'square' | 'badge_gold' | 'badge_emerald'>('circle');
  const [cameraPos, setCameraPos] = useState<'tr' | 'tl' | 'br' | 'bl'>('br');
  const [cameraSize, setCameraSize] = useState<'sm' | 'md' | 'lg'>('md');

  const [history, setHistory] = useState<HistoryItem[]>(() => {
    const saved = localStorage.getItem('bia_tradutor_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse translation history', e);
      }
    }
    return [
      {
        id: 'sample-1',
        timestamp: Date.now() - 3600000,
        input: 'Obrigado pastor, eu amo sua vida e me inspiro em você.',
        result: {
          originalText: 'Obrigado pastor, eu amo sua vida e me inspiro em você.',
          literalVsNative: {
            literalEnglish: 'Thank you pastor, I love your life and am inspired in you.',
            whyItSoundsWrong: 'Em inglês, "I love your life" soa como se você estivesse cobiçando o estilo de vida de alguém ou admirando a rotina dele de longe, e não expressando afeto e carinho interpessoal.',
            nativeThinking: 'Os americanos expressam esse tipo de apreço usando "I appreciate you" (eu valorizo você como ser humano) ou "I\'m grateful for your life" (sou grato por sua existência).'
          },
          theWhyReason: 'Diferença de Estrutura e Cultura: No português do Brasil, "amo sua vida" é uma expressão idiomática muito forte no contexto comunitário/cristão. Em inglês, a palavra "life" é um objeto abstrato; aplicar o verbo "love" diretamente a ela tira o foco da pessoa em si. Por isso, a cultura americana usa o verbo "appreciate" focado na pessoa ("I appreciate YOU"), validando a existência individual da pessoa.',
          etiquetteTip: '"I appreciate you" é extremamente respeitoso, afetuoso e adequado em qualquer ambiente nos EUA: em igrejas, no trabalho, com líderes, amigos ou família.',
          options: [
            {
              badge: 'Dia a Dia / Conversacional',
              title: 'Opção 1 (A mais natural e calorosa no cotidiano):',
              english: "Thank you, Pastor. I appreciate you and you're a big inspiration to me.",
              context: 'Tradução: "Obrigado, Pastor. Eu te valorizo/aprecio e você é uma grande inspiração para mim."',
              toneAndEmphasis: 'Diga enfatizando levemente a palavra "you" ao falar "I appreciate YOU" para soar caloroso e sincero.'
            },
            {
              badge: 'Comunidade / Religioso',
              title: 'Opção 2 (Ideal para o ambiente de igreja e comunidade):',
              english: "Thank you, Pastor. I'm so grateful for your life and I really look up to you.",
              context: 'Tradução: "Obrigado, Pastor. Sou muito grato pela sua vida e me inspiro muito em você."',
              toneAndEmphasis: 'Pronuncie "grateful for your life" de forma calma e solene.'
            },
            {
              badge: 'Informal / Afetuoso',
              title: 'Opção 3 (Mais direta para relacionamentos próximos):',
              english: "Thank you, Pastor. I love you too and you truly inspire me.",
              context: 'Tradução: "Obrigado, Pastor. Eu te amo também e você realmente me inspira."',
              toneAndEmphasis: 'Excelente para líderes com quem você tem amizade pessoal e próxima.'
            }
          ],
          culturalNote:
            'Nos EUA, "I appreciate you" é a expressão máxima para demonstrar carinho pela vida e presença de alguém. Para se referir a inspirar-se em um modelo de conduta, use o phrasal verb "look up to".',
          vocabularyHighlights: [
            {
              term: 'I appreciate you',
              meaning: 'Forma nativa mais comum para expressar "eu te valorizo / sou grato por você existir".'
            },
            {
              term: 'Look up to someone',
              meaning: 'Phrasal verb que significa admirar e ter alguém como exemplo de vida.'
            }
          ]
        }
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('bia_tradutor_history', JSON.stringify(history));
  }, [history]);

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      setWebcamStream(stream);
      setIsWebcamActive(true);
    } catch (err) {
      alert('Não foi possível acessar a câmera do dispositivo. Verifique se deu permissão ao navegador.');
    }
  };

  const stopWebcam = () => {
    if (webcamStream) {
      webcamStream.getTracks().forEach((track) => track.stop());
    }
    setWebcamStream(null);
    setIsWebcamActive(false);
  };

  const handleTranslate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/cultural-translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: inputText
        })
      });

      if (!res.ok) {
        throw new Error(`Erro na tradução (${res.status})`);
      }

      const data = await res.json();
      if (data.translationData) {
        setCurrentResult(data.translationData);

        const newHistoryItem: HistoryItem = {
          id: `hist-${Date.now()}`,
          timestamp: Date.now(),
          input: inputText,
          result: data.translationData
        };

        setHistory((prev) => [newHistoryItem, ...prev.slice(0, 19)]);
      }
    } catch (err) {
      console.error('Translate error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyText = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleSpeak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleDeleteHistory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistory((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className={`w-full max-w-7xl mx-auto px-3 sm:px-6 ${isModal ? 'py-2' : ''}`}>
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div
              className="p-2 rounded-xl text-black shadow-lg"
              style={{ backgroundColor: accentColor }}
            >
              <Languages size={22} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Brazilian Tradutor
            </h1>
          </div>
        </div>

        {/* TOP ACTION CONTROLS */}
        <div className="flex flex-wrap items-center gap-2">
          {isModal && onCloseModal && (
            <button
              type="button"
              onClick={onCloseModal}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer ml-1"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* STANDARD DUAL-COLUMN TRANSLATOR LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN: INPUT & OPTIONS */}
          <div className="lg:col-span-7 space-y-6">
            {/* TRANSLATION INPUT CARD */}
            <div className="bg-neutral-900/60 backdrop-blur-xl border border-amber-500/30 hover:border-amber-400/50 rounded-3xl p-5 sm:p-6 shadow-[0_0_20px_rgba(245,158,11,0.08)] transition-all">
              <form onSubmit={handleTranslate} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-mono font-bold uppercase tracking-widest text-amber-400/90">
                      Frase ou Texto em Português:
                    </label>

                    {/* DISCRETE MIC BUTTON */}
                    <button
                      type="button"
                      onClick={toggleListening}
                      className={`p-1.5 px-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 border ${
                        isListening
                          ? 'bg-red-500/20 text-red-400 border-red-500/50 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.3)]'
                          : 'bg-black/40 hover:bg-white/10 text-white/70 hover:text-amber-300 border-white/15 hover:border-amber-500/40'
                      }`}
                      title={isListening ? 'Ouvindo... Clique para parar' : 'Falar por voz (Microfone)'}
                    >
                      {isListening ? <MicOff size={14} className="text-red-400" /> : <Mic size={14} />}
                      <span className="text-[11px] font-mono">{isListening ? 'Gravando...' : 'Falar'}</span>
                    </button>
                  </div>

                  <textarea
                    required
                    rows={4}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Ex: Obrigado pastor, eu amo sua vida e me inspiro em você..."
                    className="w-full p-4 rounded-2xl bg-black/40 border border-amber-500/30 text-white placeholder-white/30 text-sm sm:text-base focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 shadow-[0_0_15px_rgba(245,158,11,0.1)] leading-relaxed resize-none transition-all"
                  />
                </div>

                {/* SUBMIT BUTTON */}
                <button
                  type="submit"
                  disabled={loading || !inputText.trim()}
                  className="w-full py-3.5 px-6 rounded-2xl bg-neutral-900/80 hover:bg-neutral-800 text-amber-300 border border-amber-500/50 hover:border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:shadow-[0_0_25px_rgba(245,158,11,0.4)] backdrop-blur-md font-extrabold text-sm uppercase tracking-wider transition-all disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin text-amber-400" />
                      <span>Analisando Expressões Americanas...</span>
                    </>
                  ) : (
                    <>
                      <Send size={18} className="text-amber-400" />
                      <span>Come on Brazilian</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* RESULTS DISPLAY */}
            <AnimatePresence mode="wait">
              {currentResult && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  {/* CONTRASTE: AO PÉ DA LETRA VS NATIVO */}
                  {currentResult.literalVsNative && (
                    <div className="bg-neutral-900/80 border border-red-500/30 rounded-3xl p-5 sm:p-6 backdrop-blur-xl shadow-xl space-y-3">
                      <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-red-400 flex items-center gap-2">
                        <Info size={15} />
                        <span>Contraste: Ao Pé da Letra vs Pensamento Nativo</span>
                      </h4>

                      <div className="space-y-2.5">
                        <div className="p-3.5 rounded-2xl bg-red-950/20 border border-red-500/20 text-xs sm:text-sm">
                          <div className="font-mono text-red-300 font-bold mb-1">
                            Ao pé da letra (Incorreto / Não-natural): "{currentResult.literalVsNative.literalEnglish}"
                          </div>
                          <p className="text-white/80 leading-relaxed font-sans">
                            {currentResult.literalVsNative.whyItSoundsWrong}
                          </p>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 text-xs sm:text-sm">
                          <div className="font-mono text-emerald-300 font-bold mb-1">
                            Como o Americano Pensa (Nativo):
                          </div>
                          <p className="text-white/80 leading-relaxed font-sans">
                            {currentResult.literalVsNative.nativeThinking}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* O PORQUÊ DAS COISAS (A LÓGICA POR TRÁS DA FRASE) */}
                  {currentResult.theWhyReason && (
                    <div className="bg-neutral-900/80 border border-amber-500/30 rounded-3xl p-5 sm:p-6 backdrop-blur-xl shadow-[0_0_15px_rgba(245,158,11,0.12)] space-y-2">
                      <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-amber-400 flex items-center gap-2">
                        <BookOpen size={16} />
                        <span>Por que é assim? (Lógica e Regra Cultural)</span>
                      </h4>
                      <p className="text-xs sm:text-sm text-white/90 leading-relaxed font-sans">
                        {currentResult.theWhyReason}
                      </p>
                    </div>
                  )}

                  {/* TRANSLATION OPTIONS LIST */}
                  <div className="bg-neutral-900/80 border border-white/15 rounded-3xl p-5 sm:p-6 backdrop-blur-xl shadow-2xl space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-amber-400 font-mono flex items-center gap-2">
                      <Globe size={16} />
                      <span>Traduções em Inglês Americano Natural</span>
                    </h3>

                    <div className="space-y-4">
                      {currentResult.options.map((opt, idx) => (
                        <div
                          key={idx}
                          className="p-4 sm:p-5 rounded-2xl bg-black/60 border border-white/10 hover:border-amber-400/40 transition-all space-y-2 group"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {opt.badge && (
                                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold uppercase tracking-wider">
                                  {opt.badge}
                                </span>
                              )}
                              <p className="text-xs sm:text-sm font-bold text-white/90 leading-snug">
                                {opt.title}
                              </p>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleSpeak(opt.english)}
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition-all cursor-pointer"
                                title="Ouvir Pronúncia Americana"
                              >
                                <Volume2 size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCopyText(opt.english, idx)}
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition-all flex items-center gap-1 cursor-pointer"
                                title="Copiar Frase"
                              >
                                {copiedIdx === idx ? (
                                  <Check size={15} className="text-emerald-400" />
                                ) : (
                                  <Copy size={15} />
                                )}
                              </button>
                            </div>
                          </div>

                          <p className="text-base sm:text-lg font-extrabold text-amber-300 leading-relaxed font-sans pl-1 border-l-2 border-amber-400/60">
                            "{opt.english}"
                          </p>

                          {opt.context && (
                            <p className="text-xs font-mono text-white/70 italic pl-1">
                              {opt.context}
                            </p>
                          )}

                          {opt.toneAndEmphasis && (
                            <p className="text-[11px] font-sans text-amber-200/80 bg-amber-950/20 p-2 rounded-xl border border-amber-500/20">
                              <strong className="text-amber-300">Dica de Tom e Ênfase:</strong> {opt.toneAndEmphasis}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ETIQUETA SOCIAL E CONTEXTO DE USO */}
                  {currentResult.etiquetteTip && (
                    <div className="bg-neutral-900/80 border border-blue-500/30 rounded-3xl p-5 sm:p-6 backdrop-blur-xl shadow-xl space-y-2">
                      <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-blue-400 flex items-center gap-2">
                        <Globe size={15} />
                        <span>Etiqueta Social e Contexto de Uso nos EUA</span>
                      </h4>
                      <p className="text-xs sm:text-sm text-white/90 leading-relaxed font-sans">
                        {currentResult.etiquetteTip}
                      </p>
                    </div>
                  )}

                  {/* NOTA CULTURAL RESUMIDA */}
                  {currentResult.culturalNote && (
                    <div className="bg-neutral-900/80 border border-amber-500/30 rounded-3xl p-5 sm:p-6 backdrop-blur-xl shadow-[0_0_15px_rgba(245,158,11,0.12)] space-y-2 relative overflow-hidden">
                      <div className="flex items-center gap-2.5 mb-2 text-amber-300 font-bold text-base">
                        <BookOpen size={20} className="text-amber-400" />
                        <span>Resumo de Contexto Cultural</span>
                      </div>

                      <p className="text-sm sm:text-base text-white/90 font-sans leading-relaxed whitespace-pre-line">
                        {currentResult.culturalNote}
                      </p>
                    </div>
                  )}

                  {/* VOCABULARY HIGHLIGHTS */}
                  {currentResult.vocabularyHighlights && currentResult.vocabularyHighlights.length > 0 && (
                    <div className="bg-neutral-900/80 border border-white/15 rounded-3xl p-5 sm:p-6 backdrop-blur-xl shadow-xl">
                      <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-400 mb-3 flex items-center gap-2">
                        <Sparkles size={14} />
                        <span>Destaques de Vocabulário & Expressões</span>
                      </h4>

                      <div className="grid grid-cols-1 gap-2.5">
                        {currentResult.vocabularyHighlights.map((vh, i) => (
                          <div
                            key={i}
                            className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                          >
                            <span className="text-sm font-bold text-emerald-300 font-mono">
                              {vh.term}
                            </span>
                            <span className="text-xs text-white/80 font-sans">
                              {vh.meaning}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* RIGHT COLUMN: RECENT HISTORY & TIPS */}
          <div className="lg:col-span-5 space-y-6">
            {/* HISTORY CARD - COLLAPSIBLE & STARTS CLOSED */}
            <div className="bg-neutral-900/80 border border-white/15 rounded-3xl p-4 sm:p-5 backdrop-blur-xl shadow-xl transition-all">
              <button
                type="button"
                onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                className="w-full flex items-center justify-between select-none cursor-pointer text-left"
              >
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <History size={18} className="text-amber-400" />
                  <span>Histórico de Consultas</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-white/50 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/10">
                    {history.length} {history.length === 1 ? 'salva' : 'salvas'}
                  </span>
                  <ChevronDown
                    size={18}
                    className={`text-white/60 transition-transform duration-300 ${isHistoryOpen ? 'rotate-180' : ''}`}
                  />
                </div>
              </button>

              <AnimatePresence>
                {isHistoryOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-4 mt-3 border-t border-white/10 space-y-3 max-h-[450px] overflow-y-auto pr-1">
                      {history.length === 0 ? (
                        <div className="text-center py-6 text-xs text-white/40 font-mono">
                          Nenhuma tradução recente no histórico.
                        </div>
                      ) : (
                        history.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => {
                              setInputText(item.input);
                              setCurrentResult(item.result);
                            }}
                            className="p-3.5 rounded-2xl bg-black/50 border border-white/10 hover:border-amber-400/50 transition-all cursor-pointer group"
                          >
                            <div className="flex items-center justify-between text-[10px] font-mono text-white/40 mb-1">
                              <span>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              <button
                                type="button"
                                onClick={(e) => handleDeleteHistory(item.id, e)}
                                className="opacity-0 group-hover:opacity-100 p-1 text-white/40 hover:text-red-400 transition-all cursor-pointer"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>

                            <p className="text-xs font-medium text-white/90 line-clamp-2 mb-1">
                              "{item.input}"
                            </p>

                            {item.result.options[0] && (
                              <p className="text-[11px] font-mono text-amber-300 font-bold truncate">
                                → {item.result.options[0].english}
                              </p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
  );
};

