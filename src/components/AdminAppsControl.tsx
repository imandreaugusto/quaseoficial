import React, { useState } from 'react';
import {
  MessageSquare,
  Instagram,
  Globe,
  BookOpen,
  PenTool,
  HelpCircle,
  GitCompare,
  Mic,
  Languages,
  Music,
  Tv,
  LayoutDashboard,
  Settings,
  Video,
  Users,
  ShieldCheck,
  Eye,
  Power,
  ArrowUp,
  ArrowDown,
  RotateCcw,
} from 'lucide-react';
import { GlobalAppConfig, AppDefinition } from '../types';

// TODOS OS 10 MÓDULOS DO ALUNO TOTALMENTE CONTROLADOS PELO CEO
export const ALL_STUDENT_APPS: AppDefinition[] = [
  { id: 'friends', label: 'Brazilian Friends', desc: 'Messenger e chat estilo MSN para prática de conversação com alunos, salas e IA', category: 'Conversação & Chat', targetRole: 'both' },
  { id: 'stories', label: 'Brazilian Post', desc: 'Gravação de stories com teleprompter inteligente e mural de destaques no Instagram', category: 'Prática & Mídia', targetRole: 'both' },
  { id: 'practice', label: 'Brazilian Practice', desc: 'Ambientes ao vivo de conversação, pronúncia guiada e imersão livre', category: 'Conversação Ao Vivo', targetRole: 'both' },
  { id: 'readclub', label: 'Read Club', desc: 'Biblioteca de leitura com contos graduados, áudio nativo e vocabulário inteligente', category: 'Leitura & Compreensão', targetRole: 'both' },
  { id: 'board', label: 'Brazilian Board', desc: 'Lousa interativa de anotações gramaticais, estruturas e frases-chave', category: 'Gramática & Estrutura', targetRole: 'both' },
  { id: 'quiz', label: 'Brazilian Quiz', desc: 'Desafios dinâmicos, simulados de fixação e ranqueamento de alunos', category: 'Avaliação & Jogos', targetRole: 'both' },
  { id: 'biacompare', label: 'BIA Compare', desc: 'Comparador de frases em tempo real para destravar vícios de tradução', category: 'Comparação & Precisão', targetRole: 'both' },
  { id: 'conversation', label: 'Brazilian Conversation', desc: 'Simulações de diálogo e roleplay com a assistente BIA', category: 'Conversação IA', targetRole: 'both' },
  { id: 'tradutor', label: 'Brazilian Tradutor', desc: 'Tradutor com notas culturais, gírias e contextualização de pronúncia', category: 'Vocabulário & Tradução', targetRole: 'both' },
  { id: 'youtube', label: 'Brazilian Music', desc: 'Músicas e vídeos educativos com letras interativas e vocabulário sincronizado', category: 'Música & Vocabulário', targetRole: 'both' }
];

interface AdminAppsControlProps {
  appConfig: GlobalAppConfig;
  onSaveConfig: (newConfig: GlobalAppConfig) => void;
  onLaunchApp: (appId: string) => void;
  onToggleStudentPreview: () => void;
  isStudentPreview: boolean;
}

export const AdminAppsControl: React.FC<AdminAppsControlProps> = ({
  appConfig,
  onSaveConfig,
  onLaunchApp,
  onToggleStudentPreview,
  isStudentPreview
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Ativar / Desativar App para todos os alunos instantaneamente
  const handleToggleApp = (appId: string) => {
    const isEnabled = appConfig.studentGlobalEnabled[appId] !== false;
    const updated = {
      ...appConfig,
      studentGlobalEnabled: {
        ...appConfig.studentGlobalEnabled,
        [appId]: !isEnabled
      }
    };
    onSaveConfig(updated);
  };

  // Mover Ordem do Menu
  const handleMoveOrder = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...appConfig.studentAppOrder];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;

    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;

    onSaveConfig({
      ...appConfig,
      studentAppOrder: newOrder
    });
  };

  return (
    <div className="w-full bg-neutral-950 border border-white/10 rounded-3xl p-6 shadow-2xl">
      {/* HEADER DO PAINEL DO CEO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-amber-400" size={20} />
            <h2 className="text-lg font-bold text-white tracking-tight">
              Central de Aplicativos & Controle Geral do Aluno
            </h2>
          </div>
          <p className="text-xs text-white/50 mt-1">
            Gerencie o que os alunos podem acessar, a ordem dos menus e teste a visão do estudante.
          </p>
        </div>

        {/* BOTÃO MODO VISÃO DO ALUNO */}
        <button
          type="button"
          onClick={onToggleStudentPreview}
          className={`px-4 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
            isStudentPreview
              ? 'bg-amber-500 text-neutral-950 border-amber-400 shadow-lg shadow-amber-500/20'
              : 'bg-white/5 text-white/80 border-white/15 hover:bg-white/10'
          }`}
        >
          <Eye size={15} />
          <span>{isStudentPreview ? 'Sair do Modo Aluno' : 'Testar Visão do Aluno'}</span>
        </button>
      </div>

      {/* GRADE DE APLICATIVOS CONTROLADOS PELO CEO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ALL_STUDENT_APPS.map((app, index) => {
          const isEnabled = appConfig.studentGlobalEnabled[app.id] !== false;

          return (
            <div
              key={app.id}
              className={`p-4 rounded-2xl border transition-all ${
                isEnabled
                  ? 'bg-neutral-900/80 border-white/10'
                  : 'bg-neutral-950/60 border-red-500/20 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{app.label}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-white/50 border border-white/10">
                      {app.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-white/60 mt-1 line-clamp-2">{app.desc}</p>
                </div>

                {/* BOTÃO LIGA / DESLIGA GLOBAL DO CEO */}
                <button
                  type="button"
                  onClick={() => handleToggleApp(app.id)}
                  className={`p-2 rounded-xl border text-xs cursor-pointer transition-colors ${
                    isEnabled
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-red-500/20 text-red-400 border-red-500/40'
                  }`}
                  title={isEnabled ? 'Módulo liberado para alunos' : 'Módulo desativado para alunos'}
                >
                  <Power size={15} />
                </button>
              </div>

              {/* BARRA DE AÇÕES RÁPIDAS: ABRIR E REORDENAR */}
              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => onLaunchApp(app.id)}
                  className="text-xs text-amber-400 hover:text-amber-300 font-semibold cursor-pointer flex items-center gap-1"
                >
                  <span>Abrir Módulo</span>
                  <span>→</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleMoveOrder(index, 'up')}
                    disabled={index === 0}
                    className="p-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white/70"
                    title="Subir posição no menu"
                  >
                    <ArrowUp size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveOrder(index, 'down')}
                    disabled={index === ALL_STUDENT_APPS.length - 1}
                    className="p-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white/70"
                    title="Descer posição no menu"
                  >
                    <ArrowDown size={12} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
