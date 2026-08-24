import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Video,
  Plus,
  Link as LinkIcon,
  Copy,
  ExternalLink,
  Check,
  Settings as SettingsIcon,
  Shield,
  Globe,
  Lock,
  RefreshCw,
  LogOut,
  Sparkles,
  Share2,
  Calendar,
  Search,
  AlertCircle,
  Clock,
  Radio,
  Users
} from 'lucide-react';
import { User } from 'firebase/auth';
import { initAuth, googleSignIn, getAccessToken, logout } from '../lib/classroomAuth';

interface MeetSpace {
  name: string; // e.g. "spaces/123456" or "spaces/abc-defg-hij"
  meetingUri: string; // "https://meet.google.com/abc-defg-hij"
  meetingCode: string; // "abc-defg-hij"
  config?: {
    accessType?: 'ACCESS_TYPE_UNSPECIFIED' | 'OPEN' | 'TRUSTED' | 'RESTRICTED';
    entryPointAccess?: 'ENTRY_POINT_ACCESS_UNSPECIFIED' | 'ALL' | 'MORE_TARGETED';
  };
  createdAt?: string;
  topic?: string;
}

interface GoogleMeetProps {
  accentColor: string;
}

export const GoogleMeet: React.FC<GoogleMeetProps> = ({ accentColor }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Meet Spaces state
  const [spaces, setSpaces] = useState<MeetSpace[]>(() => {
    const defaultSpace: MeetSpace = {
      name: 'spaces/son-qbiu-obq',
      meetingUri: 'https://meet.google.com/son-qbiu-obq',
      meetingCode: 'son-qbiu-obq',
      topic: 'Sua Sala Principal do Google Meet',
      createdAt: new Date().toISOString(),
      config: { accessType: 'OPEN' }
    };
    try {
      const saved = localStorage.getItem('bia_google_meet_spaces');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const hasMainRoom = parsed.some((s: MeetSpace) => s.meetingCode === 'son-qbiu-obq');
          if (!hasMainRoom) return [defaultSpace, ...parsed];
          return parsed;
        }
      }
      return [defaultSpace];
    } catch (e) {
      return [defaultSpace];
    }
  });

  const [isCreatingSpace, setIsCreatingSpace] = useState(false);
  const [newTopic, setNewTopic] = useState('');
  const [selectedAccessType, setSelectedAccessType] = useState<'OPEN' | 'TRUSTED' | 'RESTRICTED'>('TRUSTED');
  
  // Active Space detail modal / view
  const [selectedSpace, setSelectedSpace] = useState<MeetSpace | null>(null);
  const [isLoadingSpaceDetails, setIsLoadingSpaceDetails] = useState(false);
  
  // UI helpers
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Confirm dialog state for settings update
  const [confirmUpdateConfig, setConfirmUpdateConfig] = useState<{
    space: MeetSpace;
    newAccessType: 'OPEN' | 'TRUSTED' | 'RESTRICTED';
  } | null>(null);

  // Auth Initialization
  useEffect(() => {
    const unsubscribe = initAuth(
      (u, token) => {
        setUser(u);
        setAccessToken(token);
        setNeedsAuth(false);
      },
      () => {
        setUser(null);
        setAccessToken(null);
        setNeedsAuth(true);
      }
    );
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Save spaces to localStorage
  useEffect(() => {
    localStorage.setItem('bia_google_meet_spaces', JSON.stringify(spaces));
  }, [spaces]);

  // Login handler
  const handleLogin = async () => {
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
        setNeedsAuth(false);
      }
    } catch (err: any) {
      console.error('Google Meet sign in error:', err);
      setAuthError(err.message || 'Erro ao realizar login com o Google.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setAccessToken(null);
    setNeedsAuth(true);
  };

  // Create Google Meet Space
  const handleCreateSpace = async () => {
    const token = accessToken || (await getAccessToken());
    if (!token) {
      setNeedsAuth(true);
      return;
    }

    setIsCreatingSpace(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('https://meet.googleapis.com/v2/spaces', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          config: {
            accessType: selectedAccessType
          }
        })
      });

      if (!res.ok) {
        if (res.status === 401) {
          setNeedsAuth(true);
          throw new Error('Sua sessão do Google expirou. Faça login novamente.');
        }
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || `Erro ao criar sala no Google Meet (${res.status})`);
      }

      const data = await res.json();
      const createdSpace: MeetSpace = {
        name: data.name || `spaces/${Date.now()}`,
        meetingUri: data.meetingUri || `https://meet.google.com/${data.meetingCode}`,
        meetingCode: data.meetingCode || '',
        config: data.config || { accessType: selectedAccessType },
        createdAt: new Date().toISOString(),
        topic: newTopic.trim() || 'Aula de Inglês / Conversação'
      };

      setSpaces((prev) => [createdSpace, ...prev]);
      setNewTopic('');
      setSuccessMsg(`Sala do Google Meet criada com sucesso! Código: ${createdSpace.meetingCode}`);
    } catch (err: any) {
      console.error('Create Meet space error:', err);
      setErrorMsg(err.message || 'Falha ao criar sala no Google Meet.');
    } finally {
      setIsCreatingSpace(false);
    }
  };

  // Fetch / Refresh Space details
  const fetchSpaceDetails = async (space: MeetSpace) => {
    const token = accessToken || (await getAccessToken());
    if (!token) {
      setNeedsAuth(true);
      return;
    }

    setIsLoadingSpaceDetails(true);
    setErrorMsg(null);

    try {
      // Space name is in format 'spaces/{spaceId}'
      const spaceIdentifier = space.name || `spaces/${space.meetingCode}`;
      const res = await fetch(`https://meet.googleapis.com/v2/${spaceIdentifier}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        if (res.status === 401) {
          setNeedsAuth(true);
          throw new Error('Sessão expirada. Faça login novamente.');
        }
        throw new Error(`Não foi possível obter detalhes da sala (${res.status})`);
      }

      const updatedData = await res.json();
      const refreshedSpace: MeetSpace = {
        ...space,
        meetingUri: updatedData.meetingUri || space.meetingUri,
        meetingCode: updatedData.meetingCode || space.meetingCode,
        config: updatedData.config || space.config
      };

      setSpaces((prev) => prev.map((s) => (s.name === refreshedSpace.name ? refreshedSpace : s)));
      setSelectedSpace(refreshedSpace);
      setSuccessMsg('Informações da sala atualizadas com sucesso.');
    } catch (err: any) {
      console.error('Fetch space details error:', err);
      setErrorMsg(err.message || 'Erro ao carregar detalhes da sala.');
    } finally {
      setIsLoadingSpaceDetails(false);
    }
  };

  // Execute Space Config update after user confirmation
  const handleExecuteUpdateConfig = async () => {
    if (!confirmUpdateConfig) return;
    const { space, newAccessType } = confirmUpdateConfig;
    const token = accessToken || (await getAccessToken());
    if (!token) {
      setNeedsAuth(true);
      return;
    }

    setConfirmUpdateConfig(null);
    setErrorMsg(null);

    try {
      const spaceIdentifier = space.name || `spaces/${space.meetingCode}`;
      const res = await fetch(`https://meet.googleapis.com/v2/${spaceIdentifier}?updateMask=config.accessType`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          config: {
            accessType: newAccessType
          }
        })
      });

      if (!res.ok) {
        throw new Error(`Falha ao atualizar permissões da sala (${res.status})`);
      }

      const updatedData = await res.json();
      const updatedSpace: MeetSpace = {
        ...space,
        config: updatedData.config || { accessType: newAccessType }
      };

      setSpaces((prev) => prev.map((s) => (s.name === space.name ? updatedSpace : s)));
      if (selectedSpace && selectedSpace.name === space.name) {
        setSelectedSpace(updatedSpace);
      }
      setSuccessMsg(`Acesso da sala alterado para ${newAccessType}.`);
    } catch (err: any) {
      console.error('Update space config error:', err);
      setErrorMsg(err.message || 'Falha ao alterar configurações da sala.');
    }
  };

  // Copy meeting link or code
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  // Filtered list
  const filteredSpaces = spaces.filter(
    (s) =>
      s.topic?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.meetingCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.meetingUri.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (needsAuth) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-8 rounded-3xl bg-neutral-900/80 border border-white/10 text-center shadow-2xl backdrop-blur-xl"
        >
          <div
            className="w-16 h-16 mx-auto mb-6 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
          >
            <Video size={36} />
          </div>

          <h2 className="text-2xl font-bold text-white mb-3">Google Meet Integrado</h2>
          <p className="text-white/60 max-w-lg mx-auto mb-8 text-sm leading-relaxed">
            Conecte sua conta do Google para criar salas de videoconferência ao vivo no Google Meet, agendar aulas com alunos e compartilhar links de reuniões com um clique.
          </p>

          {authError && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center justify-center gap-2">
              <AlertCircle size={16} />
              <span>{authError}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="gsi-material-button inline-flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl font-medium transition-all transform active:scale-98 cursor-pointer shadow-xl hover:shadow-2xl"
            >
              <div className="gsi-material-button-state" />
              <div className="gsi-material-button-content-wrapper flex items-center gap-3">
                <div className="gsi-material-button-icon">
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5 block">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                    <path fill="none" d="M0 0h48v48H0z" />
                  </svg>
                </div>
                <span className="gsi-material-button-contents text-neutral-800 font-semibold text-sm">
                  {isLoggingIn ? 'Conectando ao Google...' : 'Entrar com o Google'}
                </span>
              </div>
            </button>

            <a
              href="https://meet.google.com/son-qbiu-obq"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-sm bg-emerald-500 hover:bg-emerald-400 text-black transition-all shadow-xl hover:shadow-2xl cursor-pointer"
            >
              <Video size={18} />
              <span>Abrir Sala Principal no Meet</span>
              <ExternalLink size={14} />
            </a>
          </div>

          <p className="mt-6 text-xs text-white/40">
            Utilizamos as permissões oficiais do Google Meet para criar e gerenciar reuniões com segurança.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Top Bar Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-neutral-900/80 border border-white/10 backdrop-blur-xl shadow-xl">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
          >
            <Video size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              Google Meet - Reuniões ao Vivo
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Conectado
              </span>
            </h1>
            <p className="text-xs text-white/60">
              Conectado como <span className="text-white font-medium">{user?.email}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleLogout}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-xs font-medium transition-all flex items-center gap-2 cursor-pointer"
          >
            <LogOut size={14} />
            Sair
          </button>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2">
            <AlertCircle size={18} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-xs hover:underline text-rose-400">
            Fechar
          </button>
        </motion.div>
      )}

      {successMsg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2">
            <Check size={18} className="shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-xs hover:underline text-emerald-400">
            Ok
          </button>
        </motion.div>
      )}

      {/* Create New Space Panel */}
      <div className="p-6 rounded-3xl bg-neutral-900/60 border border-white/10 backdrop-blur-xl">
        <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
          <Sparkles size={18} style={{ color: accentColor }} />
          Criar Nova Sala no Google Meet
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-white/70 mb-1.5">Título / Assunto da Aula ou Reunião</label>
            <input
              type="text"
              placeholder="Ex: Conversação de Inglês - Nível Intermediário"
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-white/30 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-white/70 mb-1.5">Nível de Acesso da Sala</label>
            <select
              value={selectedAccessType}
              onChange={(e: any) => setSelectedAccessType(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-white/30 transition-all cursor-pointer"
            >
              <option value="TRUSTED">Restrito à Organização / Convite (TRUSTED)</option>
              <option value="OPEN">Aberto para Qualquer Pessoa com Link (OPEN)</option>
              <option value="RESTRICTED">Totalmente Fechado (RESTRICTED)</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleCreateSpace}
            disabled={isCreatingSpace}
            className="px-6 py-2.5 rounded-xl font-semibold text-sm text-black flex items-center gap-2 transition-all cursor-pointer hover:brightness-110 active:scale-98 shadow-lg"
            style={{ backgroundColor: accentColor }}
          >
            {isCreatingSpace ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Criando Sala...
              </>
            ) : (
              <>
                <Plus size={16} />
                Gerar Sala do Google Meet
              </>
            )}
          </button>
        </div>
      </div>

      {/* Search and List Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          Suas Salas Ativas do Meet ({filteredSpaces.length})
        </h2>

        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Buscar reunião ou código..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-neutral-900/80 border border-white/10 text-white placeholder-white/30 text-xs focus:outline-none focus:border-white/20 transition-all"
          />
        </div>
      </div>

      {/* Spaces List */}
      {filteredSpaces.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-neutral-900/40 border border-white/5">
          <Video size={40} className="mx-auto mb-3 text-white/20" />
          <p className="text-white/60 font-medium text-sm">Nenhuma sala de reunião criada ainda.</p>
          <p className="text-white/40 text-xs mt-1">
            Clique no botão acima para gerar sua primeira sala de videoconferência do Google Meet!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSpaces.map((space, idx) => {
            const isCopied = copiedCode === space.meetingCode || copiedCode === space.meetingUri;
            return (
              <motion.div
                key={space.name || idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 rounded-2xl bg-neutral-900/80 border border-white/10 flex flex-col justify-between space-y-4 hover:border-white/20 transition-all group backdrop-blur-md shadow-lg"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold flex items-center gap-1.5">
                      <Radio size={12} className="animate-pulse" />
                      Google Meet
                    </span>

                    <button
                      type="button"
                      onClick={() => fetchSpaceDetails(space)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all cursor-pointer"
                      title="Atualizar detalhes da sala"
                    >
                      <RefreshCw size={13} />
                    </button>
                  </div>

                  <h3 className="font-semibold text-white text-base leading-snug line-clamp-2">
                    {space.topic || 'Aula / Reunião do Google Meet'}
                  </h3>

                  <div className="mt-3 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs text-white/60">
                      <span className="font-mono bg-black/40 px-2 py-0.5 rounded text-white/90 border border-white/10">
                        {space.meetingCode}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(space.meetingCode, space.meetingCode)}
                        className="text-white/40 hover:text-white transition-all cursor-pointer"
                        title="Copiar código"
                      >
                        {copiedCode === space.meetingCode ? <Check size={14} className="text-emerald-400" /> : <Copy size={13} />}
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-white/40">
                      <Shield size={12} />
                      <span>Acesso: {space.config?.accessType || 'TRUSTED'}</span>
                    </div>

                    {space.createdAt && (
                      <div className="flex items-center gap-1.5 text-[11px] text-white/40">
                        <Clock size={12} />
                        <span>Criado em {new Date(space.createdAt).toLocaleDateString('pt-BR')}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-white/5 flex items-center gap-2">
                  <a
                    href={space.meetingUri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2 px-3 rounded-xl font-semibold text-xs text-black flex items-center justify-center gap-2 transition-all hover:brightness-110 cursor-pointer shadow-md"
                    style={{ backgroundColor: accentColor }}
                  >
                    <Video size={14} />
                    Entrar na Reunião
                    <ExternalLink size={12} />
                  </a>

                  <button
                    type="button"
                    onClick={() => handleCopy(space.meetingUri, space.meetingUri)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all cursor-pointer"
                    title="Copiar Link Completo"
                  >
                    {copiedCode === space.meetingUri ? <Check size={16} className="text-emerald-400" /> : <Share2 size={16} />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const nextType = space.config?.accessType === 'OPEN' ? 'TRUSTED' : 'OPEN';
                      setConfirmUpdateConfig({ space, newAccessType: nextType });
                    }}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all cursor-pointer"
                    title="Mudar Configurações de Acesso"
                  >
                    <SettingsIcon size={16} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Confirmation Dialog for Changing Access Type */}
      <AnimatePresence>
        {confirmUpdateConfig && (
          <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-md w-full p-6 rounded-3xl bg-neutral-900 border border-white/10 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-amber-400">
                <Shield size={24} />
                <h3 className="font-bold text-white text-lg">Confirmar Alteração de Permissões</h3>
              </div>

              <p className="text-sm text-white/70 leading-relaxed">
                Você está prestes a alterar o nível de acesso da sala{' '}
                <strong className="text-white">"{confirmUpdateConfig.space.topic}"</strong> para{' '}
                <strong className="text-emerald-400">{confirmUpdateConfig.newAccessType}</strong>.
              </p>

              <p className="text-xs text-white/50 bg-black/40 p-3 rounded-xl border border-white/5">
                Esta ação atualizará as regras de admissão de participantes no servidor do Google Meet para a reunião (código: {confirmUpdateConfig.space.meetingCode}).
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmUpdateConfig(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleExecuteUpdateConfig}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-all cursor-pointer shadow-lg"
                >
                  Confirmar Alteração
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
