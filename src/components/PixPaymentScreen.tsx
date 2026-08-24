import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import QRCode from 'qrcode';
import { UserProfile, PixPaymentRecord, TrialCoupon } from '../types';
import { useGatewaySettings } from '../hooks/useGatewaySettings';
import { generatePixBRCode } from '../utils/pixPayload';
import { 
  QrCode, 
  Copy, 
  CheckCircle, 
  ShieldCheck, 
  Zap, 
  RefreshCw, 
  Check, 
  History, 
  FileText, 
  Receipt, 
  X, 
  KeyRound,
  Sparkles
} from 'lucide-react';
import { BrazilianLogo } from './BrazilianLogo';
import { SocialLinksBar } from './SocialLinksBar';
import { getSupabaseClient } from '../utils/supabaseClient';

interface PixPaymentScreenProps {
  user: UserProfile;
  onPaymentSuccess: () => void;
  onSubscriptionUpdate?: (subscription: { status: string; subscription_expires_at?: string | null }) => void;
  onLogout: () => void;
}

export const PixPaymentScreen: React.FC<PixPaymentScreenProps> = ({
  user,
  onPaymentSuccess,
  onSubscriptionUpdate,
  onLogout
}) => {
  const [activeTab, setActiveTab] = useState<'checkout' | 'history'>('checkout');
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<PixPaymentRecord[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<PixPaymentRecord | null>(null);
  const [mercadoPagoPix, setMercadoPagoPix] = useState<{
    id: string;
    qrCode?: string;
    qrCodeBase64?: string;
    ticketUrl?: string;
  } | null>(null);
  const [mercadoPagoLoading, setMercadoPagoLoading] = useState(false);
  const [mercadoPagoError, setMercadoPagoError] = useState('');

  // CEO Instant VIP Token
  const [showVipTokenModal, setShowVipTokenModal] = useState(false);
  const [vipTokenInput, setVipTokenInput] = useState('');
  const [vipTokenError, setVipTokenError] = useState('');

  const [settings] = useGatewaySettings();
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Official Pix Key & Payload
  const activePixKey = (settings.pixKey && settings.pixKey.trim()) || 'brazilianinaction@gmail.com';
  const activePixPayload = generatePixBRCode({
    pixKey: activePixKey,
    beneficiaryName: settings.beneficiaryName || 'Brazilian in Action Idiomas',
    city: settings.city || 'SAO PAULO',
    amount: settings.subscriptionPrice || 10.0,
    txId: `BIA${user.id.slice(-6).toUpperCase()}`
  });
  const copyablePixValue = mercadoPagoPix?.qrCode || activePixPayload;

  useEffect(() => {
    let cancelled = false;
    const createMercadoPagoPix = async () => {
      setMercadoPagoLoading(true);
      setMercadoPagoError('');
      try {
        const nameParts = (user.full_name || 'Aluno BIA').trim().split(/\s+/);
        const response = await fetch('/api/payments/create-pix', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user.email,
            firstName: nameParts[0] || 'Aluno',
            lastName: nameParts.slice(1).join(' ') || 'BIA',
            amount: settings.subscriptionPrice || 10,
            description: 'Assinatura Mensal - Brazilian in Action Idiomas'
          })
        });
        const data = await response.json();
        if (!response.ok || !data.id) {
          throw new Error(data.error || 'Mercado Pago is not configured on the server.');
        }
        if (!cancelled) setMercadoPagoPix(data);
      } catch (error: any) {
        if (!cancelled) setMercadoPagoError(error.message || 'Unable to create the Pix charge.');
      } finally {
        if (!cancelled) setMercadoPagoLoading(false);
      }
    };

    void createMercadoPagoPix();
    return () => {
      cancelled = true;
    };
  }, [settings.subscriptionPrice, user.email, user.full_name]);

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client || !user.email || !onSubscriptionUpdate) return;

    const channel = client
      .channel(`subscription:${user.email}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bia_subscription_profiles',
          filter: `email=eq.${user.email.toLowerCase()}`
        },
        (payload) => {
          const subscription = payload.new as { status: string; subscription_expires_at?: string | null };
          if (subscription.status === 'active') onSubscriptionUpdate(subscription);
        }
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [onSubscriptionUpdate, user.email]);

  // Render High Resolution Scannable QR Code Canvas
  useEffect(() => {
    if (activeTab === 'checkout' && qrCanvasRef.current && activePixPayload) {
      QRCode.toCanvas(
        qrCanvasRef.current,
        activePixPayload,
        {
          width: 220,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#ffffff'
          },
          errorCorrectionLevel: 'M'
        },
        (error) => {
          if (error) console.error('Pix QRCode generation error:', error);
        }
      );
    }
  }, [activeTab, activePixPayload]);

  // Load User Payment History and Listen for Instant/Webhook/Live Approval
  useEffect(() => {
    loadPaymentHistory();

    const handleStorageChange = () => {
      checkLiveStatus();
      loadPaymentHistory();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('bia_users_changed', handleStorageChange);
    window.addEventListener('bia_pix_approved', handleStorageChange);

    // Auto-polling every 4 seconds for instant hands-free unlocking when Pix completes
    const interval = setInterval(() => {
      checkLiveStatus();
    }, 4000);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('bia_users_changed', handleStorageChange);
      window.removeEventListener('bia_pix_approved', handleStorageChange);
    };
  }, [user.id, user.email, settings.subscriptionPrice]);

  const checkLiveStatus = () => {
    try {
      const storedUsersRaw = localStorage.getItem('bia_users_database');
      if (storedUsersRaw) {
        const usersList: UserProfile[] = JSON.parse(storedUsersRaw);
        const currentUserInDb = usersList.find((u) => u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase());
        if (currentUserInDb && currentUserInDb.status === 'active') {
          // Check expiration
          if (!currentUserInDb.data_expiracao || new Date(currentUserInDb.data_expiracao) > new Date()) {
            localStorage.setItem('bia_current_user', JSON.stringify(currentUserInDb));
            onPaymentSuccess();
          }
        }
      }
    } catch (e) {}
  };

  const handleManualCheck = () => {
    setChecking(true);
    checkLiveStatus();
    setTimeout(() => {
      setChecking(false);
    }, 1200);
  };

  const loadPaymentHistory = () => {
    const rawPayments = localStorage.getItem('bia_pix_payments');
    let paymentsList: PixPaymentRecord[] = [];
    if (rawPayments) {
      try {
        paymentsList = JSON.parse(rawPayments);
      } catch (e) {}
    }

    const userPayments = paymentsList.filter(
      (p) => p.userId === user.id || p.userEmail.toLowerCase() === user.email.toLowerCase()
    );

    setPaymentHistory(userPayments.reverse());
  };

  const handleCopyPix = () => {
    navigator.clipboard.writeText(copyablePixValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  // Immediate VIP Token Validation (Instant Direct Approval via VIP Token or Trial Coupon)
  const handleValidateVipToken = () => {
    setVipTokenError('');
    const cleanToken = vipTokenInput.trim().toUpperCase();

    if (!cleanToken) {
      setVipTokenError('Por favor, informe o código do cupom ou token VIP.');
      return;
    }

    const validTokens = ['BIA-VIP-2025', '170493', 'ANDRE-CEO', 'BIA-VIP', 'ACTION2025'];
    const universalCoupons = ['BIA-5DIAS', 'DEGUSTA5', 'BRAZILIAN5', '5DIAS', 'TRIAL5', 'BIA5', 'DEGUSTACAO'];

    // Check in single-use coupons database
    let trialDays = 30; // default for VIP tokens
    let isTrialCoupon = false;

    let storedCoupons: TrialCoupon[] = [];
    try {
      const raw = localStorage.getItem('bia_trial_coupons');
      if (raw) storedCoupons = JSON.parse(raw);
    } catch (e) {}

    const foundCoupon = storedCoupons.find((c) => c.code.toUpperCase() === cleanToken);

    if (foundCoupon) {
      if (foundCoupon.isUsed) {
        setVipTokenError('Este cupom já foi utilizado anteriormente.');
        return;
      }
      trialDays = foundCoupon.days || 5;
      isTrialCoupon = true;
    } else if (universalCoupons.includes(cleanToken) || cleanToken.startsWith('BIA-TRIAL') || cleanToken.startsWith('BIA-')) {
      trialDays = 5;
      isTrialCoupon = true;
    } else if (!validTokens.includes(cleanToken)) {
      setVipTokenError('Código de liberação ou cupom inválido.');
      return;
    }

    // Approve user immediately
    const storedUsersRaw = localStorage.getItem('bia_users_database');
    let usersList: UserProfile[] = storedUsersRaw ? JSON.parse(storedUsersRaw) : [];

    const expiration = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString();
    const updatedUser: UserProfile = {
      ...user,
      status: 'active',
      email_verified: true,
      data_expiracao: expiration,
      cupom_usado: cleanToken,
      last_pix_tx_id: isTrialCoupon ? `CUPOM-${cleanToken}` : `VIP-TOKEN-${cleanToken}`
    };

    // Mark coupon as used if found
    if (foundCoupon) {
      try {
        const updatedCoupons = storedCoupons.map((c) => {
          if (c.code.toUpperCase() === cleanToken) {
            return {
              ...c,
              isUsed: true,
              usedBy: user.email,
              usedAt: new Date().toISOString()
            };
          }
          return c;
        });
        localStorage.setItem('bia_trial_coupons', JSON.stringify(updatedCoupons));
      } catch (e) {}
    }

    const idx = usersList.findIndex((u) => u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase());
    if (idx >= 0) usersList[idx] = updatedUser;
    else usersList.push(updatedUser);

    localStorage.setItem('bia_users_database', JSON.stringify(usersList));
    localStorage.setItem('bia_current_user', JSON.stringify(updatedUser));

    // Record approved entry
    const rawPayments = localStorage.getItem('bia_pix_payments');
    let allPayments: PixPaymentRecord[] = rawPayments ? JSON.parse(rawPayments) : [];
    allPayments.push({
      id: `PIX-PROMO-${Date.now().toString().slice(-6)}`,
      userId: user.id,
      userEmail: user.email,
      amount: isTrialCoupon ? 0.0 : (settings.subscriptionPrice || 10.0),
      paidAt: new Date().toISOString(),
      expiresAt: expiration,
      status: 'approved',
      method: 'pix',
      transactionId: isTrialCoupon ? `CUPOM-${cleanToken}` : `TOKEN-${cleanToken}`,
      planName: isTrialCoupon ? `Degustação Gratuita (${trialDays} Dias)` : 'Plano Mensal - Brazilian in Action (Liberação VIP)'
    });
    localStorage.setItem('bia_pix_payments', JSON.stringify(allPayments));

    window.dispatchEvent(new Event('bia_users_changed'));
    setShowVipTokenModal(false);
    onPaymentSuccess();
  };

  const isExpired = user.status === 'expired';

  return (
    <div className="min-h-[90vh] flex items-center justify-center p-3 sm:p-6 select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="glass-card max-w-xl w-full p-5 sm:p-7 rounded-3xl flex flex-col items-center text-center relative overflow-hidden shadow-2xl border border-white/15 backdrop-blur-xl bg-neutral-950/90"
      >
        {/* Glow Background Elements */}
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-white/5 border border-white/10 rounded-2xl mb-4 w-full">
          <button
            type="button"
            onClick={() => setActiveTab('checkout')}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'checkout'
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <QrCode size={14} />
            <span>Pagamento Pix Instantâneo</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <History size={14} />
            <span>Histórico de Recibos</span>
            {paymentHistory.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'history' ? 'bg-black text-amber-300' : 'bg-white/20 text-white'
              }`}>
                {paymentHistory.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'checkout' ? (
          <>
            {/* Top Floating Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider mb-3 shadow-sm">
              <Zap size={13} className="text-amber-400" />
              <span>{isExpired ? 'Renovação de Assinatura' : 'Assinatura Oficial via Pix'}</span>
            </div>

            {/* Header */}
            <div className="flex flex-col items-center mb-3">
              <BrazilianLogo size="md" className="mb-2" />
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Plano Mensal Brazilian in Action
              </h2>
              <p className="text-xs text-white/70 max-w-sm mt-1">
                {isExpired
                  ? 'Seu período de 30 dias expirou. Efetue seu Pix de R$ 10,00 para renovar o acesso completo!'
                  : 'Escaneie o QR Code ou use o Pix Copia e Cola no app do seu banco. A liberação ocorre automaticamente após o pagamento.'}
              </p>
            </div>

            {/* Price Tag Highlight */}
            <div className="my-1.5 p-3 px-6 rounded-2xl bg-neutral-900/90 border border-white/15 backdrop-blur-md flex items-baseline gap-1 shadow-inner">
              <span className="text-xs text-white/50 font-bold uppercase">Valor da Assinatura:</span>
              <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono ml-1">
                R$ {(settings.subscriptionPrice || 10.0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-xs text-white/50 font-bold">/mês</span>
            </div>

            {/* OFFICIAL PIX QR CODE & COPIA E COLA */}
            <div className="w-full bg-black/40 border border-white/15 rounded-3xl p-4 sm:p-5 my-2 flex flex-col items-center">
              <div className="text-[11px] font-bold text-white/80 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-400" />
                <span>Pague no aplicativo do seu banco:</span>
              </div>

              {/* QR Code Canvas */}
              <div className="p-3 bg-white rounded-2xl shadow-xl border-4 border-amber-400/80 mb-3 transition-transform hover:scale-102">
                {mercadoPagoPix?.qrCodeBase64 ? (
                  <img
                    src={mercadoPagoPix.qrCodeBase64.startsWith('data:') ? mercadoPagoPix.qrCodeBase64 : `data:image/png;base64,${mercadoPagoPix.qrCodeBase64}`}
                    alt="Mercado Pago Pix QR Code"
                    className="block h-[220px] w-[220px] rounded-lg"
                  />
                ) : (
                  <canvas ref={qrCanvasRef} className="block mx-auto rounded-lg" />
                )}
              </div>

              {/* Beneficiary and Key info */}
              <div className="w-full text-xs text-white/80 bg-neutral-900/80 p-2.5 rounded-xl border border-white/10 mb-3 text-left font-mono">
                <div className="flex justify-between border-b border-white/10 pb-1">
                  <span className="text-white/50">Chave Pix:</span>
                  <strong className="text-amber-300 select-all">{mercadoPagoPix ? 'Mercado Pago Pix' : activePixKey}</strong>
                </div>
                <div className="flex justify-between pt-1 text-[11px]">
                  <span className="text-white/50">Favorecido:</span>
                  <span className="text-white/90 truncate">{settings.beneficiaryName || 'Brazilian in Action Idiomas'}</span>
                </div>
              </div>

              {/* Pix Copia e Cola Code Box */}
              <div className="w-full flex items-center gap-2 bg-neutral-900 border border-white/20 rounded-xl p-2 mb-3">
                <input
                  type="text"
                  readOnly
                  value={copyablePixValue}
                  className="bg-transparent text-white font-mono text-[11px] outline-none w-full px-2 truncate selection:bg-amber-400 selection:text-black"
                />
                <button
                  type="button"
                  onClick={handleCopyPix}
                  className={`px-3.5 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    copied
                      ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/30'
                      : 'bg-amber-500 hover:bg-amber-400 text-black shadow-md shadow-amber-500/30 active:scale-95'
                  }`}
                  title="Copiar Código Pix"
                >
                  {copied ? (
                    <>
                      <Check size={14} />
                      <span>Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copiar Pix</span>
                    </>
                  )}
                </button>
              </div>

              {/* Instant Verification Button */}
              <div className="w-full flex flex-col sm:flex-row items-center gap-2">
                <button
                  type="button"
                  onClick={handleManualCheck}
                  disabled={checking}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95"
                >
                  {checking ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" />
                      <span>Verificando Pagamento no Banco...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle size={15} />
                      <span>Já Paguei! Liberar Acesso</span>
                    </>
                  )}
                </button>
              </div>

              <div className="text-[11px] text-white/50 mt-2.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>O sistema monitora pagamentos via Pix e libera seu login em tempo real.</span>
              </div>
              {mercadoPagoLoading && <p className="mt-2 text-[11px] text-amber-200/80">Creating your secure Mercado Pago charge...</p>}
              {mercadoPagoError && <p className="mt-2 text-[11px] text-rose-300">{mercadoPagoError} The fallback Pix key is still available.</p>}
            </div>

            {/* VIP Token Trigger link */}
            <div className="w-full pt-1 text-center">
              <button
                type="button"
                onClick={() => setShowVipTokenModal(true)}
                className="text-[11px] text-amber-300/80 hover:text-amber-200 underline cursor-pointer font-bold flex items-center gap-1 mx-auto"
              >
                <KeyRound size={12} />
                <span>Possui um Código VIP de Liberação do CEO?</span>
              </button>
            </div>
          </>
        ) : (
          /* PAYMENT HISTORY TAB */
          <div className="w-full text-left py-1">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                <Receipt size={16} className="text-amber-400" />
                <span>Histórico de Pagamentos Realizados</span>
              </h3>
              <span className="text-[11px] text-white/50">Via Pix</span>
            </div>

            {paymentHistory.length === 0 ? (
              <div className="p-8 text-center bg-white/5 rounded-2xl border border-white/10">
                <History size={32} className="mx-auto text-white/30 mb-2" />
                <div className="text-xs font-bold text-white/70">Nenhum pagamento registrado ainda</div>
                <div className="text-[11px] text-white/40 mt-1">
                  Seus comprovantes e recibos PIX aparecerão aqui assim que forem confirmados.
                </div>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[50vh] overflow-y-auto custom-scrollbar pr-1">
                {paymentHistory.map((item) => {
                  const paidDate = new Date(item.paidAt).toLocaleDateString('pt-BR');
                  const expDate = new Date(item.expiresAt).toLocaleDateString('pt-BR');
                  const isCurrentActive = new Date(item.expiresAt) > new Date();

                  return (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-500/30 transition-all flex flex-col gap-2 relative group"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-white">{item.planName}</span>
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                              item.status === 'approved' && isCurrentActive
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : item.status === 'pending'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-white/10 text-white/50'
                            }`}>
                              {item.status === 'approved' && isCurrentActive
                                ? 'Ativo / Vigente'
                                : item.status === 'pending'
                                ? 'Em Processamento'
                                : 'Finalizado'}
                            </span>
                          </div>
                          <div className="text-[11px] text-white/60 font-mono mt-0.5">
                            ID: {item.transactionId.slice(0, 22)}...
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-sm font-black text-emerald-400 font-mono">
                            R$ {item.amount.toFixed(2).replace('.', ',')}
                          </div>
                          <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 justify-end">
                            <CheckCircle size={10} />
                            <span>Pago via PIX</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[11px] text-white/60">
                        <div className="flex items-center gap-3">
                          <span>Pago em: <strong className="text-white/80">{paidDate}</strong></span>
                          <span>Válido até: <strong className="text-white/80">{expDate}</strong></span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedReceipt(item)}
                          className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <FileText size={12} />
                          <span>Ver Recibo</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Social Media Channels & Security / Logout Actions */}
        <div className="w-full mt-4 pt-3 border-t border-white/10 flex flex-col items-center gap-3">
          <SocialLinksBar size="sm" />

          <div className="flex items-center justify-between w-full text-[11px] text-white/50">
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-400" />
              <span>Processamento Seguro Brazilian in Action</span>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="text-white/60 hover:text-red-400 underline cursor-pointer"
            >
              Sair da Conta
            </button>
          </div>
        </div>
      </motion.div>

      {/* VIP TOKEN MODAL */}
      <AnimatePresence>
        {showVipTokenModal && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              className="bg-neutral-900 border border-amber-500/50 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative text-left"
            >
              <button
                type="button"
                onClick={() => setShowVipTokenModal(false)}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all cursor-pointer"
              >
                <X size={16} />
              </button>

              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                  <KeyRound size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Código VIP de Liberação</h3>
                  <p className="text-[11px] text-white/50">Acesso fornecido pelo CEO André Augusto</p>
                </div>
              </div>

              {vipTokenError && (
                <div className="p-2.5 mb-3 rounded-xl bg-red-600/80 border border-red-500 text-white text-xs font-semibold">
                  {vipTokenError}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-white/80 font-bold block mb-1">
                    Digite o Código de Liberação:
                  </label>
                  <input
                    type="text"
                    placeholder="BIA-VIP-..."
                    value={vipTokenInput}
                    onChange={(e) => setVipTokenInput(e.target.value.toUpperCase())}
                    className="w-full bg-black/60 border border-amber-400/50 focus:border-amber-400 rounded-xl px-3 py-2.5 text-sm text-white font-mono uppercase tracking-wider outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleValidateVipToken}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-amber-500/20 active:scale-95"
                >
                  Validar Código & Desbloquear
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RECEIPT / COMPROVANTE MODAL */}
      <AnimatePresence>
        {selectedReceipt && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              className="bg-neutral-900 border border-amber-500/40 rounded-3xl p-6 max-w-md w-full shadow-2xl relative text-left"
            >
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all cursor-pointer"
              >
                <X size={16} />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-neutral-950 border border-white/10 flex items-center justify-center">
                  <BrazilianLogo size="xs" variant="monogram" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Comprovante de Assinatura Pix</h3>
                  <p className="text-[11px] text-white/50">Brazilian in Action Idiomas</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2.5 text-xs text-white/80 font-mono mb-4">
                <div className="flex justify-between border-b border-white/5 pb-1.5">
                  <span className="text-white/50">Status:</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle size={12} /> {selectedReceipt.status === 'approved' ? 'APROVADO & CONFIRMADO' : 'EM PROCESSAMENTO'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1.5">
                  <span className="text-white/50">Transação:</span>
                  <span className="text-white font-semibold truncate max-w-[200px]">{selectedReceipt.transactionId}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1.5">
                  <span className="text-white/50">Aluno:</span>
                  <span className="text-white font-semibold">{user.full_name || selectedReceipt.userEmail}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1.5">
                  <span className="text-white/50">E-mail:</span>
                  <span className="text-white font-semibold">{selectedReceipt.userEmail}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1.5">
                  <span className="text-white/50">Valor:</span>
                  <span className="text-emerald-400 font-black">R$ {selectedReceipt.amount.toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1.5">
                  <span className="text-white/50">Data do Pagamento:</span>
                  <span className="text-white">{new Date(selectedReceipt.paidAt).toLocaleDateString('pt-BR')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Válido Até:</span>
                  <span className="text-white">{new Date(selectedReceipt.expiresAt).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <FileText size={14} />
                  <span>Imprimir Comprovante</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedReceipt(null)}
                  className="py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-xl text-xs transition-all cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
