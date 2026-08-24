import React, { useRef } from 'react';
import { AppSettings } from '../types';
import { Volume2, VolumeX, Eye, EyeOff, Sun, Moon, RotateCcw, Download, Upload, Trash2, Sliders, Smartphone, Layout, HelpCircle } from 'lucide-react';

interface SettingsProps {
  settings: AppSettings;
  onUpdateSettings: (updated: Partial<AppSettings>) => void;
  onExportBackup: () => void;
  onImportBackup: (file: File) => void;
  onResetAll: () => void;
}

export const Settings: React.FC<SettingsProps> = ({
  settings,
  onUpdateSettings,
  onExportBackup,
  onImportBackup,
  onResetAll,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const colors = [
    { name: 'Laranja', value: '#ff8c00' },
    { name: 'Azul', value: '#3b82f6' },
    { name: 'Verde', value: '#10b981' },
    { name: 'Vermelho', value: '#e10600' },
    { name: 'Roxo', value: '#a855f7' },
  ];

  const handleToggle = (key: keyof AppSettings) => {
    onUpdateSettings({ [key]: !settings[key] });
  };

  const handleSelectChange = (key: keyof AppSettings, val: any) => {
    onUpdateSettings({ [key]: val });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportBackup(file);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 pb-32">
      <div className="text-center mb-10">
        <h2 className="text-xl font-light tracking-widest text-white/90 uppercase" style={{ color: settings.accentColor }}>
          SETTINGS
        </h2>
        <p className="text-xs text-white/40 mt-2 tracking-wider">
          Personalize seu portal e organize suas aulas de inglês
        </p>
      </div>

      <div className="flex flex-col gap-8">
        {/* Notificações e Áudio */}
        <div>
          <h3 className="text-xs font-bold tracking-widest text-white/40 uppercase mb-3 flex items-center gap-2">
            <Volume2 size={13} />
            <span>Notificações & Áudio</span>
          </h3>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-xl">
              <div>
                <span className="text-xs font-semibold text-white/80 block">Avisos Sonoros</span>
                <span className="text-[10px] text-white/40 mt-1 block">Bipe leve antes de iniciar cada aula</span>
              </div>
              <button
                onClick={() => handleToggle('soundEnabled')}
                className={`w-11 h-6 rounded-full relative transition-all cursor-pointer ${
                  settings.soundEnabled ? 'bg-amber-500' : 'bg-white/10'
                }`}
                style={{ backgroundColor: settings.soundEnabled ? settings.accentColor : undefined }}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${
                    settings.soundEnabled ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-xl">
              <div>
                <span className="text-xs font-semibold text-white/80 block">Aviso Prévio (minutos)</span>
                <span className="text-[10px] text-white/40 mt-1 block">Tempo de antecedência para os alertas</span>
              </div>
              <select
                value={settings.prewarnMin}
                onChange={(e) => handleSelectChange('prewarnMin', parseInt(e.target.value))}
                className="bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-white/30 cursor-pointer"
              >
                <option value="5">5 Minutos</option>
                <option value="10">10 Minutos</option>
                <option value="15">15 Minutos</option>
                <option value="30">30 Minutos</option>
              </select>
            </div>
          </div>
        </div>

        {/* Relógio e Formato */}
        <div>
          <h3 className="text-xs font-bold tracking-widest text-white/40 uppercase mb-3 flex items-center gap-2">
            <Sliders size={13} />
            <span>Formatação de Relógio</span>
          </h3>
          <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-xl">
            <div>
              <span className="text-xs font-semibold text-white/80 block">Formato 24h</span>
              <span className="text-[10px] text-white/40 mt-1 block">Exibir relógio no modo de 24 horas</span>
            </div>
            <button
              onClick={() => handleToggle('clock24h')}
              className={`w-11 h-6 rounded-full relative transition-all cursor-pointer ${
                settings.clock24h ? 'bg-amber-500' : 'bg-white/10'
              }`}
              style={{ backgroundColor: settings.clock24h ? settings.accentColor : undefined }}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${
                  settings.clock24h ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Privatização Financeira e Deletar */}
        <div>
          <h3 className="text-xs font-bold tracking-widest text-white/40 uppercase mb-3 flex items-center gap-2">
            <EyeOff size={13} />
            <span>Segurança & Confirmações</span>
          </h3>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-xl">
              <div>
                <span className="text-xs font-semibold text-white/80 block">Borrar Faturamento Financeiro</span>
                <span className="text-[10px] text-white/40 mt-1 block">Oculta valores previstos de receita até passar o mouse</span>
              </div>
              <button
                onClick={() => handleToggle('blurValues')}
                className={`w-11 h-6 rounded-full relative transition-all cursor-pointer ${
                  settings.blurValues ? 'bg-amber-500' : 'bg-white/10'
                }`}
                style={{ backgroundColor: settings.blurValues ? settings.accentColor : undefined }}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${
                    settings.blurValues ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-xl">
              <div>
                <span className="text-xs font-semibold text-white/80 block">Pedir Confirmação Antes de Excluir</span>
                <span className="text-[10px] text-white/40 mt-1 block">Evita exclusões acidentais de aulas e despesas</span>
              </div>
              <button
                onClick={() => handleToggle('confirmDel')}
                className={`w-11 h-6 rounded-full relative transition-all cursor-pointer ${
                  settings.confirmDel ? 'bg-amber-500' : 'bg-white/10'
                }`}
                style={{ backgroundColor: settings.confirmDel ? settings.accentColor : undefined }}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${
                    settings.confirmDel ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Aparência Visual */}
        <div>
          <h3 className="text-xs font-bold tracking-widest text-white/40 uppercase mb-3 flex items-center gap-2">
            <Layout size={13} />
            <span>Aparência Visual & Fundo</span>
          </h3>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-xl">
              <div>
                <span className="text-xs font-semibold text-white/80 block">Slideshow Fotográfico</span>
                <span className="text-[10px] text-white/40 mt-1 block">Habilita as fotografias de cidades no fundo da tela</span>
              </div>
              <button
                onClick={() => handleToggle('bgEnabled')}
                className={`w-11 h-6 rounded-full relative transition-all cursor-pointer ${
                  settings.bgEnabled ? 'bg-amber-500' : 'bg-white/10'
                }`}
                style={{ backgroundColor: settings.bgEnabled ? settings.accentColor : undefined }}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${
                    settings.bgEnabled ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-xl">
              <div>
                <span className="text-xs font-semibold text-white/80 block">Brilho do Fundo</span>
                <span className="text-[10px] text-white/40 mt-1 block">Mais escuro melhora a legibilidade do texto</span>
              </div>
              <select
                value={settings.bgBright}
                onChange={(e) => handleSelectChange('bgBright', e.target.value as any)}
                className="bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-white/30 cursor-pointer"
              >
                <option value="darker">Mais Escuro</option>
                <option value="normal">Normal</option>
                <option value="lighter">Mais Claro</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-xl">
              <div>
                <span className="text-xs font-semibold text-white/80 block">Cor de Destaque</span>
                <span className="text-[10px] text-white/40 mt-1 block">Selecione o tom dos botões e detalhes ativos</span>
              </div>
              <div className="flex gap-2">
                {colors.map((colorItem) => (
                  <button
                    key={colorItem.value}
                    onClick={() => handleSelectChange('accentColor', colorItem.value)}
                    className={`w-6 h-6 rounded-full border border-black/10 cursor-pointer transition-all ${
                      settings.accentColor === colorItem.value ? 'scale-125 ring-2 ring-white/50' : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: colorItem.value }}
                    title={colorItem.name}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Read Club Premium */}
        <div>
          <h3 className="text-xs font-bold tracking-widest text-white/40 uppercase mb-3 flex items-center gap-2">
            <Sliders size={13} />
            <span>Biblioteca & Read Club</span>
          </h3>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-xl">
              <div>
                <span className="text-xs font-semibold text-white/80 block">Tamanho da Fonte de Leitura</span>
                <span className="text-[10px] text-white/40 mt-1 block">Tamanho padrão do texto do leitor inteligente</span>
              </div>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="14"
                  max="36"
                  value={settings.readerFont}
                  onChange={(e) => handleSelectChange('readerFont', parseInt(e.target.value))}
                  className="w-24 cursor-pointer accent-amber-500"
                />
                <span className="text-xs font-mono font-bold text-amber-400">{settings.readerFont}px</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-xl">
              <div>
                <span className="text-xs font-semibold text-white/80 block">Estilo da Fonte</span>
                <span className="text-[10px] text-white/40 mt-1 block">Tipografia padrão usada nas histórias</span>
              </div>
              <select
                value={settings.readerFontFamily}
                onChange={(e) => handleSelectChange('readerFontFamily', e.target.value as any)}
                className="bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-white/30 cursor-pointer"
              >
                <option value="poppins">Poppins (Moderna/Sans)</option>
                <option value="lora">Lora (Clássica/Serif)</option>
                <option value="crimson">Crimson Pro (Fina/Serif)</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-xl">
              <div>
                <span className="text-xs font-semibold text-white/80 block">Alinhamento das Histórias</span>
                <span className="text-[10px] text-white/40 mt-1 block">Arranjo visual do bloco de leitura</span>
              </div>
              <select
                value={settings.readerAlign}
                onChange={(e) => handleSelectChange('readerAlign', e.target.value as any)}
                className="bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-white/30 cursor-pointer"
              >
                <option value="center">Centralizado</option>
                <option value="justify">Justificado</option>
              </select>
            </div>
          </div>
        </div>

        {/* Densidade e Próxima Aula no Home */}
        <div>
          <h3 className="text-xs font-bold tracking-widest text-white/40 uppercase mb-3 flex items-center gap-2">
            <Layout size={13} />
            <span>Layout & Interfaces</span>
          </h3>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-xl">
              <div>
                <span className="text-xs font-semibold text-white/80 block">Densidade de Informações</span>
                <span className="text-[10px] text-white/40 mt-1 block">Compacto cabe mais itens; espaçado respira melhor</span>
              </div>
              <select
                value={settings.uiDensity}
                onChange={(e) => handleSelectChange('uiDensity', e.target.value as any)}
                className="bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-white/30 cursor-pointer"
              >
                <option value="normal">Normal</option>
                <option value="compact">Compacto</option>
                <option value="spacious">Espaçado</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-xl">
              <div>
                <span className="text-xs font-semibold text-white/80 block">Escala Geral da Interface</span>
                <span className="text-[10px] text-white/40 mt-1 block">Redimensiona o tamanho de todos os textos</span>
              </div>
              <select
                value={settings.uiScale}
                onChange={(e) => handleSelectChange('uiScale', e.target.value as any)}
                className="bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-white/30 cursor-pointer"
              >
                <option value="sm">Pequeno (Compacto)</option>
                <option value="md">Médio (Padrão)</option>
                <option value="lg">Grande (Acessibilidade)</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-xl">
              <div>
                <span className="text-xs font-semibold text-white/80 block">Próxima Aula no Home</span>
                <span className="text-[10px] text-white/40 mt-1 block">Exibe um card de destaque da próxima aula do dia na home</span>
              </div>
              <button
                onClick={() => handleToggle('showNextClass')}
                className={`w-11 h-6 rounded-full relative transition-all cursor-pointer ${
                  settings.showNextClass ? 'bg-amber-500' : 'bg-white/10'
                }`}
                style={{ backgroundColor: settings.showNextClass ? settings.accentColor : undefined }}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${
                    settings.showNextClass ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-xl">
              <div>
                <span className="text-xs font-semibold text-white/80 block">Modo Compacto B LIVE</span>
                <span className="text-[10px] text-white/40 mt-1 block">Oculta textos secundários e reduz a poluição visual do painel de transmissão</span>
              </div>
              <button
                onClick={() => handleToggle('compactStreamOverlay')}
                className={`w-11 h-6 rounded-full relative transition-all cursor-pointer ${
                  settings.compactStreamOverlay ? 'bg-amber-500' : 'bg-white/10'
                }`}
                style={{ backgroundColor: settings.compactStreamOverlay ? settings.accentColor : undefined }}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${
                    settings.compactStreamOverlay ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Gerenciamento de Backups */}
        <div>
          <h3 className="text-xs font-bold tracking-widest text-white/40 uppercase mb-3 flex items-center gap-2">
            <Trash2 size={13} />
            <span>Dados & Backups</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={onExportBackup}
              className="py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer group text-center"
            >
              <Download size={16} className="text-emerald-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-semibold text-white/80">Exportar Dados</span>
              <span className="text-[9px] text-white/30">Baixar backup JSON</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer group text-center"
            >
              <Upload size={16} className="text-amber-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-semibold text-white/80">Importar Dados</span>
              <span className="text-[9px] text-white/30">Restaurar backup JSON</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </button>

            <button
              onClick={onResetAll}
              className="py-3 px-4 rounded-xl bg-red-950/20 hover:bg-red-950/40 border border-red-500/20 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer group text-center"
            >
              <Trash2 size={16} className="text-red-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-semibold text-red-400">Zerar Banco</span>
              <span className="text-[9px] text-red-500/40">Apagar todo o portal</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
