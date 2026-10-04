import React, { useState, useRef, useEffect } from 'react';
import { UserProfile } from '../types';
import { useGatewaySettings } from '../hooks/useGatewaySettings';
import { 
  CEO_EMAIL,
  isValidEmailFormat 
} from '../utils/security';
import { 
  Shield, 
  User, 
  Lock, 
  Mail, 
  AlertCircle, 
  CheckCircle, 
  ArrowRight, 
  Zap, 
  Ticket, 
  Check, 
  X,
  Sparkles,
  Eye,
  EyeOff
} from 'lucide-react';
import { BrazilianLogo } from './BrazilianLogo';
import { SubscriptionInfoModal } from './SubscriptionInfoModal';
import { Clock } from './Clock';
import { fetchCouponFromSupabase, redeemAuthenticatedTrialCoupon, getSupabaseConfig, getSupabaseClient, signInWithGoogle, registerAuthenticatedProfile } from '../utils/supabaseClient';
import { SiteLegalFooter } from './SiteLegalFooter';

// Location is approximate IP-derived data and is only fetched after consent.
const fetchIpGeolocation = async (): Promise<{ country: string; regionName: string; city: string }> => {
  try {
    const geoRes = await fetch('https://ipapi.co/json/').then((res) => res.json());
    if (geoRes && geoRes.country_name) {
      return {
        country: geoRes.country_name,
        regionName: geoRes.region || '',
        city: geoRes.city || ''
      };
    }
  } catch (e) {
    // Keep location empty when the provider is unavailable.
  }
  return { country: '', regionName: '', city: '' };
};

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onAuthSuccess: (userProfile: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess
}) => {
  const [gatewaySettings] = useGatewaySettings();
  const [isSignUp, setIsSignUp] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [locationConsent, setLocationConsent] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponState, setCouponState] = useState<{
    status: 'idle' | 'valid' | 'used' | 'invalid';
    days: number;
    message: string;
  }>({ status: 'idle', days: 2, message: '' });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [, setEggCounter] = useState(0);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const couponCheckRequestRef = useRef(0);
  const couponValidationTimerRef = useRef<number | null>(null);
  const completedAuthUserIdsRef = useRef(new Set<string>());
  const pendingAuthCompletionsRef = useRef(new Map<string, Promise<void>>());
  const completeAuthenticatedSignInRef = useRef<
    (sessionUser: { id: string; email?: string; user_metadata?: Record<string, unknown> }) => Promise<void>
  >(async () => undefined);

  // Easter Egg Tracker: 17 rapid clicks in 3 seconds
  const clickTimestamps = useRef<number[]>([]);

  // Check URL promo parameter on component mount
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const promoParam = params.get('promo') || params.get('cupom') || params.get('coupon');
      if (promoParam) {
        const cleanPromo = promoParam.trim().toUpperCase();
        setIsSignUp(true);
        setCouponCode(cleanPromo);
        void checkCouponValidity(cleanPromo);
      }
    } catch (e) {}
  }, []);

  // Creates the app profile after Supabase confirms the authenticated identity.
  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) return;

    const completeAuthenticatedSignIn = (sessionUser: { id: string; email?: string; user_metadata?: Record<string, unknown> }) => {
      if (!sessionUser.email || completedAuthUserIdsRef.current.has(sessionUser.id)) return Promise.resolve();
      const pendingCompletion = pendingAuthCompletionsRef.current.get(sessionUser.id);
      if (pendingCompletion) return pendingCompletion;

      const completion = (async () => {
        setLoading(true);
        setErrorMsg('');
        try {
          const savedConsent = localStorage.getItem('bia_google_location_consent') === 'true';
          localStorage.removeItem('bia_google_location_consent');
          const geo = savedConsent ? await fetchIpGeolocation() : undefined;
          const profile = await registerAuthenticatedProfile(savedConsent, geo);
          const storedUsersRaw = localStorage.getItem('bia_users_database');
          const usersList: UserProfile[] = storedUsersRaw ? JSON.parse(storedUsersRaw) : [];
          const existingIndex = usersList.findIndex((user) => user.email.toLowerCase() === profile.email.toLowerCase());
          const existingUser: UserProfile = {
            ...(existingIndex >= 0 ? usersList[existingIndex] : {}),
            ...profile,
            password: undefined
          } as UserProfile;
          delete existingUser.onboarding_notice;

          let pendingCoupon: { code?: string; email?: string } = {};
          try {
            pendingCoupon = JSON.parse(localStorage.getItem('bia_pending_trial_coupon') || '{}');
          } catch {
            pendingCoupon = {};
          }
          if (
            pendingCoupon.code &&
            (!pendingCoupon.email || pendingCoupon.email.trim().toLowerCase() === profile.email.toLowerCase())
          ) {
            try {
              const redemption = await redeemAuthenticatedTrialCoupon(pendingCoupon.code);
              if (redemption.ok) {
                localStorage.removeItem('bia_pending_trial_coupon');
              } else {
                existingUser.onboarding_notice = redemption.reason === 'trial_already_used'
                  ? 'Esta conta já utilizou o período de degustação. O cupom não pode ser repassado para desbloquear outro teste.'
                  : 'O cupom não pôde ser aplicado (inválido, expirado ou já utilizado). Você ainda pode continuar para o pagamento.';
                localStorage.removeItem('bia_pending_trial_coupon');
              }
            } catch (couponError) {
              console.error('Trial coupon redemption failed after account registration:', couponError);
              existingUser.onboarding_notice = 'Não foi possível aplicar o cupom agora. Você ainda pode continuar para o pagamento.';
            }
          }

          if (existingIndex >= 0) usersList[existingIndex] = existingUser;
          else usersList.push(existingUser);
          localStorage.setItem('bia_users_database', JSON.stringify(usersList));
          localStorage.setItem('bia_current_user', JSON.stringify(existingUser));

          completedAuthUserIdsRef.current.add(sessionUser.id);
          setSuccessMsg(`Bem-vindo, ${existingUser.full_name || existingUser.email}.`);
          onAuthSuccess(existingUser);
        } catch (err: any) {
          localStorage.removeItem('bia_google_location_consent');
          setErrorMsg(err.message || 'Não foi possível concluir o cadastro/login. Tente novamente.');
        } finally {
          setLoading(false);
        }
      })();

      pendingAuthCompletionsRef.current.set(sessionUser.id, completion);
      void completion.finally(() => pendingAuthCompletionsRef.current.delete(sessionUser.id));
      return completion;
    };
    completeAuthenticatedSignInRef.current = completeAuthenticatedSignIn;

    void client.auth.getSession().then(({ data }) => {
      if (data.session?.user) void completeAuthenticatedSignIn(data.session.user);
    }).catch((error) => {
      console.error('Could not restore Supabase authentication session:', error);
      setErrorMsg('Não foi possível verificar sua sessão. Atualize a página e tente novamente.');
    });

    const { data: authListener } = client.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') completedAuthUserIdsRef.current.clear();
      if (event === 'SIGNED_IN' && session?.user) void completeAuthenticatedSignIn(session.user);
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  // Supabase returns to this app after Google OAuth and the auth listener completes the profile.
  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    if (isSignUp && couponCode.trim() && couponState.status !== 'valid') {
      setErrorMsg('Aguarde a validação do cupom ou remova o código antes de continuar.');
      return;
    }
    setLoading(true);
    localStorage.setItem('bia_google_location_consent', String(locationConsent));
    if (isSignUp && couponState.status === 'valid') {
      localStorage.setItem('bia_pending_trial_coupon', JSON.stringify({ code: couponCode.trim().toUpperCase() }));
    } else {
      localStorage.removeItem('bia_pending_trial_coupon');
    }
    const result = await signInWithGoogle();
    if (!result.ok) {
      setLoading(false);
      localStorage.removeItem('bia_google_location_consent');
      localStorage.removeItem('bia_pending_trial_coupon');
      setErrorMsg(
        result.reason === 'offline'
          ? 'Login com Google indisponível no momento.'
          : result.message || 'Não foi possível iniciar o login com Google.'
      );
    }
  };

  // Validates a coupon against the shared database first (so a code that was
  // already redeemed on another device/browser is correctly rejected here too).
  const checkCouponValidity = async (rawCode: string) => {
    const requestId = ++couponCheckRequestRef.current;
    const clean = rawCode.trim().toUpperCase();
    if (!clean) {
      setCouponState({ status: 'idle', days: 2, message: '' });
      return;
    }

    let remoteCoupon;
    try {
      remoteCoupon = await fetchCouponFromSupabase(clean);
    } catch (error) {
      if (requestId !== couponCheckRequestRef.current) return;
      console.error('Trial coupon validation request failed:', error);
      setCouponState({ status: 'invalid', days: 2, message: 'Não foi possível validar o cupom agora. Tente novamente.' });
      return;
    }
    if (requestId !== couponCheckRequestRef.current) return;
    if (remoteCoupon) {
      if (remoteCoupon.expires_at && new Date(remoteCoupon.expires_at).getTime() <= Date.now()) {
        setCouponState({ status: 'invalid', days: 2, message: 'Este cupom expirou.' });
        return;
      }
      if (remoteCoupon.is_used) {
        setCouponState({
          status: 'used',
          days: 2,
          message: 'Este cupom de uso único já foi resgatado e não pode ser reutilizado.'
        });
        return;
      }

      setCouponState({
        status: 'valid',
        days: remoteCoupon.days || 2,
        message: `Cupom válido: ${remoteCoupon.days || 2} dias de degustação gratuita liberados!`
      });
      return;
    }

    setCouponState({
      status: 'invalid',
      days: 2,
      message: 'Cupom não encontrado, expirado ou já utilizado.'
    });
  };

  // 17 clicks Easter Egg Trigger
  const handleEasterEggClick = () => {
    const now = Date.now();
    clickTimestamps.current.push(now);

    // Keep timestamps within last 3 seconds (3000ms)
    clickTimestamps.current = clickTimestamps.current.filter((t) => now - t <= 3000);
    setEggCounter(clickTimestamps.current.length);

    if (clickTimestamps.current.length >= 17) {
      // Toggle Admin Mode
      setIsAdminMode((prev) => {
        const next = !prev;
        if (next) {
          setEmail('andrejrcardoso93@gmail.com');
          setPassword('');
          setErrorMsg('');
          setSuccessMsg('Modo CEO ativado. Confirme sua sessão pelo Google para continuar.');
        } else {
          setEmail('');
          setPassword('');
          setSuccessMsg('');
        }
        return next;
      });
      clickTimestamps.current = [];
      setEggCounter(0);
    }
  };

  // Google remains available as a shortcut; password login uses Supabase Auth.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (isAdminMode) {
      await handleGoogleSignIn();
      return;
    }

    if (!isSignUp) {
      setLoading(true);
      try {
        const cleanEmail = email.trim().toLowerCase();
        if (!isValidEmailFormat(cleanEmail)) {
          throw new Error('Por favor, informe um endereço de e-mail válido.');
        }

        if (cleanEmail === CEO_EMAIL) {
          throw new Error('A conta CEO usa somente o botão "Entrar com Google" para manter a sessão protegida.');
        }

        const client = getSupabaseClient();
        if (!client) throw new Error('Login por e-mail indisponível: Supabase não configurado.');

        localStorage.setItem('bia_google_location_consent', String(locationConsent));
        const { error: signInError } = await client.auth.signInWithPassword({
          email: cleanEmail,
          password
        });
        if (signInError) {
          localStorage.removeItem('bia_google_location_consent');
          throw new Error('E-mail ou senha inválidos, ou conta ainda não confirmada. Confira os dados ou entre com o Google.');
        }
        setSuccessMsg('Login confirmado. Carregando seu perfil...');
      } catch (err: any) {
        setErrorMsg(err.message || 'Falha ao autenticar.');
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      if (!isValidEmailFormat(cleanEmail)) {
        throw new Error('Por favor, informe um endereço de e-mail válido (ex: seu.nome@gmail.com).');
      }
      if (!fullName.trim()) throw new Error('Informe seu nome completo para criar a conta.');
      if (password.length < 6) throw new Error('A senha deve conter no mínimo 6 caracteres.');
      if (couponCode.trim() && couponState.status !== 'valid') {
        throw new Error('Aguarde a validação do cupom ou remova o código antes de continuar.');
      }
      if (cleanEmail === CEO_EMAIL) {
        throw new Error('A conta CEO usa somente o botão "Entrar com Google".');
      }

      const client = getSupabaseClient();
      if (!client) throw new Error('Cadastro indisponível: não foi possível conectar ao Supabase.');

      localStorage.setItem('bia_google_location_consent', String(locationConsent));
      if (couponState.status === 'valid') {
        localStorage.setItem('bia_pending_trial_coupon', JSON.stringify({
          code: couponCode.trim().toUpperCase(),
          email: cleanEmail
        }));
      }

      const { data, error: signUpError } = await client.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: { full_name: fullName.trim() },
          emailRedirectTo: new URL(import.meta.env.BASE_URL, window.location.origin).toString()
        }
      });
      if (signUpError) {
        localStorage.removeItem('bia_google_location_consent');
        localStorage.removeItem('bia_pending_trial_coupon');
        const message = signUpError.message.toLowerCase().includes('already registered')
          ? 'Este e-mail já tem uma conta. Use “Entrar” ou escolha “Entrar com o Google”.'
          : signUpError.message;
        throw new Error(message);
      }

      if (data.session?.user) {
        await completeAuthenticatedSignInRef.current(data.session.user);
      } else {
        setSuccessMsg('Conta criada. Confirme seu e-mail pelo link enviado para concluir o cadastro e continuar para o pagamento.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao autenticar.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="app-auth-layer fixed inset-0 flex h-dvh flex-col overflow-y-auto overscroll-contain p-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] select-none sm:p-4 md:p-6">
      <div className="relative flex min-h-full w-full flex-col">
        {/* TOP BAR: Exact Internal Clock component on Upper Left | Right "Como funciona?" Button */}
        <div className="z-20 flex w-full shrink-0 items-start justify-between pointer-events-auto">
          
          {/* UPPER LEFT: IDENTICAL APP CLOCK */}
          <div className="p-1">
            <Clock clock24h={false} size="sm" align="left" />
          </div>

          {/* UPPER RIGHT: COMO FUNCIONA */}
          {!isAdminMode && (
            <button
              type="button"
              onClick={() => setIsTourOpen(true)}
              className="px-3.5 py-2 rounded-2xl bg-black/40 hover:bg-black/60 border border-white/20 text-white/90 hover:text-white text-xs font-bold flex items-center gap-2 transition-all shadow-xl cursor-pointer group active:scale-95 backdrop-blur-md"
              title="Conheça todos os módulos da plataforma e planos de assinatura"
            >
              <Sparkles size={14} className="text-amber-400" />
              <span>Como funciona?</span>
            </button>
          )}
        </div>

        {/* CENTER: Clean Floating Form Elements */}
        <div className="mx-auto flex w-full max-w-[480px] flex-1 min-h-0 items-center justify-center px-1 py-2 sm:px-2">
          <div className="flex w-full flex-col items-center">
        
        {/* LOGO WITH 17-CLICK EASTER EGG */}
        <div
          onClick={handleEasterEggClick}
          className="cursor-pointer select-none mb-3 flex flex-col items-center group transition-transform active:scale-95 text-center relative"
          title="Brazilian in Action"
        >
          <div className="relative mb-2">
            <div className="p-2.5 rounded-3xl bg-transparent flex items-center justify-center group-hover:scale-105 transition-all">
              <BrazilianLogo size="lg" />
            </div>
            {isAdminMode && (
              <div className="absolute -top-1 -right-1 bg-red-600 text-white p-1 rounded-full shadow-md animate-pulse">
                <Shield size={14} />
              </div>
            )}
          </div>

          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-1.5 justify-center drop-shadow-[0_2px_12px_rgba(0,0,0,1)]">
            <span>Brazilian</span>
            <span className={isAdminMode ? 'text-red-400' : 'text-amber-400'}>in Action</span>
          </h1>

          <p className="text-[11px] text-white/90 tracking-wider uppercase font-mono mt-0.5 drop-shadow-[0_2px_8px_rgba(0,0,0,1)]">
            {isAdminMode ? 'Acesso Exclusivo do CEO André Augusto' : 'Plataforma Imersiva de Inglês'}
          </p>
        </div>

        {/* Notification Banners */}
        {errorMsg && (
          <div className="w-full p-3 mb-2.5 rounded-2xl text-xs font-semibold bg-red-600/90 border border-red-500 text-white flex items-center gap-2 shadow-2xl animate-shake">
            <AlertCircle size={15} className="shrink-0 text-white" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="w-full p-3 mb-2.5 rounded-2xl text-xs font-semibold bg-emerald-600/90 border border-emerald-500 text-white flex items-center gap-2 shadow-2xl">
            <CheckCircle size={15} className="shrink-0 text-white" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Pricing / Trial Header Banner */}
        {!isAdminMode && (
          <div className={`w-full border rounded-2xl p-2.5 px-3.5 mb-2.5 flex items-center justify-between gap-2 text-[11px] sm:text-xs transition-all backdrop-blur-md shadow-lg ${
            couponState.status === 'valid'
              ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'
              : 'bg-black/40 border-white/20 text-white'
          }`}>
            <div className="flex min-w-0 items-center gap-1.5 font-bold">
              {couponState.status === 'valid' ? (
                <>
                  <Sparkles size={12} className="text-emerald-300 shrink-0" />
                  <span className="truncate text-emerald-300">Degustação</span>
                </>
              ) : (
                <>
                  <Zap size={12} className="text-amber-400 shrink-0" />
                  <span className="truncate text-amber-300">Assinatura</span>
                </>
              )}
            </div>
            <div className="shrink-0 font-mono font-black text-[11px] sm:text-sm">
              {couponState.status === 'valid' ? (
                <span className="text-emerald-300">{couponState.days} DIAS GRÁTIS</span>
              ) : (
                <span className="text-amber-400">
                  R$ {(gatewaySettings?.subscriptionPrice ?? 10).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mês
                </span>
              )}
            </div>
          </div>
        )}

        {/* CEO Mode Header Banner */}
        {isAdminMode && (
          <div className="w-full bg-red-600/30 border border-red-500/50 rounded-2xl p-3 mb-2.5 text-xs text-red-200 backdrop-blur-md flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold">
              <Shield size={16} className="text-red-400" />
              <span>Acesso Executivo Master</span>
            </div>
            <span className="text-[10px] font-mono bg-red-950/80 px-2 py-0.5 rounded text-red-300 border border-red-500/30">
              CEO ONLY
            </span>
          </div>
        )}

        {/* FLOATING TEXTBOXES FORM */}
        <form onSubmit={handleSubmit} className="w-full rounded-[26px] border border-white/10 bg-black/15 p-2.5 shadow-[0_25px_60px_rgba(0,0,0,0.55)] backdrop-blur-md sm:p-3.5">
          <div className="flex w-full flex-col gap-2.5">
          {isSignUp && !isAdminMode && (
            <div className="grid gap-1.5 sm:grid-cols-[94px_minmax(0,1fr)] sm:items-center">
              <label className="text-[10px] sm:text-[11px] text-white/90 font-bold sm:text-right drop-shadow">Nome</label>
              <div className="flex items-center gap-2.5 bg-black/40 hover:bg-black/50 focus-within:bg-black/60 border border-white/25 focus-within:border-amber-400 rounded-2xl px-3 py-2.5 transition-all backdrop-blur-md shadow-xl">
                <User size={15} className="text-white/70 shrink-0" />
                <input
                  type="text"
                  required
                  placeholder="Seu nome completo"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="bg-transparent text-white text-xs sm:text-sm outline-none w-full placeholder:text-white/50"
                />
              </div>
            </div>
          )}

          {isSignUp && !isAdminMode && (
            <label className="flex cursor-pointer items-start gap-2 rounded-xl px-1 py-1 text-[10px] leading-relaxed text-white/55 sm:text-[11px]">
              <input
                type="checkbox"
                checked={locationConsent}
                onChange={(event) => setLocationConsent(event.target.checked)}
                className="mt-0.5 shrink-0 accent-amber-400"
              />
              <span>Opcional: compartilhar minha região aproximada no Brazilian Friends.</span>
            </label>
          )}

          <div className="grid gap-1.5 sm:grid-cols-[94px_minmax(0,1fr)] sm:items-center">
            <label className="text-[10px] sm:text-[11px] text-white/90 font-bold sm:text-right drop-shadow">
              {isAdminMode ? 'E-mail CEO' : 'E-mail'}
            </label>
            <div className="flex items-center gap-2.5 bg-black/40 hover:bg-black/50 focus-within:bg-black/60 border border-white/25 focus-within:border-amber-400 rounded-2xl px-3 py-2.5 transition-all backdrop-blur-md shadow-xl">
              <Mail size={15} className="text-white/70 shrink-0" />
              <input
                type="email"
                required
                placeholder="seu.email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-transparent text-white text-xs sm:text-sm outline-none w-full placeholder:text-white/50"
              />
            </div>
          </div>

          <div className="grid gap-1.5 sm:grid-cols-[94px_minmax(0,1fr)] sm:items-center">
            <label className="text-[10px] sm:text-[11px] text-white/90 font-bold sm:text-right drop-shadow">
              {isAdminMode ? 'Senha CEO' : 'Senha'}
            </label>
            <div className="flex items-center gap-2.5 bg-black/40 hover:bg-black/50 focus-within:bg-black/60 border border-white/25 focus-within:border-amber-400 rounded-2xl px-3 py-2.5 transition-all backdrop-blur-md shadow-xl">
              <Lock size={15} className="text-white/70 shrink-0" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder={isAdminMode ? 'Senha Master' : '••••••••'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-transparent text-white text-xs sm:text-sm outline-none w-full placeholder:text-white/50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-white/60 hover:text-white p-1 rounded transition-colors cursor-pointer"
                title={showPassword ? 'Ocultar senha' : 'Ver senha'}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* MEU CUPOM */}
          {isSignUp && !isAdminMode && (
            <div className="pt-0.5">
              <div className="mb-1 grid gap-1.5 sm:grid-cols-[94px_minmax(0,1fr)] sm:items-center">
                <label className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-white/90 sm:justify-end drop-shadow">
                  <Ticket size={12} className="text-amber-400" />
                  <span>Cupom</span>
                </label>

                <div className={`flex items-center gap-2.5 bg-black/40 hover:bg-black/50 focus-within:bg-black/60 border rounded-2xl px-3 py-2.5 transition-all backdrop-blur-md shadow-xl ${
                  couponState.status === 'valid'
                    ? 'border-emerald-400 bg-emerald-500/20'
                    : couponState.status === 'used' || couponState.status === 'invalid'
                    ? 'border-red-400 bg-red-500/20'
                    : 'border-white/25 focus-within:border-amber-400'
                }`}>
                  <Ticket size={14} className={couponState.status === 'valid' ? 'text-emerald-300' : 'text-white/70'} />
                  <input
                    type="text"
                    placeholder="Digite seu cupom"
                    value={couponCode}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setCouponCode(val);
                      setCouponState({ status: 'idle', days: 2, message: '' });
                      if (couponValidationTimerRef.current !== null) {
                        window.clearTimeout(couponValidationTimerRef.current);
                      }
                      couponValidationTimerRef.current = window.setTimeout(() => {
                        couponValidationTimerRef.current = null;
                        void checkCouponValidity(val);
                      }, 300);
                    }}
                    className="bg-transparent text-white font-mono text-xs sm:text-sm outline-none w-full placeholder:text-white/50 uppercase tracking-wider"
                  />
                  {couponState.status === 'valid' && (
                    <span className="w-5 h-5 rounded-full bg-emerald-500/30 text-emerald-300 flex items-center justify-center shrink-0">
                      <Check size={12} />
                    </span>
                  )}
                  {(couponState.status === 'used' || couponState.status === 'invalid') && (
                    <span className="w-5 h-5 rounded-full bg-red-500/30 text-red-300 flex items-center justify-center shrink-0">
                      <X size={12} />
                    </span>
                  )}
                </div>
              </div>

              {couponState.message && (
                <p className={`text-[10px] sm:text-[11px] mt-1 ml-1 font-semibold drop-shadow ${
                  couponState.status === 'valid' ? 'text-emerald-300' : 'text-red-300'
                }`}>
                  {couponState.message}
                </p>
              )}
            </div>
          )}

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2.5 mt-0.5 rounded-2xl font-black text-[11px] sm:text-sm tracking-wide transition-all cursor-pointer shadow-2xl flex items-center justify-center gap-2 active:scale-95 ${
              isAdminMode
                ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-950/50'
                : couponState.status === 'valid'
                ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/30'
                : 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/30'
            }`}
          >
            {loading ? (
              <span className="animate-pulse">Brazilian in Action...</span>
            ) : isSignUp ? (
              couponState.status === 'valid' ? (
                <>
                  <Sparkles size={14} />
                  <span className="whitespace-nowrap">Criar conta + {couponState.days} dias</span>
                </>
              ) : (
                <>
                  <ArrowRight size={14} />
                  <span className="whitespace-nowrap">Criar conta + Pix</span>
                </>
              )
            ) : (
              <>
                <ArrowRight size={14} />
                <span className="whitespace-nowrap">{isAdminMode ? 'Acessar CEO' : 'Entrar com e-mail e senha'}</span>
              </>
            )}
          </button>
          </div>
        </form>

        {/* Google Sign-In via Supabase OAuth */}
        {getSupabaseConfig().url && getSupabaseConfig().anonKey && (
          <div className="mt-3 flex w-full flex-col items-center gap-2.5 pointer-events-auto">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/[0.08] py-2.5 text-[11px] sm:text-sm font-bold text-white shadow-lg shadow-black/10 backdrop-blur-xl transition-all hover:border-white/40 hover:bg-white/[0.14] active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                <path fill="#4CAF50" d="M24 44c5.5 0 10.5-2.1 14.3-5.6l-6.6-5.4C29.6 34.9 26.9 36 24 36c-5.3 0-9.7-3.1-11.3-7.6l-6.6 5.1C9.6 39.6 16.2 44 24 44z" />
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.6 5.4C39.9 37.4 44 31.6 44 24c0-1.3-.1-2.7-.4-3.5z" />
              </svg>
              <span>{isAdminMode ? 'Confirmar CEO com Google' : 'Continuar com Google'}</span>
            </button>
          </div>
        )}

        {/* Bottom Mode Switcher Link */}
        <div className="mt-3.5 flex w-full items-center justify-center text-center">
          <div className="flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap text-center">
            <span className="text-[10px] sm:text-[11px] font-medium text-white/70">
              {isSignUp ? 'Já tem conta?' : 'Ainda não tem conta?'}
            </span>
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setErrorMsg('');
                setSuccessMsg('');
                setCouponCode('');
                couponCheckRequestRef.current += 1;
                if (couponValidationTimerRef.current !== null) {
                  window.clearTimeout(couponValidationTimerRef.current);
                  couponValidationTimerRef.current = null;
                }
                setCouponState({ status: 'idle', days: 2, message: '' });
              }}
              className="text-[10px] sm:text-[11px] font-bold text-amber-400 transition-colors hover:text-amber-300 cursor-pointer whitespace-nowrap"
            >
              {isSignUp ? 'Entrar' : 'Criar'}
            </button>
          </div>

          {isAdminMode && (
            <button
              type="button"
              onClick={() => {
                setIsAdminMode(false);
                setEmail('');
                setPassword('');
                setErrorMsg('');
              }}
              className="ml-2 shrink-0 text-[10px] text-red-300/80 hover:text-red-200 underline cursor-pointer whitespace-nowrap"
            >
              Voltar ao Login
            </button>
          )}
        </div>

          </div>
        </div>

        <div className="mt-auto w-full shrink-0 px-2 pb-2 pt-1">
          <div className="flex w-full justify-start">
            <div className="w-full max-w-[320px]">
              <SiteLegalFooter />
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Tour Modal */}
      <SubscriptionInfoModal
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        onStartSubscription={() => {
          setIsTourOpen(false);
          setIsSignUp(true);
        }}
      />
    </div>
  );
};
