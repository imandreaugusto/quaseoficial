import React, { useRef } from 'react';
import { AppSettings } from '../types';
import { Volume2, VolumeX, Eye, EyeOff, Sun, Moon, RotateCcw, Download, Upload, Trash2, Sliders, Smartphone, Layout, HelpCircle } from 'lucide-react';

interface SettingsProps {
  settings: AppSettings;
  onUpdateSettings: (updated: Partial<AppSettings>) => void;
  onExportBackup: () => void;
  onImportBackup: (file: File) => void;
  onResetAll: () => void;
  isStudent?: boolean;
  onResetStudentSettings?: () => void;
}

export const Settings: React.FC<SettingsProps> = ({
  settings,
  onUpdateSettings,
  onExportBackup,
  onImportBackup,
  onResetAll,
  isStudent = false,
  onResetStudentSettings,
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

  if (isStudent) {
    const toggle = (
      title: string,
      description: string,
      key: 'menuSoundsEnabled' | 'notificationSoundsEnabled' | 'dailyMotivationEnabled' | 'bgEnabled' | 'animOn' | 'showNextClass' | 'clock24h'
    ) => (
      <div key={key} className="flex items-center justify-between gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-4">
        <div>
          <span className="block text-xs font-semibold text-white/80">{title}</span>
          <span className="mt-1 block text-[10px] text-white/40">{description}</span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={settings[key]}
          aria-label={title}
          onClick={() => handleToggle(key)}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-all ${settings[key] ? 'bg-amber-500' : 'bg-white/10'}`}
          style={{ backgroundColor: settings[key] ? settings.accentColor : undefined }}
        >
          <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${settings[key] ? 'left-6' : 'left-1'}`} />
        </button>
      </div>
    );

    return (
      <div className="mx-auto max-w-3xl px-4 py-8 pb-32">
        <div className="mb-8 text-center">
          <h2 className="text-xl font-light tracking-widest uppercase" style={{ color: settings.accentColor }}>
            Minhas configurações
          </h2>
          <p className="mt-2 text-xs tracking-wide text-white/50">
            Suas preferências ficam salvas na sua conta e acompanham você em outros dispositivos.
          </p>
        </div>

        <div className="flex flex-col gap-7 rounded-3xl border border-white/20 bg-slate-950/40 p-5 shadow-xl backdrop-blur-2xl sm:p-7">
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/50">
              <Volume2 size={14} /> Sons
            </h3>
            <div className="flex flex-col gap-2">
              {toggle('Sons do menu', 'Ativa ou desativa os sons ao abrir, selecionar ou passar pelos itens do menu.', 'menuSoundsEnabled')}
              {toggle('Sons de notificações', 'Ativa ou desativa o som de novas mensagens.', 'notificationSoundsEnabled')}
              {toggle('Lembretes diários de estudo', 'Receba um convite curto para explorar uma atividade da plataforma.', 'dailyMotivationEnabled')}
            </div>
          </section>

          <section>
            <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/50">
              <Layout size={14} /> Fundo e aparência
            </h3>
            <div className="flex flex-col gap-2">
              {toggle('Imagens de fundo', 'Mostrar ou ocultar o slideshow de cidades.', 'bgEnabled')}
              <label className="flex items-center justify-between gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-4">
                <span>
                  <span className="block text-xs font-semibold text-white/80">Brilho do fundo</span>
                  <span className="mt-1 block text-[10px] text-white/40">Ajuste a intensidade das imagens.</span>
                </span>
                <select
                  value={settings.bgBright}
                  onChange={(event) => handleSelectChange('bgBright', event.target.value as AppSettings['bgBright'])}
                  className="rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-xs text-white"
                >
                  <option value="darker">Mais escuro</option>
                  <option value="normal">Normal</option>
                  <option value="lighter">Mais claro</option>
                </select>
              </label>
              <div className="flex items-center justify-between gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-4">
                <div>
                  <span className="block text-xs font-semibold text-white/80">Cor de destaque</span>
                  <span className="mt-1 block text-[10px] text-white/40">Escolha a cor de botões e detalhes.</span>
                </div>
                <div className="flex gap-2">
                  {colors.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => handleSelectChange('accentColor', color.value)}
                      aria-label={`Usar cor ${color.name}`}
                      aria-pressed={settings.accentColor === color.value}
                      className={`h-7 w-7 rounded-full border border-white/20 transition-transform ${settings.accentColor === color.value ? 'scale-110 ring-2 ring-white/60' : ''}`}
                      style={{ backgroundColor: color.value }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section>
            <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/50">
              <Sliders size={14} /> Leitura e acessibilidade
            </h3>
            <div className="flex flex-col gap-2">
              <label className="flex items-center justify-between gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-4">
                <span>
                  <span className="block text-xs font-semibold text-white/80">Tamanho da fonte de leitura</span>
                  <span className="mt-1 block text-[10px] text-white/40">Ajuste o texto das histórias.</span>
                </span>
                <span className="flex items-center gap-3">
                  <input
                    type="range"
                    min="14"
                    max="36"
                    value={settings.readerFont}
                    onChange={(event) => handleSelectChange('readerFont', Number(event.target.value))}
                    aria-label="Tamanho da fonte de leitura"
                  />
                  <span className="w-12 text-right text-xs font-mono text-white/80">{settings.readerFont}px</span>
                </span>
              </label>
              <label className="flex items-center justify-between gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-4">
                <span>
                  <span className="block text-xs font-semibold text-white/80">Fonte de leitura</span>
                  <span className="mt-1 block text-[10px] text-white/40">Escolha o estilo usado nas histórias.</span>
                </span>
                <select
                  value={settings.readerFontFamily}
                  onChange={(event) => handleSelectChange('readerFontFamily', event.target.value as AppSettings['readerFontFamily'])}
                  className="rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-xs text-white"
                >
                  <option value="poppins">Poppins</option>
                  <option value="lora">Lora</option>
                  <option value="crimson">Crimson Pro</option>
                </select>
              </label>
              <label className="flex items-center justify-between gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-4">
                <span>
                  <span className="block text-xs font-semibold text-white/80">Alinhamento da leitura</span>
                  <span className="mt-1 block text-[10px] text-white/40">Altere a disposição do texto.</span>
                </span>
                <select
                  value={settings.readerAlign}
                  onChange={(event) => handleSelectChange('readerAlign', event.target.value as AppSettings['readerAlign'])}
                  className="rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-xs text-white"
                >
                  <option value="center">Centralizado</option>
                  <option value="justify">Justificado</option>
                </select>
              </label>
              <label className="flex items-center justify-between gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-4">
                <span>
                  <span className="block text-xs font-semibold text-white/80">Espaçamento da interface</span>
                  <span className="mt-1 block text-[10px] text-white/40">Escolha entre mais compacto ou espaçado.</span>
                </span>
                <select
                  value={settings.uiDensity}
                  onChange={(event) => handleSelectChange('uiDensity', event.target.value as AppSettings['uiDensity'])}
                  className="rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-xs text-white"
                >
                  <option value="compact">Compacto</option>
                  <option value="normal">Normal</option>
                  <option value="spacious">Espaçado</option>
                </select>
              </label>
              <label className="flex items-center justify-between gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-4">
                <span>
                  <span className="block text-xs font-semibold text-white/80">Tamanho geral da interface</span>
                  <span className="mt-1 block text-[10px] text-white/40">Aumente o tamanho dos textos e controles.</span>
                </span>
                <select
                  value={settings.uiScale}
                  onChange={(event) => handleSelectChange('uiScale', event.target.value as AppSettings['uiScale'])}
                  className="rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-xs text-white"
                >
                  <option value="sm">Pequeno</option>
                  <option value="md">Médio</option>
                  <option value="lg">Grande</option>
                </select>
              </label>
              {toggle('Animações', 'Desative os movimentos entre as telas.', 'animOn')}
            </div>
          </section>

          <section>
            <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/50">
              <Smartphone size={14} /> Preferências pessoais
            </h3>
            <div className="flex flex-col gap-2">
              {toggle('Mostrar próxima aula na Home', 'Exibe o destaque da próxima aula na página inicial.', 'showNextClass')}
              {toggle('Relógio de 24 horas', 'Usa o formato 24h nos horários.', 'clock24h')}
            </div>
          </section>

          <button
            type="button"
            onClick={onResetStudentSettings}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm text-white/75 transition-colors hover:bg-white/10 hover:text-white"
          >
            <RotateCcw size={15} /> Restaurar configurações padrão
          </button>
        </div>
      </div>
    );
  }

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

      <div className="flex flex-col gap-8 rounded-3xl border border-white/25 bg-slate-950/35 p-5 shadow-[0_8px_40px_rgba(0,0,0,0.25)] backdrop-blur-2xl sm:p-7">
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
          <p className="mb-3 rounded-xl border border-amber-300/15 bg-amber-300/5 p-3 text-xs leading-relaxed text-amber-100/80">
            O backup JSON inclui aulas, despesas, configurações e dados do Read Club. Baixe-o regularmente e guarde-o em local privado, como um Drive protegido. Ele não substitui uma cópia completa do banco Supabase e pode conter informações pessoais de alunos. Restaurar um backup substitui os dados correspondentes.
          </p>
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
