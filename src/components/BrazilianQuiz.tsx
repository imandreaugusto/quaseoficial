import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  HelpCircle,
  Trophy,
  Sparkles,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  Trash2,
  Maximize2,
  Minimize2,
  Loader2,
  BookOpen,
  Zap,
  Flame,
  Award,
  Volume2,
  Share2,
  Check,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { BrazilianLogo } from './BrazilianLogo';
import { syncToCloud } from '../lib/cloudSync';

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number; // 0-based index
  explanation: string;
}

export interface QuizData {
  id: string;
  title: string;
  category: string;
  level: string;
  questions: QuizQuestion[];
  isCustom?: boolean;
}

export interface QuizSession {
  id: string;
  quizId: string;
  className: string;
  date: string;
  score: number;
  total: number;
}

const DEFAULT_QUIZZES: QuizData[] = [
  {
    id: 'falsos-cognatos-1',
    title: 'Falsos Cognatos Perigosos (False Friends)',
    category: 'Vocabulário',
    level: 'Intermediário',
    questions: [
      {
        id: 1,
        question: "O que a palavra 'Pretend' realmente significa em inglês?",
        options: ['Fingir', 'Pretender ou ter intenção', 'Prestar atenção', 'Proteger'],
        correctAnswer: 0,
        explanation: "'Pretend' significa FINGIR. Para dizer 'pretender', o correto é usar o verbo 'INTEND' (ex: I intend to travel)."
      },
      {
        id: 2,
        question: "Como você pede a localização de uma 'Livraria' (onde se compram livros) em inglês?",
        options: ['Library', 'Bookstore', 'Stationery', 'Papercraft'],
        correctAnswer: 1,
        explanation: "'Library' é BIBLIOTECA (onde se pegam livros emprestados). 'Livraria' (onde se compra) é 'BOOKSTORE'."
      },
      {
        id: 3,
        question: "O que significa 'Push' na porta de uma loja?",
        options: ['Puxar', 'Empurrar', 'Pressionar o alarme', 'Parar'],
        correctAnswer: 1,
        explanation: "'PUSH' significa EMPURRAR. Para puxar, a palavra em inglês é 'PULL'."
      },
      {
        id: 4,
        question: "O que um colega de trabalho quer dizer com 'I am currently working on this'?",
        options: ['Ele está trabalhando nisso correntemente/atualmente', 'Ele está trabalhando nisso rapidamente', 'Ele está correndo no trabalho', 'Ele não vai fazer isso'],
        correctAnswer: 0,
        explanation: "'Currently' significa ATUALMENTE / NO MOMENTO, e não 'correntemente'."
      },
      {
        id: 5,
        question: "O termo 'Eventually' significa:",
        options: ['Eventualmente (de vez em quando)', 'No final das contas / Com o tempo', 'Eventualmente raramente', 'Infelizmente'],
        correctAnswer: 1,
        explanation: "'Eventually' significa 'No final / Com o tempo' (ex: He eventually passed the test). Para dizer 'eventualmente/de vez em quando', use 'Occasionally' ou 'From time to time'."
      }
    ]
  },
  {
    id: 'girias-brasil-1',
    title: 'Expressões e Gírias Brasileiras em Inglês',
    category: 'Gírias & Cultura',
    level: 'Todos os Níveis',
    questions: [
      {
        id: 1,
        question: "Como dizer 'Tirar o cavalo da chuva' de forma natural em inglês?",
        options: ["Don't hold your breath", "Take the horse out of the rain", "Rain on my parade", "Stop holding the horse"],
        correctAnswer: 0,
        explanation: "'Don't hold your breath' é o equivalente perfeito para dizer a alguém que não espere que algo vá acontecer."
      },
      {
        id: 2,
        question: "Como se traduz a expressão 'Pagar o pato' em contexto profissional ou cotidiano?",
        options: ["Pay the duck", "Take the blame / Pay the price", "Duck the payment", "Buy the bird"],
        correctAnswer: 1,
        explanation: "'Take the blame' significa levar a culpa ou pagar o pato por algo que aconteceu."
      },
      {
        id: 3,
        question: "Como você diz 'Dar uma olhadinha' em inglês informal?",
        options: ["Take a small eye", "Take a look / Have a look / Check it out", "Look a little bit", "Eye it up"],
        correctAnswer: 1,
        explanation: "'Take a look' ou 'Check it out' são as expressões usadas diariamente para 'dar uma olhadinha'."
      },
      {
        id: 4,
        question: "Qual frase equivale a 'Mão de vaca' (pessoa pão-dura)?",
        options: ["Cow hand", "Tightfisted / Stingy / Cheap", "Hard-headed", "Heavy-handed"],
        correctAnswer: 1,
        explanation: "'Tightfisted' (mão fechada) ou 'Stingy/Cheap' são os termos em inglês para pessoas pão-duras."
      },
      {
        id: 5,
        question: "Como dizer 'Dar o braço a torcer'?",
        options: ["Twist your arm", "Admit defeat / Give in / Bend the knee", "Arm-wrestle someone", "Break an arm"],
        correctAnswer: 1,
        explanation: "Para dizer 'dar o braço a torcer' use 'Give in' ou 'Admit you were wrong'. Curiosidade: 'Twist my arm' significa 'Forçar minha barra'!"
      }
    ]
  },
  {
    id: 'gramatica-erros-comuns',
    title: 'Erros Comuns de Brasileiros Falando Inglês',
    category: 'Gramática',
    level: 'Iniciante / Intermediário',
    questions: [
      {
        id: 1,
        question: "Qual é a frase correta para dizer 'Tenho 30 anos' em inglês?",
        options: ["I have 30 years old", "I am 30 years old", "I make 30 years", "I complete 30 years"],
        correctAnswer: 1,
        explanation: "Em inglês nós 'SOMOS' a idade usando o verbo TO BE ('I am 30 years old' ou apenas 'I am 30'), nunca o verbo 'have'."
      },
      {
        id: 2,
        question: "Como se diz 'Tem uma pessoa na porta' em inglês correto?",
        options: ["Has a person at the door", "Have a person on the door", "There is a person at the door", "It has a person at the door"],
        correctAnswer: 2,
        explanation: "Para indicar existência ('tem/há'), usa-se 'THERE IS' (singular) ou 'THERE ARE' (plural), e não o verbo 'have'."
      },
      {
        id: 3,
        question: "Como você responde naturalmente quando perguntam 'How are you?'",
        options: ["I'm fine, thanks. And you?", "I am complete good", "I have fine", "So so and you?"],
        correctAnswer: 0,
        explanation: "'I'm fine, thanks. And you?' ou 'I'm good, how about you?' são respostas naturais e educadas."
      },
      {
        id: 4,
        question: "Qual é a preposição correta para dias da semana? (Ex: Na segunda-feira)",
        options: ["In Monday", "At Monday", "On Monday", "By Monday"],
        correctAnswer: 2,
        explanation: "Para dias da semana específicos, sempre usamos a preposição 'ON': On Monday, On Friday, On weekends."
      },
      {
        id: 5,
        question: "Como se diz 'Eu concordo com você' em inglês?",
        options: ["I am agree with you", "I agree with you", "I have agreement with you", "I agrees with you"],
        correctAnswer: 1,
        explanation: "'Agree' já é o verbo 'concordar'. Portanto basta dizer 'I agree' (não coloque o 'am')."
      }
    ]
  }
];

interface BrazilianQuizProps {
  accentColor?: string;
}

export const BrazilianQuiz: React.FC<BrazilianQuizProps> = ({ accentColor = '#ff8c00' }) => {
  // Saved / custom quizzes list
  const [quizzes, setQuizzes] = useState<QuizData[]>(() => {
    const saved = localStorage.getItem('bia_quizzes');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved quizzes', e);
      }
    }
    return DEFAULT_QUIZZES;
  });

  // Quiz Class Sessions History
  const [quizSessions, setQuizSessions] = useState<QuizSession[]>(() => {
    const saved = localStorage.getItem('bia_quiz_sessions');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved quiz sessions', e);
      }
    }
    return [];
  });

  // Active Quiz & Class Selection State
  const [activeQuiz, setActiveQuiz] = useState<QuizData | null>(null);
  const [activeClassName, setActiveClassName] = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  // Catalog Filtering & Search
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [searchQuery, setSearchQuery] = useState('');

  // Classroom Mode / Fullscreen Presentation
  const [isClassroomMode, setIsClassroomMode] = useState(false);

  // Modals
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [promptTopic, setPromptTopic] = useState('');
  const [promptLevel, setPromptLevel] = useState('Intermediário');
  const [promptNumQuestions, setPromptNumQuestions] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');

  // Save state
  useEffect(() => {
    localStorage.setItem('bia_quizzes', JSON.stringify(quizzes));
  }, [quizzes]);

  useEffect(() => {
    localStorage.setItem('bia_quiz_sessions', JSON.stringify(quizSessions));
  }, [quizSessions]);

  // Handle starting a quiz
  const handleStartQuiz = (quiz: QuizData) => {
    setActiveQuiz(quiz);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setIsAnswerSubmitted(false);
    setScore(0);
    setIsCompleted(false);
  };

  // Submit Answer
  const handleSelectOption = (idx: number) => {
    if (isAnswerSubmitted) return;
    setSelectedAnswer(idx);
  };

  const handleConfirmAnswer = () => {
    if (selectedAnswer === null || !activeQuiz) return;
    setIsAnswerSubmitted(true);

    const currentQ = activeQuiz.questions[currentQuestionIndex];
    if (selectedAnswer === currentQ.correctAnswer) {
      setScore((prev) => prev + 1);
    }
  };

  // Next Question or Finish
  const handleNextQuestion = () => {
    if (!activeQuiz) return;

    if (currentQuestionIndex < activeQuiz.questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setIsAnswerSubmitted(false);
    } else {
      setIsCompleted(true);
      // Save session with class tracking
      const finalClassName = activeClassName.trim() || 'Geral / Sem Turma';
      const newSession: QuizSession = {
        id: `sess-${Date.now()}`,
        quizId: activeQuiz.id,
        className: finalClassName,
        date: new Date().toLocaleDateString('pt-BR'),
        score: score,
        total: activeQuiz.questions.length,
      };
      setQuizSessions((prev) => [newSession, ...prev]);
    }
  };

  // Reset Quiz
  const handleRestartQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setIsAnswerSubmitted(false);
    setScore(0);
    setIsCompleted(false);
  };

  // AI Generator Handler
  const handleGenerateAiQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptTopic.trim()) return;

    setIsGenerating(true);
    setGenerateError('');

    try {
      const res = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: promptTopic,
          level: promptLevel,
          numQuestions: promptNumQuestions
        })
      });

      if (!res.ok) {
        throw new Error(`Servidor respondeu com código ${res.status}`);
      }

      const data = await res.json();
      if (data.quiz && data.quiz.questions && data.quiz.questions.length > 0) {
        const newCustomQuiz: QuizData = {
          id: `ai-quiz-${Date.now()}`,
          title: data.quiz.title || `Quiz sobre ${promptTopic}`,
          category: data.quiz.category || 'IA Especial',
          level: promptLevel,
          questions: data.quiz.questions,
          isCustom: true
        };

        setQuizzes((prev) => [newCustomQuiz, ...prev]);
        setIsGeneratorOpen(false);
        setPromptTopic('');
        handleStartQuiz(newCustomQuiz);
      } else {
        throw new Error('Formato do quiz retornado é inválido');
      }
    } catch (err: any) {
      console.error('Quiz AI Generation Error:', err);
      setGenerateError(err.message || 'Falha ao gerar o Quiz. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Delete Custom Quiz
  const handleDeleteQuiz = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Deseja excluir este Quiz personalizado?')) {
      setQuizzes((prev) => prev.filter((q) => q.id !== id));
      if (activeQuiz?.id === id) {
        setActiveQuiz(null);
      }
    }
  };

  // Text-To-Speech Speech Assistant
  const handleSpeakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Filtered Quizzes
  const categoriesList = ['Todos', 'Vocabulário', 'Gírias & Cultura', 'Gramática', 'Personalizados'];
  const filteredQuizzes = quizzes.filter((q) => {
    const matchesCategory =
      selectedCategory === 'Todos' ||
      (selectedCategory === 'Personalizados' ? q.isCustom : q.category === selectedCategory);
    const matchesSearch =
      q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const currentQ = activeQuiz?.questions[currentQuestionIndex];

  // Helper to check if a class has taken this quiz
  const getSessionsForQuiz = (quizId: string) => {
    return quizSessions.filter((s) => s.quizId === quizId);
  };

  const isClassAlreadyCompleted = (quizId: string, className: string) => {
    if (!className.trim()) return null;
    return quizSessions.find(
      (s) => s.quizId === quizId && s.className.toLowerCase() === className.trim().toLowerCase()
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div
              className="p-2 rounded-xl text-black shadow-lg"
              style={{ backgroundColor: accentColor }}
            >
              <HelpCircle size={20} />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span>Brazilian Quiz</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            type="button"
            onClick={() => setIsHistoryOpen(true)}
            className="flex-1 md:flex-initial px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-white/10"
          >
            <Clock size={15} className="text-amber-400" />
            <span>Turmas ({quizSessions.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setIsGeneratorOpen(true)}
            className="flex-1 md:flex-initial px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-purple-900/30 cursor-pointer"
          >
            <Sparkles size={15} />
            <span>Criar Quiz</span>
          </button>
        </div>
      </div>

      {/* QUIZ ACTIVE RUNNER OR COMPACT CATALOG */}
      {activeQuiz ? (
        <div className={`relative ${isClassroomMode ? 'fixed inset-0 z-[4000] bg-neutral-950 p-4 sm:p-8 overflow-y-auto flex flex-col justify-between' : ''}`}>
          {/* TOP CONTROL BAR IN ACTIVE QUIZ */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6 bg-neutral-900/90 border border-white/10 p-3 sm:p-4 rounded-2xl backdrop-blur-md">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveQuiz(null)}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-white/70 hover:text-white text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5"
              >
                <ChevronLeft size={16} />
                <span>Catálogo</span>
              </button>

              <div className="hidden sm:block h-4 w-[1px] bg-white/15" />

              <div>
                <h3 className="text-sm font-extrabold text-white leading-tight">{activeQuiz.title}</h3>
                <span className="text-[10px] font-mono text-amber-300">{activeQuiz.level} • {activeQuiz.questions.length} Questões</span>
              </div>
            </div>

            {/* CLASS/TURMA SELECTION & SCORE */}
            <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
              <div className="flex items-center gap-1.5 bg-black/60 border border-white/15 rounded-xl px-2.5 py-1">
                <span className="text-[10px] font-mono text-white/50 uppercase">Turma:</span>
                <input
                  type="text"
                  value={activeClassName}
                  onChange={(e) => setActiveClassName(e.target.value)}
                  placeholder="Ex: Turma A - Noite"
                  className="bg-transparent text-xs font-bold text-amber-300 focus:outline-none w-32 placeholder-white/30"
                />
              </div>

              {/* Existing Class Check Warning */}
              {isClassAlreadyCompleted(activeQuiz.id, activeClassName) && (
                <div className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-1 rounded-lg font-mono flex items-center gap-1">
                  <span>Já feito por esta turma</span>
                </div>
              )}

              {/* Score Badge */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold shrink-0">
                <Trophy size={14} className="text-amber-400" />
                <span>{score}/{activeQuiz.questions.length}</span>
              </div>

              {/* Classroom Fullscreen Mode */}
              <button
                type="button"
                onClick={() => setIsClassroomMode(!isClassroomMode)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border shrink-0 ${
                  isClassroomMode
                    ? 'bg-blue-600 text-white border-blue-400'
                    : 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border-blue-500/30'
                }`}
                title="Modo Apresentação para Aula em Tela Cheia"
              >
                {isClassroomMode ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                <span className="hidden md:inline">
                  {isClassroomMode ? 'Sair' : 'Tela Cheia'}
                </span>
              </button>
            </div>
          </div>

          {/* QUESTION CARD */}
          {!isCompleted && currentQ ? (
            <div className="max-w-4xl mx-auto w-full bg-neutral-900/90 border border-white/15 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                <span className="text-xs font-extrabold uppercase tracking-widest text-white/40 font-mono">
                  Pergunta {currentQuestionIndex + 1} de {activeQuiz.questions.length}
                </span>

                <button
                  type="button"
                  onClick={() => handleSpeakText(currentQ.question)}
                  className="p-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                  title="Ouvir Pergunta em Inglês"
                >
                  <Volume2 size={14} />
                  <span>Ouvir Inglês</span>
                </button>
              </div>

              <h2 className="text-lg sm:text-xl md:text-2xl font-extrabold text-white leading-snug mb-6">
                {currentQ.question}
              </h2>

              {/* OPTIONS GRID */}
              <div className="grid grid-cols-1 gap-3 mb-6">
                {currentQ.options.map((option, idx) => {
                  const isSelected = selectedAnswer === idx;
                  const isCorrect = idx === currentQ.correctAnswer;

                  let buttonStyle = 'bg-black/50 border-white/15 text-white/90 hover:border-amber-400/50 hover:bg-white/5';
                  if (isAnswerSubmitted) {
                    if (isCorrect) {
                      buttonStyle = 'bg-emerald-600/30 border-emerald-500 text-emerald-200 font-bold';
                    } else if (isSelected && !isCorrect) {
                      buttonStyle = 'bg-red-600/30 border-red-500 text-red-200 font-bold';
                    } else {
                      buttonStyle = 'bg-black/30 border-white/5 text-white/40 opacity-50';
                    }
                  } else if (isSelected) {
                    buttonStyle = 'bg-amber-500/20 border-amber-400 text-amber-200 font-bold shadow-lg shadow-amber-500/10';
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={isAnswerSubmitted}
                      onClick={() => handleSelectOption(idx)}
                      className={`w-full p-3.5 sm:p-4 rounded-2xl border text-left text-sm font-medium transition-all flex items-center justify-between gap-4 cursor-pointer ${buttonStyle}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center font-mono text-xs font-bold shrink-0">
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span>{option}</span>
                      </div>

                      {isAnswerSubmitted && isCorrect && (
                        <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                      )}
                      {isAnswerSubmitted && isSelected && !isCorrect && (
                        <XCircle size={18} className="text-red-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* EXPLANATION */}
              <AnimatePresence>
                {isAnswerSubmitted && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`p-4 rounded-2xl border mb-6 ${
                      selectedAnswer === currentQ.correctAnswer
                        ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                        : 'bg-red-950/60 border-red-500/40 text-red-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1 font-bold text-xs">
                      {selectedAnswer === currentQ.correctAnswer ? (
                        <>
                          <CheckCircle2 size={16} className="text-emerald-400" />
                          <span>Excelente! Resposta Correta!</span>
                        </>
                      ) : (
                        <>
                          <XCircle size={16} className="text-red-400" />
                          <span>Atenção! Resposta Incorreta</span>
                        </>
                      )}
                    </div>
                    <p className="text-xs font-sans leading-relaxed text-white/90">
                      <strong>Explicação Didática:</strong> {currentQ.explanation}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ACTION FOOTER */}
              <div className="flex items-center justify-between gap-4 pt-3 border-t border-white/10">
                {!isAnswerSubmitted ? (
                  <button
                    type="button"
                    disabled={selectedAnswer === null}
                    onClick={handleConfirmAnswer}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider transition-all shadow-lg disabled:opacity-30 disabled:pointer-events-none cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>Confirmar Resposta</span>
                    <ChevronRight size={16} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleNextQuestion}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider transition-all shadow-lg cursor-pointer flex items-center justify-center gap-1.5 ml-auto"
                  >
                    <span>
                      {currentQuestionIndex < activeQuiz.questions.length - 1
                        ? 'Próxima Pergunta'
                        : 'Ver Resultado Final'}
                    </span>
                    <ChevronRight size={16} />
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* COMPLETION SCREEN */
            <div className="max-w-2xl mx-auto w-full bg-neutral-900/90 border border-white/15 rounded-3xl p-6 sm:p-10 text-center backdrop-blur-xl shadow-2xl">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-black shadow-xl">
                <Trophy size={32} />
              </div>

              <h2 className="text-2xl font-black text-white mb-1">
                Quiz Concluído!
              </h2>
              <p className="text-xs text-white/60 mb-6">
                Sessão registrada para a turma: <strong className="text-amber-300">{activeClassName.trim() || 'Geral'}</strong>
              </p>

              <div className="p-5 rounded-2xl bg-black/50 border border-white/10 max-w-xs mx-auto mb-6">
                <div className="text-3xl font-black text-amber-400 font-mono mb-1">
                  {score} / {activeQuiz.questions.length}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-white/50">
                  {Math.round((score / activeQuiz.questions.length) * 100)}% de Desempenho
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleRestartQuiz}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <RotateCcw size={15} />
                  <span>Refazer Quiz</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveQuiz(null)}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-lg"
                >
                  <BookOpen size={15} />
                  <span>Voltar ao Catálogo</span>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* COMPACT & SPACE-EFFICIENT CATALOG GRID */
        <div className="space-y-4">
          {/* SEARCH & CATEGORY FILTER TABS BAR */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-neutral-900/80 border border-white/10 p-3 rounded-2xl backdrop-blur-md">
            {/* CATEGORY TABS */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
              {categoriesList.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-amber-500 text-neutral-950 shadow'
                      : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* SEARCH INPUT */}
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar quiz por nome..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-black/50 border border-white/15 text-xs text-white placeholder-white/30 focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* COMPACT QUIZZES GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {filteredQuizzes.map((quiz) => {
              const completedSessions = getSessionsForQuiz(quiz.id);

              return (
                <div
                  key={quiz.id}
                  onClick={() => handleStartQuiz(quiz)}
                  className="group bg-neutral-900/80 hover:bg-neutral-900 border border-white/10 hover:border-amber-500/50 p-4 rounded-2xl transition-all cursor-pointer flex flex-col justify-between backdrop-blur-md shadow-lg hover:shadow-xl relative"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20">
                        {quiz.category}
                      </span>

                      {quiz.isCustom && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteQuiz(quiz.id, e)}
                          className="p-1 rounded text-white/30 hover:text-red-400 hover:bg-white/10 transition-all"
                          title="Excluir Quiz"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>

                    <h4 className="text-sm font-black text-white group-hover:text-amber-300 transition-colors line-clamp-2 mb-1.5">
                      {quiz.title}
                    </h4>

                    <div className="flex items-center gap-2 text-[11px] text-white/50 font-mono mb-3">
                      <span>{quiz.questions.length} questões</span>
                      <span>•</span>
                      <span>{quiz.level}</span>
                    </div>

                    {/* CLASS HISTORY BADGES */}
                    {completedSessions.length > 0 && (
                      <div className="mb-3 pt-2 border-t border-white/5 flex flex-wrap items-center gap-1">
                        <span className="text-[9px] font-mono text-white/40">Turmas:</span>
                        {completedSessions.slice(0, 2).map((s) => (
                          <span
                            key={s.id}
                            className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            title={`Concluído por ${s.className} em ${s.date} (${s.score}/${s.total})`}
                          >
                            {s.className}
                          </span>
                        ))}
                        {completedSessions.length > 2 && (
                          <span className="text-[9px] font-mono text-white/40">
                            +{completedSessions.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs font-bold text-amber-400 group-hover:text-amber-300">
                    <span className="flex items-center gap-1">
                      <Play size={12} className="fill-current" />
                      <span>Iniciar</span>
                    </span>
                    <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL: CLASS & TURMA SESSIONS HISTORY */}
      <AnimatePresence>
        {isHistoryOpen && (
          <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-neutral-900 border border-white/15 rounded-3xl p-6 shadow-2xl relative max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-2">
                  <Clock size={20} className="text-amber-400" />
                  <h3 className="text-base font-extrabold text-white">Histórico de Quizzes por Turma</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsHistoryOpen(false)}
                  className="p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                >
                  <XCircle size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-4 space-y-2.5 scrollbar-thin">
                {quizSessions.length === 0 ? (
                  <div className="text-center py-10 text-white/40 text-xs font-mono">
                    Nenhum quiz foi realizado por turmas ainda.
                  </div>
                ) : (
                  quizSessions.map((sess) => {
                    const quizInfo = quizzes.find((q) => q.id === sess.quizId);
                    return (
                      <div
                        key={sess.id}
                        className="bg-black/50 border border-white/10 p-3.5 rounded-2xl flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-extrabold text-amber-300 px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/30">
                              {sess.className}
                            </span>
                            <span className="text-[10px] font-mono text-white/40">{sess.date}</span>
                          </div>
                          <div className="text-xs font-bold text-white">
                            {quizInfo?.title || 'Quiz Personalizado'}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-sm font-mono font-bold text-emerald-400">
                            {sess.score}/{sess.total} acertos
                          </span>
                          <div className="text-[10px] text-white/40">
                            {Math.round((sess.score / sess.total) * 100)}%
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setIsHistoryOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: AI QUIZ CREATOR */}
      <AnimatePresence>
        {isGeneratorOpen && (
          <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-neutral-900 border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl relative"
            >
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Sparkles size={20} className="text-purple-400" />
                  <h3 className="text-lg font-bold text-white">Criar Quiz Personalizado</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsGeneratorOpen(false)}
                  className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                >
                  <XCircle size={18} />
                </button>
              </div>

              {generateError && (
                <div className="p-3.5 mb-4 rounded-xl bg-red-950/80 border border-red-500/40 text-red-200 text-xs font-sans">
                  {generateError}
                </div>
              )}

              <form onSubmit={handleGenerateAiQuiz} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-white/70 mb-1.5">
                    Tema do Quiz / Assunto da Aula:
                  </label>
                  <input
                    type="text"
                    required
                    value={promptTopic}
                    onChange={(e) => setPromptTopic(e.target.value)}
                    placeholder="Ex: Falsos Cognatos, Past Continuous, Inglês no Aeroporto..."
                    className="w-full p-3.5 rounded-xl bg-black/60 border border-white/15 text-white placeholder-white/30 text-sm focus:outline-none focus:border-purple-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono text-white/70 mb-1.5">Nível:</label>
                    <select
                      value={promptLevel}
                      onChange={(e) => setPromptLevel(e.target.value)}
                      className="w-full p-3.5 rounded-xl bg-black/60 border border-white/15 text-white text-sm focus:outline-none focus:border-purple-400"
                    >
                      <option value="Iniciante">Iniciante (A1-A2)</option>
                      <option value="Intermediário">Intermediário (B1-B2)</option>
                      <option value="Avançado">Avançado (C1-C2)</option>
                      <option value="Todos os Níveis">Todos os Níveis</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-white/70 mb-1.5">Perguntas:</label>
                    <select
                      value={promptNumQuestions}
                      onChange={(e) => setPromptNumQuestions(Number(e.target.value))}
                      className="w-full p-3.5 rounded-xl bg-black/60 border border-white/15 text-white text-sm focus:outline-none focus:border-purple-400"
                    >
                      <option value={3}>3 Perguntas (Rápido)</option>
                      <option value={5}>5 Perguntas (Padrão)</option>
                      <option value={10}>10 Perguntas (Completo)</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsGeneratorOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-bold"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={isGenerating || !promptTopic.trim()}
                    className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg shadow-purple-900/40 disabled:opacity-50 cursor-pointer"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Gerando Quiz...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} />
                        <span>Gerar Quiz Agora</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
