import React, { useState, useRef, useEffect } from 'react';
import { UserProfile, TrialCoupon } from '../types';
import { useGatewaySettings } from '../hooks/useGatewaySettings';
import { 
  validateCeoCredentials, 
  isAuthorizedCeoEmail, 
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
import { SocialLinksBar } from './SocialLinksBar';
import { findUserProfileByEmail, syncUserProfileToSupabase, fetchCouponFromSupabase, redeemCouponInSupabase } from '../utils/supabaseClient';

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
  const [couponCode, setCouponCode] = useState('');
  const [couponState, setCouponState] = useState<{
    status: 'idle' | 'valid' | 'used' | 'invalid';
    days: number;
    message: string;
    couponObj?: TrialCoupon;
  }>({ status: 'idle', days: 5, message: '' });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [, setEggCounter] = useState(0);
  const [isTourOpen, setIsTourOpen] = useState(false);

  // Easter Egg Tracker: 17 rapid clicks in 3 seconds
  const clickTimestamps = useRef<number[]>([]);

  // Function to get or initialize coupons list
  const getStoredCoupons = (): TrialCoupon[] => {
    try {
      const stored = localStorage.getItem('bia_trial_coupons');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}

    // Default Seed Coupons if empty
    const defaultCoupons: TrialCoupon[] = [
      {
        id: 'coupon_default_1',
        code: 'BIA-5DIAS',
        days: 5,
        createdAt: new Date().toISOString(),
        isUsed: false,
        notes: 'Cupom Padrão de 5 Dias Grátis'
      },
      {
        id: 'coupon_default_2',
        code: 'DEGUSTA5',
        days: 5,
        createdAt: new Date().toISOString(),
        isUsed: false,
        notes: 'Degustação 5 Dias de Acesso'
      },
      {
        id: 'coupon_default_3',
        code: 'BRAZILIAN5',
        days: 5,
        createdAt: new Date().toISOString(),
        isUsed: false,
        notes: 'Cupom Promocional Brazilian 5 Dias'
      }
    ];
    localStorage.setItem('bia_trial_coupons', JSON.stringify(defaultCoupons));
    return defaultCoupons;
  };

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

  // Validates a coupon against the shared database first (so a code that was
  // already redeemed on another device/browser is correctly rejected here too).
  // Falls back to the local single-device list only when Supabase isn't configured.
  const checkCouponValidity = async (rawCode: string) => {
    const clean = rawCode.trim().toUpperCase();
    if (!clean) {
      setCouponState({ status: 'idle', days: 5, message: '' });
      return;
    }

    const remoteCoupon = await fetchCouponFromSupabase(clean);
    if (remoteCoupon) {
      if (remoteCoupon.is_used) {
        setCouponState({
          status: 'used',
          days: 5,
          message: 'Este cupom de uso único já foi resgatado e não pode ser reutilizado.'
        });
        return;
      }

      setCouponState({
        status: 'valid',
        days: remoteCoupon.days || 5,
        message: `Cupom Válido: ${remoteCoupon.days || 5} Dias de Degustação Gratuita liberados!`
      });
      return;
    }

    try {
      const couponsList = getStoredCoupons();
      const found = couponsList.find((c) => c.code.toUpperCase() === clean);

      if (!found) {
        setCouponState({
          status: 'invalid',
          days: 5,
          message: 'Código de cupom não encontrado ou inválido.'
        });
        return;
      }

      if (found.isUsed) {
        setCouponState({
          status: 'used',
          days: 5,
          message: 'Este cupom de uso único já foi resgatado e não pode ser reutilizado.'
        });
        return;
      }

      setCouponState({
        status: 'valid',
        days: found.days || 5,
        message: `Cupom Válido: ${found.days || 5} Dias de Degustação Gratuita liberados!`,
        couponObj: found
      });
    } catch (e) {
      setCouponState({ status: 'invalid', days: 5, message: 'Erro ao validar cupom.' });
    }
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
          setSuccessMsg('Modo CEO & Administrador Master ativado. Insira sua Senha Executiva.');
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

  // Sign-up with direct Pix generation OR Login flow
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();

      // Basic email validation
      if (!isValidEmailFormat(cleanEmail)) {
        throw new Error('Por favor, informe um endereço de e-mail válido (ex: seu.nome@gmail.com).');
      }

      const storedUsersRaw = localStorage.getItem('bia_users_database');
      let usersList: UserProfile[] = storedUsersRaw ? JSON.parse(storedUsersRaw) : [];

      // Geolocation lookup
      let geo = { country: 'Brasil', regionName: 'São Paulo', city: 'São Paulo' };
      try {
        const geoRes = await fetch('https://ipapi.co/json/').then((res) => res.json());
        if (geoRes && geoRes.country_name) {
          geo = {
            country: geoRes.country_name,
            regionName: geoRes.region || '',
            city: geoRes.city || ''
          };
        }
      } catch (e) {}

      if (isSignUp) {
        // Direct Student Signup (No email delivery roadblock)
        const existing = usersList.find((u) => u.email.toLowerCase() === cleanEmail);
        if (existing) {
          throw new Error('Este e-mail já está cadastrado. Alterne para Entrar na sua Conta.');
        }

        if (password.length < 6) {
          throw new Error('A senha deve conter no mínimo 6 caracteres.');
        }

        const isCouponActive = couponState.status === 'valid';
        const trialDays = couponState.days || 5;

        // Re-validate + atomically redeem right before creating the account, so a
        // coupon cannot be double-spent by two signups racing each other.
        let couponGranted = false;
        let grantedDays = trialDays;
        if (isCouponActive) {
          const redeemResult = await redeemCouponInSupabase(couponCode, cleanEmail);
          if (redeemResult.ok) {
            couponGranted = true;
            grantedDays = redeemResult.coupon?.days || trialDays;
          } else if (redeemResult.reason === 'offline') {
            // No Supabase configured: fall back to the local single-device list.
            try {
              const rawCoupons = localStorage.getItem('bia_trial_coupons');
              const parsed: TrialCoupon[] = rawCoupons ? JSON.parse(rawCoupons) : [];
              const target = parsed.find((c) => c.code.toUpperCase() === couponCode.trim().toUpperCase());
              if (target && !target.isUsed) {
                const updated = parsed.map((c) =>
                  c.code.toUpperCase() === couponCode.trim().toUpperCase()
                    ? { ...c, isUsed: true, usedByEmail: cleanEmail, usedAt: new Date().toISOString() }
                    : c
                );
                localStorage.setItem('bia_trial_coupons', JSON.stringify(updated));
                couponGranted = true;
              }
            } catch (e) {}
          } else {
            throw new Error('Este cupom de uso único já foi resgatado e não pode ser reutilizado.');
          }
        }

        const expirationDate = new Date();
        if (couponGranted) {
          expirationDate.setDate(expirationDate.getDate() + grantedDays);
        } else {
          expirationDate.setDate(expirationDate.getDate() + 30);
        }

        const newUser: UserProfile = {
          id: typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `user_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          email: cleanEmail,
          password: password,
          full_name: fullName.trim() || 'Estudante Brazilian in Action',
          role: 'student',
          status: couponGranted ? 'active' : 'pending',
          data_expiracao: expirationDate.toISOString(),
          email_verified: true,
          ip_country: geo.country,
          ip_region: geo.regionName,
          ip_city: geo.city,
          cupom_usado: couponGranted ? couponCode.trim().toUpperCase() : undefined,
          permissions: {
            friends: true,
            readclub: true,
            board: true,
            quiz: true,
            biacompare: true,
            conversation: true,
            tradutor: true,
            youtube: true,
            practice: true,
            stories: true
          },
          created_at: new Date().toISOString()
        };

        usersList.push(newUser);
        localStorage.setItem('bia_users_database', JSON.stringify(usersList));
        localStorage.setItem('bia_current_user', JSON.stringify(newUser));
        void syncUserProfileToSupabase(newUser);

        setSuccessMsg(
          couponGranted
            ? `Conta criada com sucesso! ${grantedDays} Dias de Degustação Liberados.`
            : 'Conta criada! Prossiga com o pagamento Pix para ativar seu acesso.'
        );

        setTimeout(() => {
          onAuthSuccess(newUser);
        }, 600);
      } else {
        // Login Flow (Admin or Student)
        const isCeoCandidate = isAdminMode || isAuthorizedCeoEmail(cleanEmail);

        if (isCeoCandidate) {
          // STRICT CEO VERIFICATION: Both email and password MUST match CEO credentials
          const ceoAuth = validateCeoCredentials(cleanEmail, password);
          if (ceoAuth.isValid) {
            const adminUser: UserProfile = {
              id: 'admin_master_ceo',
              email: cleanEmail,
              full_name: 'CEO André Augusto',
              role: 'admin',
              status: 'active',
              data_expiracao: null,
              email_verified: true,
              ip_country: geo.country,
              ip_region: geo.regionName,
              ip_city: geo.city,
              permissions: {
                friends: true,
                readclub: true,
                board: true,
                quiz: true,
                biacompare: true,
                conversation: true,
                tradutor: true,
                youtube: true,
                practice: true,
                stories: true
              },
              created_at: new Date().toISOString()
            };

            localStorage.setItem('bia_current_user', JSON.stringify(adminUser));
            setSuccessMsg('Bem-vindo, CEO André Augusto.');
            setTimeout(() => {
              onAuthSuccess(adminUser);
            }, 500);
            return;
          } else if (isAdminMode) {
            throw new Error(ceoAuth.message || 'Acesso restrito apenas ao CEO André Augusto.');
          }
        }

        // Student Login
        let existingUser = usersList.find((u) => u.email.toLowerCase() === cleanEmail);
        const remoteProfile = await findUserProfileByEmail(cleanEmail);
        if (remoteProfile && !existingUser) {
          existingUser = {
            id: remoteProfile.id,
            email: remoteProfile.email,
            full_name: remoteProfile.full_name || remoteProfile.email.split('@')[0],
            role: remoteProfile.role || 'student',
            status: remoteProfile.status || 'pending',
            data_expiracao: remoteProfile.data_expiracao || null,
            permissions: remoteProfile.permissions || {
              friends: true,
              readclub: true,
              board: true,
              quiz: true,
              biacompare: true,
              conversation: true,
              tradutor: true,
              youtube: true,
              practice: true,
              stories: true
            },
            created_at: remoteProfile.created_at || new Date().toISOString(),
            updated_at: remoteProfile.updated_at || new Date().toISOString()
          } as UserProfile;
          usersList.push(existingUser);
          localStorage.setItem('bia_users_database', JSON.stringify(usersList));
        }

        if (!existingUser) {
          throw new Error('E-mail não cadastrado. Clique em "Criar Conta" para começar.');
        }

        // Validate student password
        if (existingUser.password && existingUser.password !== password) {
          throw new Error('Senha incorreta. Verifique os dados digitados e tente novamente.');
        }

        if (existingUser.data_expiracao && new Date(existingUser.data_expiracao) < new Date()) {
          existingUser.status = 'expired';
          const idx = usersList.findIndex((u) => u.id === existingUser?.id);
          if (idx >= 0) usersList[idx].status = 'expired';
          localStorage.setItem('bia_users_database', JSON.stringify(usersList));
        }

        localStorage.setItem('bia_current_user', JSON.stringify(existingUser));
        void syncUserProfileToSupabase(existingUser);
        setSuccessMsg(`Bem-vindo de volta, ${existingUser.full_name || existingUser.email}.`);
        setTimeout(() => {
          if (existingUser) onAuthSuccess(existingUser);
        }, 500);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao autenticar.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col justify-between p-4 sm:p-6 overflow-y-auto custom-scrollbar select-none">
      
      {/* TOP BAR: Exact Internal Clock component on Upper Left | Right "Como funciona?" Button */}
      <div className="w-full flex items-start justify-between pointer-events-auto z-20">
        
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
      <div className="w-full max-w-md mx-auto my-auto p-4 sm:p-6 flex flex-col items-center">
        
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
          <div className={`w-full border rounded-2xl p-2.5 px-3.5 mb-2.5 flex items-center justify-between text-xs transition-all backdrop-blur-md shadow-lg ${
            couponState.status === 'valid'
              ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'
              : 'bg-black/40 border-white/20 text-white'
          }`}>
            <div className="flex items-center gap-1.5 font-bold">
              {couponState.status === 'valid' ? (
                <>
                  <Sparkles size={14} className="text-emerald-300" />
                  <span className="text-emerald-300">Degustação Liberada</span>
                </>
              ) : (
                <>
                  <Zap size={14} className="text-amber-400" />
                  <span className="text-amber-300">Assinatura Mensal</span>
                </>
              )}
            </div>
            <div className="font-mono font-black text-sm">
              {couponState.status === 'valid' ? (
                <span className="text-emerald-300">5 DIAS GRÁTIS</span>
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
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-2.5">
          {isSignUp && !isAdminMode && (
            <div>
              <label className="text-[11px] text-white/90 font-bold ml-1 drop-shadow">Nome Completo</label>
              <div className="flex items-center gap-2.5 bg-black/40 hover:bg-black/50 focus-within:bg-black/60 border border-white/25 focus-within:border-amber-400 rounded-2xl px-4 py-3 mt-1 transition-all backdrop-blur-md shadow-xl">
                <User size={16} className="text-white/70 shrink-0" />
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

          <div>
            <label className="text-[11px] text-white/90 font-bold ml-1 drop-shadow">
              {isAdminMode ? 'E-mail do CEO' : 'E-mail'}
            </label>
            <div className="flex items-center gap-2.5 bg-black/40 hover:bg-black/50 focus-within:bg-black/60 border border-white/25 focus-within:border-amber-400 rounded-2xl px-4 py-3 mt-1 transition-all backdrop-blur-md shadow-xl">
              <Mail size={16} className="text-white/70 shrink-0" />
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

          <div>
            <label className="text-[11px] text-white/90 font-bold ml-1 drop-shadow">
              {isAdminMode ? 'Senha Master Executiva' : 'Senha'}
            </label>
            <div className="flex items-center gap-2.5 bg-black/40 hover:bg-black/50 focus-within:bg-black/60 border border-white/25 focus-within:border-amber-400 rounded-2xl px-4 py-3 mt-1 transition-all backdrop-blur-md shadow-xl">
              <Lock size={16} className="text-white/70 shrink-0" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder={isAdminMode ? 'Senha Master do CEO' : '••••••••'}
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
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* MEU CUPOM */}
          {isSignUp && !isAdminMode && (
            <div className="pt-0.5">
              <div className="flex items-center justify-between ml-1 mb-1">
                <label className="text-[11px] text-white/90 font-bold flex items-center gap-1 drop-shadow">
                  <Ticket size={13} className="text-amber-400" />
                  <span>Meu Cupom (Opcional)</span>
                </label>
              </div>

              <div className={`flex items-center gap-2.5 bg-black/40 hover:bg-black/50 focus-within:bg-black/60 border rounded-2xl px-4 py-3 transition-all backdrop-blur-md shadow-xl ${
                couponState.status === 'valid'
                  ? 'border-emerald-400 bg-emerald-500/20'
                  : couponState.status === 'used' || couponState.status === 'invalid'
                  ? 'border-red-400 bg-red-500/20'
                  : 'border-white/25 focus-within:border-amber-400'
              }`}>
                <Ticket size={16} className={couponState.status === 'valid' ? 'text-emerald-300' : 'text-white/70'} />
                <input
                  type="text"
                  placeholder="Digite seu cupom..."
                  value={couponCode}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    setCouponCode(val);
                    void checkCouponValidity(val);
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

              {couponState.message && (
                <p className={`text-[11px] mt-1 ml-1 font-semibold drop-shadow ${
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
            className={`w-full py-3.5 mt-1.5 rounded-2xl font-black text-xs sm:text-sm tracking-wide transition-all cursor-pointer shadow-2xl flex items-center justify-center gap-2 active:scale-95 ${
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
                  <Sparkles size={16} />
                  <span>Criar Conta & Degustar 5 Dias Grátis</span>
                </>
              ) : (
                <>
                  <ArrowRight size={16} />
                  <span>Criar Conta & Efetuar Pagamento Pix</span>
                </>
              )
            ) : (
              <>
                <ArrowRight size={16} />
                <span>{isAdminMode ? 'Acessar Central do CEO' : 'Entrar na Plataforma'}</span>
              </>
            )}
          </button>
        </form>

        {/* Bottom Mode Switcher Link */}
        <div className="mt-3.5 text-center flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setErrorMsg('');
              setSuccessMsg('');
              setCouponCode('');
              setCouponState({ status: 'idle', days: 5, message: '' });
            }}
            className="text-xs text-white/90 hover:text-amber-400 font-bold transition-colors cursor-pointer drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
          >
            {isSignUp ? (
              <span>Já possui uma conta? <strong className="text-amber-400 underline">Fazer Login</strong></span>
            ) : (
              <span>Ainda não é assinante? <strong className="text-amber-400 underline">Criar Conta</strong></span>
            )}
          </button>

          {isAdminMode && (
            <button
              type="button"
              onClick={() => {
                setIsAdminMode(false);
                setEmail('');
                setPassword('');
                setErrorMsg('');
              }}
              className="text-[11px] text-red-300/80 hover:text-red-200 underline cursor-pointer mt-1"
            >
              Voltar ao Login de Alunos
            </button>
          )}
        </div>

        {/* Social Media Channels (YouTube, TikTok, Instagram, WhatsApp) - Soltos & Separados */}
        <div className="mt-4 flex justify-center w-full pointer-events-auto">
          <SocialLinksBar size="md" />
        </div>
      </div>

      {/* FOOTER: Official Brand Slogan + International Intellectual Property Legal Notice */}
      <footer className="w-full py-3 flex flex-col items-center justify-center text-center gap-1.5 pointer-events-none mt-auto select-none px-4">
        <p className="text-xs sm:text-sm font-extrabold tracking-wide text-amber-300 drop-shadow-[0_2px_8px_rgba(0,0,0,1)]">
          Brazilian in Action - O melhor conteúdo de Inglês do mundo!
        </p>
        <p className="text-[10px] sm:text-xs text-white/80 font-mono tracking-wider drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]">
          © 2026 Brazilian in Action. Todos os direitos reservados.
        </p>
      </footer>

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
