import React, { useState, useEffect } from 'react';
import { UserProfile, GatewaySettings, StudentPermissions, GlobalAppConfig, ClassItem, ExpenseItem, TrialCoupon, PixPaymentRecord } from '../types';
import { 
  getAuthorizedCeoEmails, 
  addAuthorizedCeoEmail, 
  removeAuthorizedCeoEmail, 
  isValidEmailFormat,
  isVerifiedCeoEmail
} from '../utils/security';
import { 
  Users, 
  Settings as SettingsIcon, 
  CreditCard, 
  Globe, 
  Search, 
  Check, 
  X, 
  Trash2, 
  ShieldCheck, 
  Link, 
  Copy, 
  Zap, 
  RefreshCw, 
  Clock, 
  Calendar,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  BookOpen,
  Presentation,
  HelpCircle,
  Sparkles,
  Mic,
  Languages,
  Music,
  DollarSign,
  TrendingUp,
  FileText,
  Send,
  Share2,
  ArrowUp,
  ArrowDown,
  LayoutGrid,
  Radio,
  GraduationCap,
  Video,
  Home,
  LayoutDashboard,
  Gift,
  Plus,
  MessageCircle,
  Ticket,
  Instagram,
  KeyRound,
  ShieldAlert,
  Image as ImageIcon,
  CheckCircle,
  Eye,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  UserCheck,
  UserX,
  Clock3,
  Layers
} from 'lucide-react';
import { BrazilianLogo } from './BrazilianLogo';
import { deleteExpiredBrazilianFriendMessages, getSupabaseClient, getSupabaseConfig } from '../utils/supabaseClient';

interface AdminSettingsProps {
  accentColor?: string;
  classes?: ClassItem[];
  expenses?: ExpenseItem[];
  onRefreshUsers?: () => void;
  currentUser?: UserProfile | null;
}

const ALL_STUDENT_APPS = [
  { id: 'brazilianfriends', label: 'Brazilian Friends', icon: Users, desc: 'Chat privado e presença online entre estudantes' },
  { id: 'stories', label: 'Brazilian Post', icon: Instagram, desc: 'Gravação de stories para o Instagram com teleprompter e mural de destaques' },
  { id: 'practice', label: 'Brazilian Practice', icon: Globe, desc: 'Ambientes ao vivo de conversação, imersão e prática livre' },
  { id: 'readclub', label: 'Read Club', icon: BookOpen, desc: 'Biblioteca imersiva e histórias com áudio' },
  { id: 'board', label: 'Blackboard', icon: Presentation, desc: 'Lousa digital interativa de estudos' },
  { id: 'quiz', label: 'Brazilian Quiz', icon: HelpCircle, desc: 'Desafios de vocabulário e gramática' },
  { id: 'biacompare', label: 'BIA Compare', icon: Sparkles, desc: 'Comparador de pronúncia e frases' },
  { id: 'conversation', label: 'Conversação IA', icon: Mic, desc: 'Diálogos dinâmicos com a inteligência artificial' },
  { id: 'tradutor', label: 'Tradutor Cultural', icon: Languages, desc: 'Tradução com contexto de gírias e expressões' },
  { id: 'youtube', label: 'Brazilian Music', icon: Music, desc: 'Músicas e vídeos educativos com letras' }
];

const ALL_ADMIN_APPS = [
  { id: 'home', label: 'Home', icon: Home, desc: 'Grade semanal de horários e aulas' },
  { id: 'work', label: 'Work', icon: LayoutGrid, desc: 'Resumo do dia e lousa de horários' },
  { id: 'stories', label: 'Brazilian Post', icon: Instagram, desc: 'Gestão e moderação de stories e posts gravados pelos alunos' },
  { id: 'practice', label: 'Brazilian Practice', icon: Globe, desc: 'Ambientes de conversação e imersão ao vivo' },
  { id: 'dashboard', label: 'Controle Financeiro', icon: LayoutDashboard, desc: 'Cálculo de lucros, alunos e despesas' },
  { id: 'admin_settings', label: 'Painel do CEO', icon: Users, desc: 'Gestão geral de alunos, gateway e finanças' },
  { id: 'readclub', label: 'Read Club', icon: BookOpen, desc: 'Biblioteca completa de leitura' },
  { id: 'board', label: 'Brazilian Board', icon: Presentation, desc: 'Lousa de anotações e desenhos' },
  { id: 'streamstudio', label: 'Brazilian LIVE', icon: Radio, desc: 'Estúdio de transmissão com overlays' },
  { id: 'classroom', label: 'Google Classroom', icon: GraduationCap, desc: 'Integração de turmas Google' },
  { id: 'meet', label: 'Google Meet', icon: Video, desc: 'Salas virtuais de videoconferência' },
  { id: 'quiz', label: 'Brazilian Quiz', icon: HelpCircle, desc: 'Testes interativos e quizzes' },
  { id: 'biacompare', label: 'BIA Compare', icon: Sparkles, desc: 'Laboratório de comparação' },
  { id: 'conversation', label: 'Brazilian Conversation', icon: Mic, desc: 'Conversação com IA avançada' },
  { id: 'tradutor', label: 'Brazilian Tradutor', icon: Languages, desc: 'Dicionário e tradutor cultural' },
  { id: 'settings', label: 'Configurações', icon: SettingsIcon, desc: 'Personalização visual da plataforma' },
];

const generateRandomCouponCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let token = '';
  for (let i = 0; i < 4; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `BIA-TRIAL-${token}`;
};

export const AdminSettings: React.FC<AdminSettingsProps> = ({
  accentColor = '#f59e0b',
  classes = [],
  expenses = [],
  onRefreshUsers,
  currentUser
}) => {
  const [activeTab, setActiveTab] = useState<'students' | 'apps_order' | 'revenue' | 'gateway' | 'promotions' | 'pix_approvals' | 'ceo_security' | 'friends_cleanup'>('students');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [coupons, setCoupons] = useState<TrialCoupon[]>([]);
  const [pixPayments, setPixPayments] = useState<PixPaymentRecord[]>([]);
  const [authorizedCeos, setAuthorizedCeos] = useState<string[]>([]);
  const [newCeoEmailInput, setNewCeoEmailInput] = useState('');
  const [ceoMessage, setCeoMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [previewReceiptImage, setPreviewReceiptImage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedCouponId, setCopiedCouponId] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [expiredFriendMessages, setExpiredFriendMessages] = useState(0);
  const [isCleaningFriends, setIsCleaningFriends] = useState(false);
  const [friendsCleanupMessage, setFriendsCleanupMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const isMainCeo = Boolean(currentUser?.email && isVerifiedCeoEmail(currentUser.email));

  // Accordion state for grouping students by status
  const [openAccordions, setOpenAccordions] = useState<{
    active: boolean;
    pending: boolean;
    expired: boolean;
  }>({
    active: true,
    pending: true,
    expired: false
  });

  const toggleAccordion = (key: 'active' | 'pending' | 'expired') => {
    setOpenAccordions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Pix Approvals: Search, Filter and Collapsible Rows for 500+ scale
  const [expandedPixIds, setExpandedPixIds] = useState<Record<string, boolean>>({});
  const [pixStatusFilter, setPixStatusFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [pixSearchQuery, setPixSearchQuery] = useState('');

  const togglePixExpanded = (id: string) => {
    setExpandedPixIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // App Order and Global Availability Configuration
  const [appConfig, setAppConfig] = useState<GlobalAppConfig>({
    studentAppOrder: ['brazilianfriends', 'stories', 'practice', 'readclub', 'board', 'quiz', 'biacompare', 'conversation', 'tradutor', 'youtube'],
    adminAppOrder: ['home', 'work', 'brazilianfriends', 'stories', 'practice', 'dashboard', 'admin_settings', 'readclub', 'board', 'streamstudio', 'classroom', 'meet', 'quiz', 'biacompare', 'conversation', 'tradutor', 'settings'],
    studentGlobalEnabled: {
      brazilianfriends: true,
      stories: true,
      practice: true,
      readclub: true,
      board: true,
      quiz: true,
      biacompare: true,
      conversation: true,
      tradutor: true,
      youtube: true
    }
  });

  // Gateway Settings State
  const [gatewaySettings, setGatewaySettings] = useState<GatewaySettings>({
    subscriptionPrice: 10.00,
    provider: 'abatepay',
    apiKey: '',
    webhookSecret: '',
    pixKey: 'brazilianinaction@gmail.com',
    pixKeyType: 'email',
    beneficiaryName: 'Brazilian in Action Idiomas',
    city: 'São Paulo'
  });
  const [supabasePublicConfig, setSupabasePublicConfig] = useState(() => getSupabaseConfig());
  const [supabaseConfigSaved, setSupabaseConfigSaved] = useState(false);

  // Receipt Modal in Revenue Tab
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [selectedReceiptType, setSelectedReceiptType] = useState<'individual' | 'turma' | 'bia' | null>(null);

  // Load Users and Settings from LocalStorage/Cloud
  useEffect(() => {
    loadData();

    const handleDataChange = () => {
      loadData();
    };

    window.addEventListener('storage', handleDataChange);
    window.addEventListener('bia_users_changed', handleDataChange);
    return () => {
      window.removeEventListener('storage', handleDataChange);
      window.removeEventListener('bia_users_changed', handleDataChange);
    };
  }, []);

  useEffect(() => {
    if (!isMainCeo) return;

    const loadExpiredFriendMessages = async () => {
      const client = getSupabaseClient();
      if (!client) return;
      const threshold = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
      const { count } = await client
        .from('brazilian_friends_messages')
        .select('id', { count: 'exact', head: true })
        .lte('created_at', threshold);
      setExpiredFriendMessages(count || 0);
    };

    void loadExpiredFriendMessages();
  }, [isMainCeo]);

  const handleCleanupExpiredFriendMessages = async () => {
    if (!isMainCeo || !window.confirm('Apagar definitivamente todas as mensagens do Brazilian Friends que já venceram?')) return;

    setIsCleaningFriends(true);
    setFriendsCleanupMessage(null);
    const result = await deleteExpiredBrazilianFriendMessages();
    setIsCleaningFriends(false);
    setExpiredFriendMessages(0);
    setFriendsCleanupMessage(result.ok
      ? { text: `${result.deleted} mensagem(ns) vencida(s) apagada(s) do Supabase.`, type: 'success' }
      : { text: 'Não foi possível apagar as mensagens vencidas.', type: 'error' });
  };

  const loadData = () => {
    const storedUsers = localStorage.getItem('bia_users_database');
    if (storedUsers) {
      try {
        setUsers(JSON.parse(storedUsers));
      } catch (e) {}
    }

    const storedPayments = localStorage.getItem('bia_pix_payments');
    if (storedPayments) {
      try {
        setPixPayments(JSON.parse(storedPayments));
      } catch (e) {}
    }

    setAuthorizedCeos(getAuthorizedCeoEmails());

    const storedCoupons = localStorage.getItem('bia_trial_coupons');
    if (storedCoupons) {
      try {
        setCoupons(JSON.parse(storedCoupons));
      } catch (e) {}
    } else {
      // Seed default dynamic single-use coupon
      const initialCoupon: TrialCoupon = {
        id: 'coupon_init_1',
        code: generateRandomCouponCode(),
        days: 5,
        createdAt: new Date().toISOString(),
        isUsed: false,
        notes: 'Cupom de 5 Dias de Teste Gratuito'
      };
      setCoupons([initialCoupon]);
      localStorage.setItem('bia_trial_coupons', JSON.stringify([initialCoupon]));
    }

    const savedGateway = localStorage.getItem('bia_gateway_settings');
    if (savedGateway) {
      try {
        setGatewaySettings(JSON.parse(savedGateway));
      } catch (e) {}
    }

    const savedConfig = localStorage.getItem('bia_global_app_config');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig) as GlobalAppConfig;
        setAppConfig({
          ...parsed,
          studentAppOrder: parsed.studentAppOrder.includes('brazilianfriends')
            ? parsed.studentAppOrder
            : ['brazilianfriends', ...parsed.studentAppOrder],
          adminAppOrder: parsed.adminAppOrder.includes('work')
            ? parsed.adminAppOrder
            : ['work', ...parsed.adminAppOrder],
          studentGlobalEnabled: {
            brazilianfriends: true,
            ...parsed.studentGlobalEnabled
          }
        });
      } catch (e) {}
    }
  };

  // Pix Payment Approval by CEO
  const handleApprovePixPayment = (paymentId: string) => {
    const rawPayments = localStorage.getItem('bia_pix_payments');
    let paymentsList: PixPaymentRecord[] = rawPayments ? JSON.parse(rawPayments) : [];

    const payment = paymentsList.find(p => p.id === paymentId);
    if (!payment) return;

    // 1. Update payment status to approved and set expiration to +30 days
    const expiration = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    payment.status = 'approved';
    payment.expiresAt = expiration;

    // 2. Update user status in database
    const storedUsersRaw = localStorage.getItem('bia_users_database');
    let usersList: UserProfile[] = storedUsersRaw ? JSON.parse(storedUsersRaw) : [];

    const userIndex = usersList.findIndex(u => u.id === payment.userId || u.email.toLowerCase() === payment.userEmail.toLowerCase());
    if (userIndex >= 0) {
      usersList[userIndex].status = 'active';
      usersList[userIndex].data_expiracao = expiration;
      usersList[userIndex].last_pix_tx_id = payment.transactionId;
    }

    localStorage.setItem('bia_pix_payments', JSON.stringify(paymentsList));
    localStorage.setItem('bia_users_database', JSON.stringify(usersList));

    // Also update current active session if it's the current user
    try {
      const currentRaw = localStorage.getItem('bia_current_user');
      if (currentRaw) {
        const curr = JSON.parse(currentRaw);
        if (curr.id === payment.userId || curr.email.toLowerCase() === payment.userEmail.toLowerCase()) {
          curr.status = 'active';
          curr.data_expiracao = expiration;
          localStorage.setItem('bia_current_user', JSON.stringify(curr));
        }
      }
    } catch (e) {}

    window.dispatchEvent(new Event('bia_users_changed'));
    window.dispatchEvent(new Event('bia_pix_approved'));
    loadData();
    if (onRefreshUsers) onRefreshUsers();
  };

  // Reject / Invalidate Pix Payment
  const handleRejectPixPayment = (paymentId: string) => {
    const rawPayments = localStorage.getItem('bia_pix_payments');
    let paymentsList: PixPaymentRecord[] = rawPayments ? JSON.parse(rawPayments) : [];

    const filtered = paymentsList.filter(p => p.id !== paymentId);
    localStorage.setItem('bia_pix_payments', JSON.stringify(filtered));

    window.dispatchEvent(new Event('bia_users_changed'));
    loadData();
  };

  // Add Authorized CEO Email
  const handleAddCeoEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCeoMessage(null);

    const clean = newCeoEmailInput.trim().toLowerCase();
    if (!isValidEmailFormat(clean)) {
      setCeoMessage({ text: 'Por favor, informe um endereço de e-mail válido.', type: 'error' });
      return;
    }

    const added = addAuthorizedCeoEmail(clean);
    if (added) {
      setAuthorizedCeos(getAuthorizedCeoEmails());
      setNewCeoEmailInput('');
      setCeoMessage({ text: `E-mail ${clean} adicionado à lista de CEOs autorizados com sucesso!`, type: 'success' });
    } else {
      setCeoMessage({ text: 'Este e-mail já consta na lista de CEOs autorizados.', type: 'error' });
    }
  };

  // Remove Authorized CEO Email
  const handleRemoveCeoEmailAction = (emailToRemove: string) => {
    const removed = removeAuthorizedCeoEmail(emailToRemove);
    if (removed) {
      setAuthorizedCeos(getAuthorizedCeoEmails());
      setCeoMessage({ text: `E-mail ${emailToRemove} removido com sucesso.`, type: 'success' });
    } else {
      setCeoMessage({ text: 'A conta principal do CEO André Augusto não pode ser removida.', type: 'error' });
    }
  };

  const handleUpdateGatewayField = (field: keyof GatewaySettings, value: any) => {
    const updated = { ...gatewaySettings, [field]: value };
    setGatewaySettings(updated);
    try {
      localStorage.setItem('bia_gateway_settings', JSON.stringify(updated));
      window.dispatchEvent(new Event('bia_gateway_settings_changed'));
    } catch (e) {
      console.error('Error auto-saving gateway settings:', e);
    }
  };

  const handleSaveGateway = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem('bia_gateway_settings', JSON.stringify(gatewaySettings));
      window.dispatchEvent(new Event('bia_gateway_settings_changed'));
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (e) {
      console.error('Error saving gateway settings:', e);
    }
  };

  const handleSaveSupabaseConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = {
      url: supabasePublicConfig.url.trim().replace(/\/$/, ''),
      anonKey: supabasePublicConfig.anonKey.trim()
    };
    localStorage.setItem('bia_supabase_public_config', JSON.stringify(normalized));
    setSupabasePublicConfig(normalized);
    setSupabaseConfigSaved(true);
    window.dispatchEvent(new Event('bia_supabase_config_changed'));
    setTimeout(() => setSupabaseConfigSaved(false), 2500);
  };

  // Create a single unique single-use coupon
  const handleCreateSingleCoupon = (days: number = 5) => {
    const newCoupon: TrialCoupon = {
      id: `coupon_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      code: generateRandomCouponCode(),
      days,
      createdAt: new Date().toISOString(),
      isUsed: false,
      notes: `Acesso Individual de ${days} Dias`
    };
    const nextCoupons = [newCoupon, ...coupons];
    setCoupons(nextCoupons);
    localStorage.setItem('bia_trial_coupons', JSON.stringify(nextCoupons));
  };

  // Create a batch of unique coupons
  const handleCreateBatchCoupons = (count: number = 5, days: number = 5) => {
    const newCoupons: TrialCoupon[] = [];
    for (let i = 0; i < count; i++) {
      newCoupons.push({
        id: `coupon_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
        code: generateRandomCouponCode(),
        days,
        createdAt: new Date().toISOString(),
        isUsed: false,
        notes: `Lote promocional de ${days} dias`
      });
    }
    const next = [...newCoupons, ...coupons];
    setCoupons(next);
    localStorage.setItem('bia_trial_coupons', JSON.stringify(next));
  };

  // Delete a coupon
  const handleDeleteCoupon = (id: string) => {
    const next = coupons.filter((c) => c.id !== id);
    setCoupons(next);
    localStorage.setItem('bia_trial_coupons', JSON.stringify(next));
  };

  // Share Coupon Link directly to WhatsApp
  const handleShareCouponWhatsApp = (coupon: TrialCoupon) => {
    const origin = window.location.origin + window.location.pathname;
    const link = `${origin}?promo=${coupon.code}`;
    const message = `Olá! Aqui está seu link exclusivo de *${coupon.days} dias gratuitos* na plataforma Brazilian in Action:\n\n${link}\n\nSeu código promocional único: *${coupon.code}*\n(Código de uso pessoal e individual). Aproveite!`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
  };

  // Copy Coupon Link
  const handleCopyCouponLink = (coupon: TrialCoupon) => {
    const origin = window.location.origin + window.location.pathname;
    const link = `${origin}?promo=${coupon.code}`;
    navigator.clipboard.writeText(link);
    setCopiedCouponId(coupon.id);
    setTimeout(() => setCopiedCouponId(null), 2000);
  };

  // Feature Flipping toggle for an individual student
  const handleTogglePermission = (userId: string, permissionKey: keyof StudentPermissions) => {
    const updatedUsers = users.map((user) => {
      if (user.id === userId) {
        const currentPerms: StudentPermissions = user.permissions || {
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
        };
        return {
          ...user,
          permissions: {
            ...currentPerms,
            [permissionKey]: !currentPerms[permissionKey]
          }
        };
      }
      return user;
    });

    setUsers(updatedUsers);
    localStorage.setItem('bia_users_database', JSON.stringify(updatedUsers));
  };

  // Change user status (active / expired / pending)
  const handleChangeStatus = (userId: string, newStatus: UserProfile['status']) => {
    const updatedUsers = users.map((user) => {
      if (user.id === userId) {
        let expiration = user.data_expiracao;
        if (newStatus === 'active' && !expiration) {
          expiration = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        }
        return { ...user, status: newStatus, data_expiracao: expiration };
      }
      return user;
    });

    setUsers(updatedUsers);
    localStorage.setItem('bia_users_database', JSON.stringify(updatedUsers));
  };

  // Add trial / subscription days directly to a student
  const handleAddDaysToStudent = (userId: string, daysToAdd: number) => {
    const updatedUsers = users.map((user) => {
      if (user.id === userId) {
        const currentExp = user.data_expiracao ? new Date(user.data_expiracao).getTime() : Date.now();
        const baseTime = currentExp > Date.now() ? currentExp : Date.now();
        const nextExp = new Date(baseTime + daysToAdd * 24 * 60 * 60 * 1000).toISOString();
        return {
          ...user,
          status: 'active' as const,
          data_expiracao: nextExp
        };
      }
      return user;
    });

    setUsers(updatedUsers);
    localStorage.setItem('bia_users_database', JSON.stringify(updatedUsers));
  };

  // Delete user
  const handleDeleteUser = (userId: string) => {
    if (window.confirm('Tem certeza de que deseja remover este aluno da base de dados?')) {
      const filtered = users.filter((u) => u.id !== userId);
      setUsers(filtered);
      localStorage.setItem('bia_users_database', JSON.stringify(filtered));
    }
  };

  const handleSaveAppConfig = (newConfig: GlobalAppConfig) => {
    setAppConfig(newConfig);
    localStorage.setItem('bia_global_app_config', JSON.stringify(newConfig));
    window.dispatchEvent(new Event('bia_app_config_changed'));
  };

  // Reorder Student Apps by Up/Down or Direct Position
  const handleMoveStudentApp = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...appConfig.studentAppOrder];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newOrder.length) return;
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIdx];
    newOrder[targetIdx] = temp;
    handleSaveAppConfig({ ...appConfig, studentAppOrder: newOrder });
  };

  const handleSetStudentAppPosition = (appId: string, newPosition: number) => {
    const currentIdx = appConfig.studentAppOrder.indexOf(appId);
    if (currentIdx === -1 || newPosition < 0 || newPosition >= appConfig.studentAppOrder.length) return;
    const newOrder = [...appConfig.studentAppOrder];
    newOrder.splice(currentIdx, 1);
    newOrder.splice(newPosition, 0, appId);
    handleSaveAppConfig({ ...appConfig, studentAppOrder: newOrder });
  };

  // Reorder Admin Apps by Up/Down or Direct Position
  const handleMoveAdminApp = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...appConfig.adminAppOrder];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newOrder.length) return;
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIdx];
    newOrder[targetIdx] = temp;
    handleSaveAppConfig({ ...appConfig, adminAppOrder: newOrder });
  };

  const handleSetAdminAppPosition = (appId: string, newPosition: number) => {
    const currentIdx = appConfig.adminAppOrder.indexOf(appId);
    if (currentIdx === -1 || newPosition < 0 || newPosition >= appConfig.adminAppOrder.length) return;
    const newOrder = [...appConfig.adminAppOrder];
    newOrder.splice(currentIdx, 1);
    newOrder.splice(newPosition, 0, appId);
    handleSaveAppConfig({ ...appConfig, adminAppOrder: newOrder });
  };

  // Toggle Global Availability for Students
  const handleToggleGlobalStudentApp = (appId: string) => {
    const newEnabled = {
      ...appConfig.studentGlobalEnabled,
      [appId]: !appConfig.studentGlobalEnabled[appId]
    };
    handleSaveAppConfig({ ...appConfig, studentGlobalEnabled: newEnabled });
  };

  // Reset to Default Order
  const handleResetAppOrder = () => {
    const defaultConfig: GlobalAppConfig = {
      studentAppOrder: ['brazilianfriends', 'readclub', 'board', 'quiz', 'biacompare', 'conversation', 'tradutor', 'youtube'],
      adminAppOrder: ['home', 'work', 'brazilianfriends', 'dashboard', 'admin_settings', 'readclub', 'board', 'streamstudio', 'classroom', 'meet', 'quiz', 'biacompare', 'conversation', 'tradutor', 'settings'],
      studentGlobalEnabled: {
        brazilianfriends: true,
        readclub: true,
        board: true,
        quiz: true,
        biacompare: true,
        conversation: true,
        tradutor: true,
        youtube: true
      }
    };
    handleSaveAppConfig(defaultConfig);
  };

  const filteredUsers = users.filter((u) => {
    const matchSearch =
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.full_name && u.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (u.ip_city && u.ip_city.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchSearch;
  });

  const activeStudentsCount = users.filter((u) => u.role === 'student' && u.status === 'active').length;
  const pendingStudentsCount = users.filter((u) => u.role === 'student' && u.status === 'pending').length;
  const expiredStudentsCount = users.filter((u) => u.role === 'student' && u.status === 'expired').length;

  // Strict segregation: coupon/trial students never count as paid revenue.
  const payingActiveStudents = users.filter((u) => u.role === 'student' && u.status === 'active' && !u.cupom_usado);
  const couponActiveStudents = users.filter((u) => u.role === 'student' && u.status === 'active' && !!u.cupom_usado);
  const payingActiveStudentsCount = payingActiveStudents.length;
  const couponActiveStudentsCount = couponActiveStudents.length;

  // REVENUE CALCULATIONS
  const getClassMonthlyValue = (c: ClassItem) => {
    if (typeof c.valor === 'number' && c.valor > 0) return c.valor;
    if (c.tipo === 'turma') return 300;
    if (c.tipo === 'bia') return 200;
    const activeDays = c.d.length;
    return activeDays * 18 * 4;
  };

  let monthlyAulasGross = 0;
  let weeklyAulasGross = 0;
  let countTurma = 0;
  let countIndividual = 0;
  let countBia = 0;

  classes.forEach((c) => {
    const mVal = getClassMonthlyValue(c);
    monthlyAulasGross += mVal;
    weeklyAulasGross += mVal / 4;
    if (c.tipo === 'turma') countTurma++;
    else if (c.tipo === 'bia') countBia++;
    else countIndividual++;
  });

  // SaaS Subscriptions Gross (Pure SaaS calculation based on real, PAID R$ 10 plan students only)
  const currentSubscriptionPrice = gatewaySettings.subscriptionPrice || 10;
  const saasMonthlyGross = payingActiveStudentsCount * currentSubscriptionPrice;
  const saasTotalReceived = pixPayments
    .filter((p) => p.status === 'approved')
    .reduce((acc, p) => acc + (typeof p.amount === 'number' ? p.amount : currentSubscriptionPrice), 0);
  const saasWeeklyGross = saasMonthlyGross / 4;
  const approvedPaymentsList = pixPayments.filter((p) => p.status === 'approved');

  const totalMonthlyRevenue = monthlyAulasGross + saasMonthlyGross;
  const totalWeeklyRevenue = weeklyAulasGross + saasWeeklyGross;

  let totalExpenses = 0;
  expenses.forEach((e) => {
    totalExpenses += e.v || 0;
  });

  const totalMonthlyProfit = totalMonthlyRevenue - totalExpenses;
  const totalWeeklyProfit = totalWeeklyRevenue - (totalExpenses / 4);

  // Helper for receipt written text (por extenso)
  const valorPorExtenso = (valor: number): string => {
    if (valor === 0) return 'zero reais';
    const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
    const dezAonove = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
    const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
    const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
    const inteiros = Math.floor(valor);
    const converteGrupo = (n: number): string => {
      if (n === 0) return '';
      if (n === 100) return 'cem';
      let res = '';
      const c = Math.floor(n / 100);
      const d = Math.floor((n % 100) / 10);
      const u = n % 10;
      if (c > 0) res += centenas[c];
      if (d === 1) {
        if (res) res += ' e ';
        res += dezAonove[u];
      } else {
        if (d > 1) {
          if (res) res += ' e ';
          res += dezenas[d];
        }
        if (u > 0) {
          if (res) res += ' e ';
          res += unidades[u];
        }
      }
      return res;
    };
    const grupoMil = Math.floor(inteiros / 1000);
    const grupoSimples = inteiros % 1000;
    let resultado = '';
    if (grupoMil > 0) {
      if (grupoMil === 1) resultado += 'mil';
      else resultado += converteGrupo(grupoMil) + ' mil';
      if (grupoSimples > 0) resultado += ' e ';
    }
    if (grupoSimples > 0 || inteiros === 0) {
      resultado += converteGrupo(grupoSimples);
    }
    resultado += inteiros === 1 ? ' real' : ' reais';
    return resultado;
  };

  const getReceiptData = (tipo: 'individual' | 'turma' | 'bia') => {
    const hoje = new Date();
    const dataFormatada = hoje.toLocaleDateString('pt-BR');
    let totalVal = 0;
    let numAulas = 0;
    let desc = '';

    if (tipo === 'bia') {
      totalVal = gatewaySettings.subscriptionPrice || 20;
      desc = 'Referente à taxa de assinatura mensal do aplicativo Brazilian in Action (Acesso Completo)';
      return {
        valor: totalVal,
        extenso: valorPorExtenso(totalVal),
        data: dataFormatada,
        descricao: desc,
        empresa: 'BRAZILIAN IN ACTION IDIOMAS'
      };
    } else if (tipo === 'turma') {
      totalVal = classes.filter((c) => c.tipo === 'turma').reduce((acc, c) => acc + getClassMonthlyValue(c), 0);
      numAulas = countTurma;
      desc = `Referente a ${numAulas} turmas mensais You Become`;
    } else {
      totalVal = classes.filter((c) => c.tipo === 'individual' || !c.tipo).reduce((acc, c) => acc + getClassMonthlyValue(c), 0);
      numAulas = countIndividual;
      desc = `Referente a ${numAulas} alunos VIP individuais Seidmann Idiomas`;
    }

    return {
      valor: totalVal,
      extenso: valorPorExtenso(totalVal),
      data: dataFormatada,
      descricao: desc,
      empresa: tipo === 'turma' ? 'YOU BECOME IDIOMAS' : 'SEIDMANN IDIOMAS'
    };
  };

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-6 pb-28 select-none">
      {/* Top Header & Perfectly Aligned CEO Badge */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-red-500/20 border border-red-500/40 text-red-300 shadow-sm backdrop-blur-md">
              <ShieldCheck size={13} className="text-red-400 shrink-0" />
              <span>Painel do CEO André Augusto</span>
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Central de Gestão & Faturamento
            </h1>
          </div>
          <p className="text-xs text-white/60">
            Controle de alunos, faturamento semanal/mensal, ordem de apps e manutenção global.
          </p>
        </div>

        {/* Tab Navigation: Floating Individual Glassmorphism Pills (Wrap automatically so all 7 options are 100% visible) */}
        <nav aria-label="Abas de Administração" className="w-full">
          <div className="flex flex-wrap items-center gap-2">
            {/* 1. Alunos */}
            <button
              type="button"
              onClick={() => setActiveTab('students')}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer backdrop-blur-xl shadow-lg border active:scale-95 ${
                activeTab === 'students'
                  ? 'bg-amber-500 text-black border-amber-400 font-black shadow-amber-500/30'
                  : 'bg-neutral-900/80 hover:bg-neutral-800 text-white/80 hover:text-white border-white/15 hover:border-white/30'
              }`}
            >
              <Users size={14} className={activeTab === 'students' ? 'text-black' : 'text-amber-400'} />
              <span>Alunos ({users.length})</span>
            </button>
            
            {/* 2. Aprovações Pix */}
            <button
              type="button"
              onClick={() => setActiveTab('pix_approvals')}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer backdrop-blur-xl shadow-lg border active:scale-95 relative ${
                activeTab === 'pix_approvals'
                  ? 'bg-amber-500 text-black border-amber-400 font-black shadow-amber-500/30'
                  : 'bg-neutral-900/80 hover:bg-neutral-800 text-white/80 hover:text-white border-white/15 hover:border-white/30'
              }`}
            >
              <CheckCircle size={14} className={activeTab === 'pix_approvals' ? 'text-black' : 'text-emerald-400'} />
              <span>Aprovações Pix</span>
              {pixPayments.filter(p => p.status === 'pending').length > 0 && (
                <span className="px-1.5 py-0.5 bg-red-600 text-white text-[10px] font-black rounded-full shadow-sm animate-pulse">
                  {pixPayments.filter(p => p.status === 'pending').length}
                </span>
              )}
            </button>

            {/* 3. Ordem dos Apps */}
            <button
              type="button"
              onClick={() => setActiveTab('apps_order')}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer backdrop-blur-xl shadow-lg border active:scale-95 ${
                activeTab === 'apps_order'
                  ? 'bg-amber-500 text-black border-amber-400 font-black shadow-amber-500/30'
                  : 'bg-neutral-900/80 hover:bg-neutral-800 text-white/80 hover:text-white border-white/15 hover:border-white/30'
              }`}
            >
              <LayoutGrid size={14} className={activeTab === 'apps_order' ? 'text-black' : 'text-purple-400'} />
              <span>Ordem dos Apps</span>
            </button>

            {/* 4. Faturamento do App */}
            <button
              type="button"
              onClick={() => setActiveTab('revenue')}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer backdrop-blur-xl shadow-lg border active:scale-95 ${
                activeTab === 'revenue'
                  ? 'bg-amber-500 text-black border-amber-400 font-black shadow-amber-500/30'
                  : 'bg-neutral-900/80 hover:bg-neutral-800 text-white/80 hover:text-white border-white/15 hover:border-white/30'
              }`}
            >
              <TrendingUp size={14} className={activeTab === 'revenue' ? 'text-black' : 'text-blue-400'} />
              <span>Faturamento do App</span>
            </button>

            {/* 5. Pagamentos e Supabase */}
            <button
              type="button"
              onClick={() => setActiveTab('gateway')}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer backdrop-blur-xl shadow-lg border active:scale-95 ${
                activeTab === 'gateway'
                  ? 'bg-amber-500 text-black border-amber-400 font-black shadow-amber-500/30'
                  : 'bg-neutral-900/80 hover:bg-neutral-800 text-white/80 hover:text-white border-white/15 hover:border-white/30'
              }`}
            >
              <CreditCard size={14} className={activeTab === 'gateway' ? 'text-black' : 'text-cyan-400'} />
              <span>Pagamentos e Supabase</span>
            </button>

            {/* 6. Promoção Trial */}
            <button
              type="button"
              onClick={() => setActiveTab('promotions')}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer backdrop-blur-xl shadow-lg border active:scale-95 ${
                activeTab === 'promotions'
                  ? 'bg-amber-500 text-black border-amber-400 font-black shadow-amber-500/30'
                  : 'bg-neutral-900/80 hover:bg-neutral-800 text-white/80 hover:text-white border-white/15 hover:border-white/30'
              }`}
            >
              <Zap size={14} className={activeTab === 'promotions' ? 'text-black' : 'text-amber-400'} />
              <span>Promoção Trial</span>
            </button>

            {/* 7. Segurança CEO */}
            <button
              type="button"
              onClick={() => setActiveTab('ceo_security')}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer backdrop-blur-xl shadow-lg border active:scale-95 ${
                activeTab === 'ceo_security'
                  ? 'bg-red-600 text-white border-red-500 font-black shadow-red-950/50'
                  : 'bg-neutral-900/80 hover:bg-neutral-800 text-white/80 hover:text-white border-white/15 hover:border-white/30'
              }`}
            >
              <KeyRound size={14} className={activeTab === 'ceo_security' ? 'text-white' : 'text-red-400'} />
              <span>Segurança CEO</span>
            </button>

            {isMainCeo && (
              <button
                type="button"
                onClick={() => setActiveTab('friends_cleanup')}
                className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer backdrop-blur-xl shadow-lg border active:scale-95 ${
                  activeTab === 'friends_cleanup'
                    ? 'bg-red-600 text-white border-red-500 font-black shadow-red-950/50'
                    : 'bg-neutral-900/80 hover:bg-neutral-800 text-white/80 hover:text-white border-white/15 hover:border-white/30'
                }`}
              >
                <Trash2 size={14} className={activeTab === 'friends_cleanup' ? 'text-white' : 'text-red-400'} />
                <span>Limpeza Friends</span>
                {expiredFriendMessages > 0 && (
                  <span className="px-1.5 py-0.5 bg-red-600 text-white text-[10px] font-black rounded-full shadow-sm animate-pulse">
                    {expiredFriendMessages}
                  </span>
                )}
              </button>
            )}
          </div>
        </nav>
      </div>

      {/* TAB 1: GERENCIAMENTO DE ALUNOS & TELEMETRIA & ACCORDIONS */}
      {activeTab === 'students' && (
        <div className="space-y-6">
          {/* Summary Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="glass-card p-4 rounded-2xl border border-white/10">
              <span className="text-[11px] text-white/50 uppercase font-mono">Total Cadastrados</span>
              <div className="text-2xl font-black text-white mt-1">{users.length}</div>
            </div>
            <div className="glass-card p-4 rounded-2xl border border-emerald-500/30">
              <span className="text-[11px] text-emerald-400 uppercase font-mono">Ativos (Pagos)</span>
              <div className="text-2xl font-black text-emerald-400 mt-1">{activeStudentsCount}</div>
            </div>
            <div className="glass-card p-4 rounded-2xl border border-amber-500/30">
              <span className="text-[11px] text-amber-400 uppercase font-mono">Pendentes (Pix)</span>
              <div className="text-2xl font-black text-amber-400 mt-1">{pendingStudentsCount}</div>
            </div>
            <div className="glass-card p-4 rounded-2xl border border-red-500/30">
              <span className="text-[11px] text-red-400 uppercase font-mono">Expirados</span>
              <div className="text-2xl font-black text-red-400 mt-1">{expiredStudentsCount}</div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex items-center justify-between gap-3 bg-neutral-900 border border-white/15 p-2 px-3 rounded-2xl backdrop-blur-md">
            <div className="flex items-center gap-2 flex-1">
              <Search size={16} className="text-white/40" />
              <input
                type="text"
                placeholder="Buscar por e-mail, nome, estado ou cidade..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent text-white text-xs sm:text-sm outline-none w-full placeholder:text-white/30"
              />
            </div>
            <button
              onClick={loadData}
              className="p-1.5 hover:bg-white/10 rounded-xl text-white/60 hover:text-white transition-all cursor-pointer"
              title="Recarregar dados"
            >
              <RefreshCw size={15} />
            </button>
          </div>

          {/* Collapsible Accordion Sections for Students */}
          {(() => {
            const activeList = filteredUsers.filter((u) => u.status === 'active');
            const pendingList = filteredUsers.filter((u) => u.status === 'pending');
            const expiredList = filteredUsers.filter((u) => u.status === 'expired');

            const renderStudentCard = (student: UserProfile) => {
              const perms: StudentPermissions = student.permissions || {
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
              };

              return (
                <div
                  key={student.id}
                  className="glass-card p-3.5 sm:p-4 rounded-2xl border border-white/10 flex flex-col gap-3 transition-all hover:border-white/20 bg-neutral-900/60"
                >
                  {/* Header Row: Info & Telemetry */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center font-bold text-amber-300 text-sm shrink-0">
                        {student.full_name?.charAt(0).toUpperCase() || student.email.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <span className="text-xs sm:text-sm font-bold text-white truncate max-w-[200px] sm:max-w-none">
                            {student.full_name || student.email.split('@')[0]}
                          </span>
                          <span className="text-[10px] font-mono text-white/40 truncate">
                            ({student.email})
                          </span>
                          {student.role === 'admin' && (
                            <span className="px-2 py-0.2 rounded-full text-[9px] font-black uppercase bg-red-600/30 text-red-300 border border-red-500/40">
                              CEO / Admin
                            </span>
                          )}
                          {student.cupom_usado && (
                            <span className="px-2 py-0.2 rounded-full text-[9px] font-black uppercase bg-purple-600/25 text-purple-300 border border-purple-500/40">
                              Cupom Grátis
                            </span>
                          )}
                        </div>
                        {/* Telemetry (City/State/Country) */}
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] text-white/50 mt-0.5">
                          <div className="flex items-center gap-1">
                            <Globe size={11} className="text-blue-400" />
                            <span>{student.ip_city || 'São Paulo'}, {student.ip_region || 'SP'} ({student.ip_country || 'Brasil'})</span>
                          </div>
                          <span className="hidden sm:inline">•</span>
                          <div className="flex items-center gap-1 font-mono text-[10px]">
                            <Clock size={10} />
                            <span>
                              {student.data_expiracao
                                ? `Expira em: ${new Date(student.data_expiracao).toLocaleDateString('pt-BR')}`
                                : 'Sem expiração'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Status Selector & Actions */}
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 self-end sm:self-auto">
                      {/* Quick Day Extension Buttons for CEO */}
                      <button
                        type="button"
                        onClick={() => handleAddDaysToStudent(student.id, 5)}
                        className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                        title="Adicionar +5 Dias de Degustação Gratuita (Trial)"
                      >
                        <Gift size={12} />
                        <span>+5d Trial</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddDaysToStudent(student.id, 30)}
                        className="px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                        title="Renovar / Adicionar +30 Dias de Acesso"
                      >
                        <Plus size={12} />
                        <span>+30d</span>
                      </button>

                      <select
                        value={student.status}
                        onChange={(e) => handleChangeStatus(student.id, e.target.value as any)}
                        className={`text-xs font-bold rounded-xl px-2.5 py-1 outline-none border cursor-pointer ${
                          student.status === 'active'
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                            : student.status === 'pending'
                            ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                            : 'bg-red-500/20 border-red-500/40 text-red-300'
                        }`}
                      >
                        <option value="active" className="bg-neutral-900 text-emerald-400">Ativo (Pago)</option>
                        <option value="pending" className="bg-neutral-900 text-amber-400">Pendente (Pix)</option>
                        <option value="expired" className="bg-neutral-900 text-red-400">Expirado</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => handleDeleteUser(student.id)}
                        className="p-1.5 hover:bg-red-500/20 text-white/40 hover:text-red-400 rounded-xl transition-all cursor-pointer"
                        title="Remover Aluno"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Feature Flipping Toggles (Custom Tool Permissions for Student) */}
                  <div className="pt-2 border-t border-white/5 flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs">
                    <span className="text-[10px] uppercase font-mono text-white/40 mr-1 w-full sm:w-auto">
                      Permissões Individuais:
                    </span>

                    {/* Read Club Toggle */}
                    <button
                      type="button"
                      onClick={() => handleTogglePermission(student.id, 'readclub')}
                      className={`px-2.5 py-1 rounded-xl border text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        perms.readclub
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          : 'bg-white/5 border-white/10 text-white/40 line-through'
                      }`}
                    >
                      <BookOpen size={12} />
                      <span>Livros</span>
                      {perms.readclub ? <Check size={11} /> : <X size={11} />}
                    </button>

                    {/* Board Toggle */}
                    <button
                      type="button"
                      onClick={() => handleTogglePermission(student.id, 'board')}
                      className={`px-2.5 py-1 rounded-xl border text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        perms.board
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          : 'bg-white/5 border-white/10 text-white/40 line-through'
                      }`}
                    >
                      <Presentation size={12} />
                      <span>Blackboard</span>
                      {perms.board ? <Check size={11} /> : <X size={11} />}
                    </button>

                    {/* Quiz Toggle */}
                    <button
                      type="button"
                      onClick={() => handleTogglePermission(student.id, 'quiz')}
                      className={`px-2.5 py-1 rounded-xl border text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        perms.quiz
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          : 'bg-white/5 border-white/10 text-white/40 line-through'
                      }`}
                    >
                      <HelpCircle size={12} />
                      <span>Quiz</span>
                      {perms.quiz ? <Check size={11} /> : <X size={11} />}
                    </button>

                    {/* BIA Compare Toggle */}
                    <button
                      type="button"
                      onClick={() => handleTogglePermission(student.id, 'biacompare')}
                      className={`px-2.5 py-1 rounded-xl border text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        perms.biacompare
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          : 'bg-white/5 border-white/10 text-white/40 line-through'
                      }`}
                    >
                      <Sparkles size={12} />
                      <span>Compare</span>
                      {perms.biacompare ? <Check size={11} /> : <X size={11} />}
                    </button>

                    {/* Conversation Toggle */}
                    <button
                      type="button"
                      onClick={() => handleTogglePermission(student.id, 'conversation')}
                      className={`px-2.5 py-1 rounded-xl border text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        perms.conversation
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          : 'bg-white/5 border-white/10 text-white/40 line-through'
                      }`}
                    >
                      <Mic size={12} />
                      <span>Conversação</span>
                      {perms.conversation ? <Check size={11} /> : <X size={11} />}
                    </button>

                    {/* Tradutor Toggle */}
                    <button
                      type="button"
                      onClick={() => handleTogglePermission(student.id, 'tradutor')}
                      className={`px-2.5 py-1 rounded-xl border text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        perms.tradutor
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          : 'bg-white/5 border-white/10 text-white/40 line-through'
                      }`}
                    >
                      <Languages size={12} />
                      <span>Tradutor</span>
                      {perms.tradutor ? <Check size={11} /> : <X size={11} />}
                    </button>

                    {/* YouTube / Music Toggle */}
                    <button
                      type="button"
                      onClick={() => handleTogglePermission(student.id, 'youtube')}
                      className={`px-2.5 py-1 rounded-xl border text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        perms.youtube
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          : 'bg-white/5 border-white/10 text-white/40 line-through'
                      }`}
                    >
                      <Music size={12} />
                      <span>Músicas</span>
                      {perms.youtube ? <Check size={11} /> : <X size={11} />}
                    </button>

                    {/* Brazilian Post Toggle */}
                    <button
                      type="button"
                      onClick={() => handleTogglePermission(student.id, 'stories')}
                      className={`px-2.5 py-1 rounded-xl border text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        perms.stories
                          ? 'bg-pink-500/15 border-pink-500/30 text-pink-300'
                          : 'bg-white/5 border-white/10 text-white/40 line-through'
                      }`}
                    >
                      <Instagram size={12} />
                      <span>Post (Stories)</span>
                      {perms.stories ? <Check size={11} /> : <X size={11} />}
                    </button>

                    {/* Brazilian Practice Toggle */}
                    <button
                      type="button"
                      onClick={() => handleTogglePermission(student.id, 'practice')}
                      className={`px-2.5 py-1 rounded-xl border text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        perms.practice
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          : 'bg-white/5 border-white/10 text-white/40 line-through'
                      }`}
                    >
                      <Globe size={12} />
                      <span>Practice</span>
                      {perms.practice ? <Check size={11} /> : <X size={11} />}
                    </button>
                  </div>
                </div>
              );
            };

            if (filteredUsers.length === 0) {
              return (
                <div className="glass-card p-8 rounded-2xl text-center text-xs text-white/50">
                  Nenhum aluno encontrado no cadastro.
                </div>
              );
            }

            return (
              <div className="space-y-4">
                {/* 1. ACCORDION: ATIVOS (PAGOS) */}
                <div className="glass-card rounded-2xl border border-emerald-500/30 overflow-hidden shadow-lg transition-all">
                  <button
                    type="button"
                    onClick={() => toggleAccordion('active')}
                    className="w-full p-4 flex items-center justify-between bg-emerald-950/20 hover:bg-emerald-950/30 transition-colors cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
                        <UserCheck size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-sm sm:text-base font-black text-white">
                            Alunos Ativos (Pagos)
                          </h2>
                          <span className="px-2 py-0.5 bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-full text-xs font-black">
                            {activeList.length}
                          </span>
                        </div>
                        <p className="text-[11px] text-white/50">
                          Acesso completo e liberado aos aplicativos
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-white/50">
                      <span className="text-xs hidden sm:inline">{openAccordions.active ? 'Recolher' : 'Expandir'}</span>
                      {openAccordions.active ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </button>

                  {openAccordions.active && (
                    <div className="p-3 sm:p-4 border-t border-emerald-500/20 space-y-3">
                      {activeList.length === 0 ? (
                        <div className="text-center py-4 text-xs text-white/40">
                          Nenhum aluno ativo nesta lista.
                        </div>
                      ) : (
                        activeList.map(renderStudentCard)
                      )}
                    </div>
                  )}
                </div>

                {/* 2. ACCORDION: PENDENTES (AGUARDANDO PIX) */}
                <div className="glass-card rounded-2xl border border-amber-500/30 overflow-hidden shadow-lg transition-all">
                  <button
                    type="button"
                    onClick={() => toggleAccordion('pending')}
                    className="w-full p-4 flex items-center justify-between bg-amber-950/20 hover:bg-amber-950/30 transition-colors cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
                        <Clock3 size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-sm sm:text-base font-black text-white">
                            Pendentes (Aguardando Pix)
                          </h2>
                          <span className="px-2 py-0.5 bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-full text-xs font-black">
                            {pendingList.length}
                          </span>
                        </div>
                        <p className="text-[11px] text-white/50">
                          Cadastrados aguardando confirmação ou pagamento
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-white/50">
                      <span className="text-xs hidden sm:inline">{openAccordions.pending ? 'Recolher' : 'Expandir'}</span>
                      {openAccordions.pending ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </button>

                  {openAccordions.pending && (
                    <div className="p-3 sm:p-4 border-t border-amber-500/20 space-y-3">
                      {pendingList.length === 0 ? (
                        <div className="text-center py-4 text-xs text-white/40">
                          Nenhum aluno com pagamento pendente.
                        </div>
                      ) : (
                        pendingList.map(renderStudentCard)
                      )}
                    </div>
                  )}
                </div>

                {/* 3. ACCORDION: EXPIRADOS */}
                <div className="glass-card rounded-2xl border border-red-500/30 overflow-hidden shadow-lg transition-all">
                  <button
                    type="button"
                    onClick={() => toggleAccordion('expired')}
                    className="w-full p-4 flex items-center justify-between bg-red-950/20 hover:bg-red-950/30 transition-colors cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400">
                        <UserX size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-sm sm:text-base font-black text-white">
                            Assinaturas Expiradas
                          </h2>
                          <span className="px-2 py-0.5 bg-red-500/30 text-red-300 border border-red-500/40 rounded-full text-xs font-black">
                            {expiredList.length}
                          </span>
                        </div>
                        <p className="text-[11px] text-white/50">
                          Período de teste ou mensalidade vencida
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-white/50">
                      <span className="text-xs hidden sm:inline">{openAccordions.expired ? 'Recolher' : 'Expandir'}</span>
                      {openAccordions.expired ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </button>

                  {openAccordions.expired && (
                    <div className="p-3 sm:p-4 border-t border-red-500/20 space-y-3">
                      {expiredList.length === 0 ? (
                        <div className="text-center py-4 text-xs text-white/40">
                          Nenhum aluno com assinatura expirada.
                        </div>
                      ) : (
                        expiredList.map(renderStudentCard)
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* TAB 2: ORDEM DOS APLICATIVOS (ALUNO E CEO) & MANUTENÇÃO */}
      {activeTab === 'apps_order' && (
        <div className="space-y-6">
          {/* Header Description & Reset */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-900/60 p-4 sm:p-5 rounded-3xl border border-white/10">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <LayoutGrid size={18} className="text-amber-400" />
                <span>Organização da Ordem do Menu & Aplicativos</span>
              </h2>
              <p className="text-xs text-white/60 mt-0.5">
                Escolha a posição exata de cada aplicativo ou use as setas para mover. Você também pode ativar/desativar módulos para manutenção do aluno.
              </p>
            </div>
            <button
              type="button"
              onClick={handleResetAppOrder}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 border border-white/10"
              title="Restaurar posições originais de fábrica"
            >
              <RefreshCw size={14} />
              <span>Restaurar Ordem Padrão</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. PAINEL DE ORDEM: ALUNO */}
            <div className="glass-card p-5 sm:p-6 rounded-3xl border border-blue-500/30 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                    <Users size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Menu do Aluno</h3>
                    <p className="text-[11px] text-white/50">Ordem e visibilidade global de apps para os alunos</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {appConfig.studentAppOrder.length} Módulos
                </span>
              </div>

              <div className="space-y-2.5">
                {appConfig.studentAppOrder.map((appId, index) => {
                  const itemInfo = ALL_STUDENT_APPS.find((a) => a.id === appId) || { label: appId, desc: '', icon: BookOpen };
                  const IconComp = itemInfo.icon;
                  const isEnabled = appConfig.studentGlobalEnabled[appId] !== false;

                  return (
                    <div
                      key={appId}
                      className={`p-3 sm:p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        isEnabled
                          ? 'bg-neutral-900/90 border-white/10 hover:border-blue-500/40'
                          : 'bg-neutral-900/40 border-red-500/20 opacity-60'
                      }`}
                    >
                      {/* Left: Position badge, Icon, Name */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center text-xs font-mono font-black text-amber-400 shrink-0">
                          {index + 1}º
                        </div>
                        <div className="shrink-0 text-blue-400">
                          <IconComp size={16} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                            <span>{itemInfo.label}</span>
                            {!isEnabled && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-red-500/20 text-red-300 font-normal">
                                Manutenção
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-white/40 truncate hidden sm:block">{itemInfo.desc}</p>
                        </div>
                      </div>

                      {/* Right: Position Dropdown, Up/Down, Enable Toggle */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Direct Position Selector */}
                        <select
                          value={index}
                          onChange={(e) => handleSetStudentAppPosition(appId, parseInt(e.target.value))}
                          className="bg-neutral-800 border border-white/15 text-white text-[11px] font-bold rounded-lg px-2 py-1 cursor-pointer focus:outline-none focus:border-amber-400"
                          title="Mudar posição diretamente"
                        >
                          {appConfig.studentAppOrder.map((_, posIdx) => (
                            <option key={posIdx} value={posIdx} className="bg-neutral-900 text-white">
                              {posIdx + 1}ª Posição
                            </option>
                          ))}
                        </select>

                        {/* Move Up Button */}
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => handleMoveStudentApp(index, 'up')}
                          className="p-1 rounded-lg bg-white/5 hover:bg-white/15 disabled:opacity-20 text-white transition-all cursor-pointer disabled:cursor-not-allowed"
                          title="Mover para cima"
                        >
                          <ArrowUp size={14} />
                        </button>

                        {/* Move Down Button */}
                        <button
                          type="button"
                          disabled={index === appConfig.studentAppOrder.length - 1}
                          onClick={() => handleMoveStudentApp(index, 'down')}
                          className="p-1 rounded-lg bg-white/5 hover:bg-white/15 disabled:opacity-20 text-white transition-all cursor-pointer disabled:cursor-not-allowed"
                          title="Mover para baixo"
                        >
                          <ArrowDown size={14} />
                        </button>

                        {/* Enable/Disable Toggle for Maintenance */}
                        <button
                          type="button"
                          onClick={() => handleToggleGlobalStudentApp(appId)}
                          className={`p-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ml-1 ${
                            isEnabled
                              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30'
                              : 'bg-red-500/20 border-red-500/40 text-red-300 hover:bg-red-500/30'
                          }`}
                          title={isEnabled ? 'Aplicativo liberado (Clique para colocar em manutenção)' : 'Aplicativo em manutenção (Clique para liberar)'}
                        >
                          {isEnabled ? <Check size={13} /> : <X size={13} />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. PAINEL DE ORDEM: ADMINISTRADOR (CEO) */}
            <div className="glass-card p-5 sm:p-6 rounded-3xl border border-amber-500/30 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <ShieldCheck size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Menu do CEO André Augusto</h3>
                    <p className="text-[11px] text-white/50">Ordem de exibição dos aplicativos no seu menu principal</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {appConfig.adminAppOrder.length} Módulos
                </span>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => handleSaveAppConfig(appConfig)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-emerald-400/30 bg-emerald-400/10 text-emerald-200 text-[11px] font-bold hover:bg-emerald-400/20 transition-colors"
                >
                  <CheckCircle size={14} />
                  Aplicar alterações
                </button>
              </div>

              <div className="space-y-2.5">
                {appConfig.adminAppOrder.map((appId, index) => {
                  const itemInfo = ALL_ADMIN_APPS.find((a) => a.id === appId) || { label: appId, desc: '', icon: LayoutGrid };
                  const IconComp = itemInfo.icon;

                  return (
                    <div
                      key={appId}
                      className="p-3 sm:p-3.5 rounded-2xl border border-white/10 hover:border-amber-500/40 bg-neutral-900/90 transition-all flex items-center justify-between gap-3"
                    >
                      {/* Left: Position badge, Icon, Name */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center text-xs font-mono font-black text-amber-400 shrink-0">
                          {index + 1}º
                        </div>
                        <div className="shrink-0 text-amber-400">
                          <IconComp size={16} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate">{itemInfo.label}</div>
                          <p className="text-[10px] text-white/40 truncate hidden sm:block">{itemInfo.desc}</p>
                        </div>
                      </div>

                      {/* Right: Position Dropdown, Up/Down */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Direct Position Selector */}
                        <select
                          value={index}
                          onChange={(e) => handleSetAdminAppPosition(appId, parseInt(e.target.value))}
                          className="bg-neutral-800 border border-white/15 text-white text-[11px] font-bold rounded-lg px-2 py-1 cursor-pointer focus:outline-none focus:border-amber-400"
                          title="Mudar posição diretamente"
                        >
                          {appConfig.adminAppOrder.map((_, posIdx) => (
                            <option key={posIdx} value={posIdx} className="bg-neutral-900 text-white">
                              {posIdx + 1}ª Posição
                            </option>
                          ))}
                        </select>

                        {/* Move Up Button */}
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => handleMoveAdminApp(index, 'up')}
                          className="p-1 rounded-lg bg-white/5 hover:bg-white/15 disabled:opacity-20 text-white transition-all cursor-pointer disabled:cursor-not-allowed"
                          title="Mover para cima"
                        >
                          <ArrowUp size={14} />
                        </button>

                        {/* Move Down Button */}
                        <button
                          type="button"
                          disabled={index === appConfig.adminAppOrder.length - 1}
                          onClick={() => handleMoveAdminApp(index, 'down')}
                          className="p-1 rounded-lg bg-white/5 hover:bg-white/15 disabled:opacity-20 text-white transition-all cursor-pointer disabled:cursor-not-allowed"
                          title="Mover para baixo"
                        >
                          <ArrowDown size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: FATURAMENTO EXCLUSIVO DO APLICATIVO (ASSINATURAS SAAS PIX R$ 10) */}
      {activeTab === 'revenue' && (
        <div className="space-y-6">
          {/* Top 3 Crystal-Clear Cards for Layman Understanding */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* 1. FATURAMENTO MENSAL REAL (SOMENTE ASSINANTES PAGANTES, SEM CUPOM) */}
            <div className="glass-card p-5 sm:p-6 rounded-3xl border border-emerald-500/30 relative overflow-hidden bg-neutral-900/80 shadow-xl">
              <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center justify-between text-xs font-bold text-emerald-400 mb-1">
                <span>FATURAMENTO DESTE MÊS</span>
                <TrendingUp size={16} />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono mt-2">
                R$ {saasMonthlyGross.toFixed(2).replace('.', ',')}
              </div>
              <div className="text-xs text-white/60 mt-1">
                {payingActiveStudentsCount} alunos pagantes × R$ {currentSubscriptionPrice.toFixed(2).replace('.', ',')}/mês
              </div>
            </div>

            {/* 2. TOTAL REAL RECEBIDO (PIX APROVADOS) */}
            <div className="glass-card p-5 sm:p-6 rounded-3xl border border-blue-500/30 relative overflow-hidden bg-neutral-900/80 shadow-xl">
              <div className="absolute top-0 right-0 w-28 h-28 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center justify-between text-xs font-bold text-blue-400 mb-1">
                <span>TOTAL ARRECADADO (PIX)</span>
                <CreditCard size={16} />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white font-mono mt-2">
                R$ {saasTotalReceived.toFixed(2).replace('.', ',')}
              </div>
              <div className="text-xs text-white/60 mt-1">
                {approvedPaymentsList.length} pagamentos confirmados na conta
              </div>
            </div>

            {/* 3. ALUNOS EM CUPOM GRATUITO (ISOLADOS DA RECEITA) */}
            <div className="glass-card p-5 sm:p-6 rounded-3xl border border-purple-500/30 relative overflow-hidden bg-neutral-900/80 shadow-xl">
              <div className="absolute top-0 right-0 w-28 h-28 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center justify-between text-xs font-bold text-purple-400 mb-1">
                <span>ALUNOS EM CUPOM GRÁTIS</span>
                <Ticket size={16} />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-purple-300 font-mono mt-2">
                {couponActiveStudentsCount}
              </div>
              <div className="text-xs text-white/60 mt-1">
                Acesso promocional temporário, não contam como receita
              </div>
            </div>
          </div>

          {/* Separation Notice Banner */}
          <div className="p-4 sm:p-5 rounded-3xl bg-neutral-900/80 border border-white/10 flex items-start gap-3.5 text-xs text-white/70">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shrink-0 mt-0.5">
              <LayoutDashboard size={16} />
            </div>
            <div>
              <div className="font-bold text-white text-sm">Faturamento Exclusivo da Assinatura do Aplicativo</div>
              <p className="mt-0.5 text-white/60">
                Os cálculos acima mostram <strong>exclusivamente a receita de assinaturas do app (R$ {currentSubscriptionPrice.toFixed(2).replace('.', ',')}/mês)</strong>. 
                As suas aulas de inglês particulares e em turmas continuam separadas no menu <strong>Controle Financeiro</strong>.
              </p>
            </div>
          </div>

          {/* HISTÓRICO DE PIX RECEBIDOS (COMPACTO E CLARO) */}
          <div className="glass-card p-5 sm:p-6 rounded-3xl border border-white/10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <CheckCircle size={18} className="text-emerald-400" />
                  <span>Histórico de Pix de Assinatura Recebidos</span>
                </h3>
                <p className="text-xs text-white/50 mt-0.5">
                  Lista simples e direta de todos os Pix de R$ {currentSubscriptionPrice.toFixed(2).replace('.', ',')} já confirmados.
                </p>
              </div>

              {/* Botão de Emitir Recibo BIA */}
              <button
                type="button"
                onClick={() => {
                  setSelectedReceiptType('bia');
                  setReceiptModalOpen(true);
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md self-start sm:self-auto"
                title="Emitir Recibo Timbrado"
              >
                <FileText size={15} />
                <span>Emitir Recibo do App</span>
              </button>
            </div>

            {approvedPaymentsList.length === 0 ? (
              <div className="p-8 text-center bg-white/5 rounded-2xl border border-white/10 text-xs text-white/40">
                Nenhum pagamento Pix registrado como aprovado ainda.
              </div>
            ) : (
              <div className="space-y-2">
                {approvedPaymentsList.map((payment) => {
                  const student = users.find(u => u.id === payment.userId || u.email.toLowerCase() === payment.userEmail.toLowerCase());
                  const studentName = student?.full_name || payment.userEmail.split('@')[0];
                  const city = student?.ip_city || 'São Paulo';
                  const region = student?.ip_region || 'SP';
                  const country = student?.ip_country || 'Brasil';

                  return (
                    <div
                      key={payment.id}
                      className="p-3 sm:p-3.5 rounded-2xl bg-neutral-900/60 border border-white/10 hover:border-emerald-500/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 font-bold text-xs">
                          {studentName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs sm:text-sm font-bold text-white truncate">{studentName}</span>
                            <span className="text-[11px] text-white/40 font-mono truncate">({payment.userEmail})</span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-white/50 mt-0.5 flex-wrap">
                            <span className="flex items-center gap-1 text-blue-300">
                              <Globe size={11} />
                              <span>{city}, {region} ({country})</span>
                            </span>
                            <span>•</span>
                            <span>{new Date(payment.paidAt).toLocaleDateString('pt-BR')} às {new Date(payment.paidAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 self-end sm:self-center">
                        <div className="text-right">
                          <div className="text-xs sm:text-sm font-black text-emerald-400 font-mono">
                            R$ {(payment.amount || currentSubscriptionPrice).toFixed(2).replace('.', ',')}
                          </div>
                          <div className="text-[10px] text-white/40 font-mono">
                            Pix #{payment.transactionId?.slice(-6) || 'OK'}
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black uppercase">
                          Aprovado
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: CONFIGURAÇÕES DE GATEWAY PIX (ABATEPAY) */}
      {activeTab === 'gateway' && (
        <form onSubmit={handleSaveGateway} className="space-y-6">
          <div className="glass-card p-6 rounded-3xl border border-white/10 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <CreditCard size={18} className="text-amber-400" />
              <span>Configurações do Gateway de Pagamento Pix</span>
            </h2>
            <p className="text-xs text-white/60">
              A AbatePay usa o token configurado no servidor. Aqui ficam apenas os dados comerciais e a chave Pix de fallback.
            </p>

            {savedSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
                <Check size={15} />
                <span>Configurações de Gateway salvas com sucesso!</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Valor da Assinatura Mensal */}
              <div>
                <label className="text-xs text-white/70 font-semibold block mb-1">
                  Valor da Assinatura Mensal (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={gatewaySettings.subscriptionPrice}
                  onChange={(e) =>
                    handleUpdateGatewayField('subscriptionPrice', parseFloat(e.target.value) || 0)
                  }
                  onBlur={(e) => {
                    const val = parseFloat(e.target.value);
                    handleUpdateGatewayField('subscriptionPrice', isNaN(val) ? 20 : val);
                  }}
                  className="w-full bg-neutral-900 border border-white/15 rounded-xl px-3 py-2 text-sm text-white font-mono outline-none focus:border-amber-400"
                />
              </div>

              {/* Chave Pix Direta */}
              <div>
                <label className="text-xs text-white/70 font-semibold block mb-1">
                  Chave Pix (E-mail / Telefone / CNPJ / Aleatória)
                </label>
                <input
                  type="text"
                  required
                  value={gatewaySettings.pixKey}
                  onChange={(e) => handleUpdateGatewayField('pixKey', e.target.value)}
                  placeholder="pix@brazilianinaction.com"
                  className="w-full bg-neutral-900 border border-white/15 rounded-xl px-3 py-2 text-sm text-white font-mono outline-none focus:border-amber-400"
                />
              </div>

              {/* Nome do Beneficiário */}
              <div>
                <label className="text-xs text-white/70 font-semibold block mb-1">
                  Nome do Beneficiário (Razão Social / Nome)
                </label>
                <input
                  type="text"
                  required
                  value={gatewaySettings.beneficiaryName}
                  onChange={(e) => handleUpdateGatewayField('beneficiaryName', e.target.value)}
                  placeholder="Brazilian in Action Idiomas"
                  className="w-full bg-neutral-900 border border-white/15 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs text-white/70 font-semibold block mb-1">URL do Webhook</label>
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/api/webhook/payment`}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white/60 font-mono"
                />
                <span className="text-[10px] text-white/40 mt-1 block">
                  Cadastre essa URL no painel da AbatePay. O token fica no arquivo .env do servidor e não deve ser colado aqui.
                </span>
              </div>
            </div>

            <button
              type="submit"
              className="py-3 px-6 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg shadow-amber-500/20"
            >
              Salvar Configurações de Cobrança
            </button>
          </div>

          <div className="glass-card rounded-3xl border border-cyan-400/20 p-6 space-y-4">
            <div>
              <h2 className="flex items-center gap-2 text-base font-bold text-white">
                <Globe size={18} className="text-cyan-300" />
                <span>Conexão do Supabase</span>
              </h2>
              <p className="mt-1 text-xs leading-5 text-white/60">
                Configure somente os dados públicos usados pelo aplicativo. A chave service role permanece protegida no servidor.
              </p>
            </div>

            {supabaseConfigSaved && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/15 p-3 text-xs text-emerald-200">
                <Check size={15} /> Conexão pública salva. Reabra o módulo para aplicar.
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="mb-1 block text-xs font-semibold text-white/70">Supabase Project URL</span>
                <input
                  type="url"
                  required
                  value={supabasePublicConfig.url}
                  onChange={(event) => setSupabasePublicConfig((current) => ({ ...current, url: event.target.value }))}
                  placeholder="https://seu-projeto.supabase.co"
                  className="w-full rounded-xl border border-white/15 bg-neutral-900 px-3 py-2 text-sm font-mono text-white outline-none focus:border-cyan-400"
                />
              </label>
              <label className="sm:col-span-2">
                <span className="mb-1 block text-xs font-semibold text-white/70">anon public key</span>
                <input
                  type="password"
                  required
                  value={supabasePublicConfig.anonKey}
                  onChange={(event) => setSupabasePublicConfig((current) => ({ ...current, anonKey: event.target.value }))}
                  placeholder="Cole aqui somente a chave anon public"
                  className="w-full rounded-xl border border-white/15 bg-neutral-900 px-3 py-2 text-sm font-mono text-white outline-none focus:border-cyan-400"
                />
              </label>
              <div className="sm:col-span-2 rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-[11px] leading-5 text-amber-100/80">
                Nunca cole <strong>SUPABASE_SERVICE_ROLE_KEY</strong> neste painel. Ela deve ficar somente no .env do servidor.
              </div>
              <button type="button" onClick={handleSaveSupabaseConfig} className="w-fit rounded-xl bg-cyan-400 px-5 py-2.5 text-xs font-extrabold uppercase tracking-wider text-black transition hover:bg-cyan-300">
                Salvar Conexão Pública
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TAB 4: ENGINE DE PROMOÇÃO & FREE TRIAL (CUPONS DINÂMICOS DE USO ÚNICO) */}
      {activeTab === 'promotions' && (
        <div className="space-y-6">
          {/* Header Card & Single-Use Generator */}
          <div className="glass-card p-6 rounded-3xl border border-white/10 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <Gift size={20} className="text-amber-400" />
                  <span>Gerador de Cupons Únicos (5 Dias de Degustação)</span>
                </h2>
                <p className="text-xs text-white/60 mt-1 max-w-2xl">
                  Gere cupons com <strong>códigos criptografados de uso único</strong>. Assim que o aluno utilizar o cupom para se cadastrar, ele é automaticamente queimado e <strong>ninguém mais poderá reutilizá-lo</strong>.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCreateSingleCoupon(5)}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs rounded-2xl transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/20 active:scale-95"
                >
                  <Plus size={16} />
                  <span>Gerar 1 Novo Cupom (5 Dias)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCreateBatchCoupons(5, 5)}
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-2xl transition-all flex items-center gap-1.5 cursor-pointer border border-white/15 active:scale-95"
                >
                  <Ticket size={16} className="text-amber-400" />
                  <span>Gerar Lote de 5 Cupons</span>
                </button>
              </div>
            </div>

            {/* Metrics Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3 bg-neutral-900/90 rounded-2xl border border-white/10">
                <span className="text-[10px] text-white/50 uppercase font-mono">Total Gerados</span>
                <div className="text-xl font-black text-white mt-0.5">{coupons.length}</div>
              </div>
              <div className="p-3 bg-neutral-900/90 rounded-2xl border border-emerald-500/30">
                <span className="text-[10px] text-emerald-400 uppercase font-mono">Disponíveis (Não Usados)</span>
                <div className="text-xl font-black text-emerald-400 mt-0.5">
                  {coupons.filter((c) => !c.isUsed).length}
                </div>
              </div>
              <div className="p-3 bg-neutral-900/90 rounded-2xl border border-red-500/30">
                <span className="text-[10px] text-red-400 uppercase font-mono">Utilizados & Queimados</span>
                <div className="text-xl font-black text-red-400 mt-0.5">
                  {coupons.filter((c) => c.isUsed).length}
                </div>
              </div>
            </div>
          </div>

          {/* List of Generated Single-Use Coupons */}
          <div className="glass-card p-6 rounded-3xl border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Ticket size={16} className="text-amber-400" />
                <span>Histórico e Status de Cupons Individuais</span>
              </h3>
              <span className="text-xs text-white/40 font-mono">
                {coupons.filter((c) => !c.isUsed).length} ativos para envio
              </span>
            </div>

            {coupons.length === 0 ? (
              <div className="p-8 text-center text-xs text-white/40 bg-neutral-900/50 rounded-2xl border border-white/5">
                Nenhum cupom gerado ainda. Clique no botão acima para criar o primeiro.
              </div>
            ) : (
              <div className="space-y-2.5">
                {coupons.map((coupon) => {
                  const isCopied = copiedCouponId === coupon.id;

                  return (
                    <div
                      key={coupon.id}
                      className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-wrap items-center justify-between gap-3 ${
                        coupon.isUsed
                          ? 'bg-neutral-900/60 border-red-500/20 opacity-75'
                          : 'bg-neutral-900/90 border-white/15 hover:border-amber-500/40 shadow-md'
                      }`}
                    >
                      {/* Left: Code, Days, and Usage Info */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono font-bold text-sm shrink-0 ${
                            coupon.isUsed
                              ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                              : 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
                          }`}
                        >
                          {coupon.isUsed ? <X size={18} /> : <Gift size={18} />}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm sm:text-base font-mono font-black text-white tracking-wider">
                              {coupon.code}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              {coupon.days} Dias Grátis
                            </span>
                            {coupon.isUsed ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-red-600/30 text-red-300 border border-red-500/40">
                                Utilizado
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-600/30 text-emerald-300 border border-emerald-500/40">
                                Disponível para Envio
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-white/50 mt-1 flex flex-wrap items-center gap-2">
                            <span>Gerado em: {new Date(coupon.createdAt).toLocaleDateString('pt-BR')}</span>
                            {coupon.isUsed && coupon.usedByEmail && (
                              <>
                                <span>•</span>
                                <span className="text-red-300 font-semibold">
                                  Resgatado por: <strong className="font-mono text-white">{coupon.usedByEmail}</strong>
                                </span>
                                {coupon.usedAt && (
                                  <span className="text-white/40">
                                    às {new Date(coupon.usedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Action Buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        {!coupon.isUsed && (
                          <>
                            {/* WhatsApp Direct Share */}
                            <button
                              type="button"
                              onClick={() => handleShareCouponWhatsApp(coupon)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-950/30"
                              title="Enviar Convite Direto no WhatsApp"
                            >
                              <MessageCircle size={14} />
                              <span className="hidden sm:inline">Enviar no WhatsApp</span>
                            </button>

                            {/* Copy Link */}
                            <button
                              type="button"
                              onClick={() => handleCopyCouponLink(coupon)}
                              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border border-white/10"
                              title="Copiar Link de Convite"
                            >
                              {isCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                              <span>{isCopied ? 'Link Copiado!' : 'Copiar Link'}</span>
                            </button>
                          </>
                        )}

                        {/* Delete Coupon */}
                        <button
                          type="button"
                          onClick={() => handleDeleteCoupon(coupon.id)}
                          className="p-1.5 hover:bg-red-500/20 text-white/30 hover:text-red-400 rounded-xl transition-all cursor-pointer"
                          title="Excluir Cupom"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Educational Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-white/70">
            <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
              <strong className="text-amber-400 block mb-1 text-sm flex items-center gap-1.5">
                <Ticket size={15} />
                <span>1. Código Individual</span>
              </strong>
              <span>Cada código gerado é único. Ao clicar em enviar, o link já vai com o código embutido para o aluno.</span>
            </div>
            <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
              <strong className="text-emerald-400 block mb-1 text-sm flex items-center gap-1.5">
                <ShieldCheck size={15} />
                <span>2. Queima Imediata</span>
              </strong>
              <span>Assim que o aluno conclui o cadastro, o cupom é queimado. Se ele tentar repassar o link a terceiros, o sistema rejeitará.</span>
            </div>
            <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
              <strong className="text-blue-400 block mb-1 text-sm flex items-center gap-1.5">
                <Clock size={15} />
                <span>3. Bloqueio no 6º Dia</span>
              </strong>
              <span>Após os 5 dias corridos, o aluno é direcionado automaticamente para o pagamento Pix de R$ {gatewaySettings.subscriptionPrice.toFixed(2)}/mês para continuar.</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: APROVAÇÕES DE PAGAMENTO PIX & COMPROVANTES (COMPACTO & ESCALÁVEL PARA 500+ ALUNOS) */}
      {activeTab === 'pix_approvals' && (() => {
        const pendingPixList = pixPayments.filter(p => p.status === 'pending');
        const approvedPixList = pixPayments.filter(p => p.status === 'approved');

        // Filter and Search Logic
        const filteredPixPayments = pixPayments.filter((item) => {
          // Status filter
          if (pixStatusFilter === 'pending' && item.status !== 'pending') return false;
          if (pixStatusFilter === 'approved' && item.status !== 'approved') return false;

          // Search query
          if (!pixSearchQuery.trim()) return true;
          const q = pixSearchQuery.toLowerCase();
          const student = users.find(u => u.id === item.userId || u.email.toLowerCase() === item.userEmail.toLowerCase());
          const name = student?.full_name?.toLowerCase() || '';
          const email = item.userEmail.toLowerCase();
          const city = student?.ip_city?.toLowerCase() || '';
          const region = student?.ip_region?.toLowerCase() || '';
          const country = student?.ip_country?.toLowerCase() || '';
          const txId = item.transactionId?.toLowerCase() || '';

          return name.includes(q) || email.includes(q) || city.includes(q) || region.includes(q) || country.includes(q) || txId.includes(q);
        });

        const allExpanded = filteredPixPayments.length > 0 && filteredPixPayments.every(p => expandedPixIds[p.id]);

        const handleToggleAllExpanded = () => {
          const newState = !allExpanded;
          const nextExpanded: Record<string, boolean> = {};
          filteredPixPayments.forEach(p => {
            nextExpanded[p.id] = newState;
          });
          setExpandedPixIds(nextExpanded);
        };

        return (
          <div className="space-y-4">
            {/* Top Filter & Search Bar */}
            <div className="glass-card p-4 sm:p-5 rounded-3xl border border-white/10 space-y-3.5 bg-neutral-900/80 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-black text-white flex items-center gap-2">
                    <CheckCircle size={18} className="text-amber-400" />
                    <span>Auditoria & Aprovação de Assinaturas Pix</span>
                  </h2>
                  <p className="text-xs text-white/60 mt-0.5">
                    Visualize localização, dados do aluno e aprove pagamentos em 1 clique.
                  </p>
                </div>

                {/* Expand / Collapse All Toggle */}
                {filteredPixPayments.length > 0 && (
                  <button
                    type="button"
                    onClick={handleToggleAllExpanded}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border border-white/10 self-start sm:self-auto"
                  >
                    {allExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    <span>{allExpanded ? 'Recolher Todos' : 'Expandir Todos'}</span>
                  </button>
                )}
              </div>

              {/* Search & Filter Buttons Row */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                  <input
                    type="text"
                    value={pixSearchQuery}
                    onChange={(e) => setPixSearchQuery(e.target.value)}
                    placeholder="Buscar por nome, cidade, estado ou e-mail..."
                    className="w-full pl-9 pr-8 py-2 bg-neutral-950/80 border border-white/15 rounded-2xl text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-amber-400 font-medium"
                  />
                  {pixSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setPixSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-1"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto pb-1 sm:pb-0">
                  <button
                    type="button"
                    onClick={() => setPixStatusFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      pixStatusFilter === 'all'
                        ? 'bg-white text-black border-white font-black'
                        : 'bg-white/5 hover:bg-white/10 text-white/70 border-white/10'
                    }`}
                  >
                    Todos ({pixPayments.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setPixStatusFilter('pending')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
                      pixStatusFilter === 'pending'
                        ? 'bg-amber-500 text-black border-amber-400 font-black shadow-md shadow-amber-500/20'
                        : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
                    }`}
                  >
                    <span>Pendentes ({pendingPixList.length})</span>
                    {pendingPixList.length > 0 && (
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setPixStatusFilter('approved')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      pixStatusFilter === 'approved'
                        ? 'bg-emerald-500 text-black border-emerald-400 font-black shadow-md shadow-emerald-500/20'
                        : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    }`}
                  >
                    Aprovados ({approvedPixList.length})
                  </button>
                </div>
              </div>
            </div>

            {/* List of Compact Pix Submissions */}
            {filteredPixPayments.length === 0 ? (
              <div className="p-8 text-center bg-neutral-900/60 rounded-3xl border border-white/10">
                <CheckCircle size={32} className="mx-auto text-white/30 mb-2" />
                <div className="text-sm font-bold text-white">Nenhum pagamento Pix encontrado</div>
                <div className="text-xs text-white/50 mt-1">
                  {pixSearchQuery
                    ? `Nenhum resultado corresponde à busca "${pixSearchQuery}".`
                    : 'Nenhum comprovante nesta categoria no momento.'}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredPixPayments.map((item) => {
                  const isPending = item.status === 'pending';
                  const isExpanded = !!expandedPixIds[item.id];
                  const student = users.find(
                    (u) => u.id === item.userId || u.email.toLowerCase() === item.userEmail.toLowerCase()
                  );
                  const studentName = student?.full_name || item.userEmail.split('@')[0];
                  const city = student?.ip_city || 'São Paulo';
                  const region = student?.ip_region || 'SP';
                  const country = student?.ip_country || 'Brasil';
                  const itemAmount = typeof item.amount === 'number' ? item.amount : (gatewaySettings.subscriptionPrice || 10);

                  return (
                    <div
                      key={item.id}
                      className={`rounded-2xl border transition-all overflow-hidden ${
                        isPending
                          ? 'bg-amber-950/20 border-amber-500/40 hover:border-amber-400/70 shadow-lg shadow-amber-950/15'
                          : 'bg-neutral-900/80 border-white/10 hover:border-white/20'
                      }`}
                    >
                      {/* COMPACT MAIN ROW (Header) */}
                      <div className="p-3 sm:p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        {/* Left: Avatar, Name, Email and City/State/Country */}
                        <div
                          onClick={() => togglePixExpanded(item.id)}
                          className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer select-none"
                        >
                          {/* Mini Thumbnail or Avatar */}
                          {item.receiptUrl ? (
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewReceiptImage(item.receiptUrl || null);
                              }}
                              className="w-10 h-10 rounded-xl border border-amber-500/40 overflow-hidden shrink-0 cursor-pointer relative group"
                              title="Clique para ampliar o comprovante"
                            >
                              <img
                                src={item.receiptUrl}
                                alt="Comprovante"
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                                <Eye size={13} />
                              </div>
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0 text-white/50 text-xs font-bold">
                              {studentName.charAt(0).toUpperCase()}
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs sm:text-sm font-black text-white truncate">
                                {studentName}
                              </span>
                              <span className="text-[11px] text-white/40 font-mono truncate hidden md:inline">
                                ({item.userEmail})
                              </span>
                              <span
                                className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                  isPending
                                    ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50 animate-pulse'
                                    : 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
                                }`}
                              >
                                {isPending ? 'Pendente' : 'Aprovado'}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-[11px] text-white/50 mt-0.5 flex-wrap">
                              {/* Location: City, State, Country */}
                              <span className="flex items-center gap-1 text-cyan-300 font-medium">
                                <Globe size={11} className="text-cyan-400 shrink-0" />
                                <span>{city}, {region} - {country}</span>
                              </span>
                              <span>•</span>
                              <span>
                                {new Date(item.paidAt).toLocaleDateString('pt-BR')} às{' '}
                                {new Date(item.paidAt).toLocaleTimeString('pt-BR', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Right: Amount, Quick Approve Button and Expand Chevron */}
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <div className="text-right mr-1">
                            <div className="text-xs sm:text-sm font-black text-amber-400 font-mono">
                              R$ {itemAmount.toFixed(2).replace('.', ',')}
                            </div>
                          </div>

                          {/* Quick Approve button if pending */}
                          {isPending && (
                            <button
                              type="button"
                              onClick={() => handleApprovePixPayment(item.id)}
                              className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all shadow-md shadow-emerald-500/20 active:scale-95"
                              title="Aprovar e Liberar 30 Dias"
                            >
                              <Check size={14} />
                              <span>Aprovar Pix</span>
                            </button>
                          )}

                          {/* Expand/Collapse Chevron Button */}
                          <button
                            type="button"
                            onClick={() => togglePixExpanded(item.id)}
                            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-white/60 hover:text-white transition-all cursor-pointer border border-white/10"
                            title={isExpanded ? 'Recolher Detalhes' : 'Ver Detalhes Completos'}
                          >
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </div>
                      </div>

                      {/* EXPANDABLE DETAILS DRAWER (Glassmorphism) */}
                      {isExpanded && (
                        <div className="p-4 bg-neutral-950/70 border-t border-white/10 space-y-3.5">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                            {/* Detailed Telemetry & ID */}
                            <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                              <span className="text-[10px] uppercase font-mono text-white/40 block">
                                Código / ID da Transação Pix
                              </span>
                              <div className="font-mono text-amber-300 font-bold break-all">
                                {item.transactionId || 'PIX-MANUAL-BIA'}
                              </div>
                              <div className="text-[11px] text-white/50 pt-1">
                                E-mail de cadastro: <strong className="text-white font-mono">{item.userEmail}</strong>
                              </div>
                            </div>

                            {/* Location & Plan Details */}
                            <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                              <span className="text-[10px] uppercase font-mono text-white/40 block">
                                Localização do Aluno & Plano
                              </span>
                              <div className="text-white font-bold flex items-center gap-1.5">
                                <Globe size={13} className="text-cyan-400" />
                                <span>{city}, {region} ({country})</span>
                              </div>
                              <div className="text-[11px] text-white/50 pt-1">
                                Plano: <strong className="text-white">{item.planName || 'Assinatura Mensal (R$ 10,00)'}</strong>
                              </div>
                            </div>

                            {/* Comprovante Photo Preview Link */}
                            <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-2">
                              <div>
                                <span className="text-[10px] uppercase font-mono text-white/40 block">
                                  Comprovante Visual
                                </span>
                                <div className="text-white/70 text-[11px] mt-0.5">
                                  {item.receiptUrl ? 'Anexo disponível' : 'Sem foto anexada'}
                                </div>
                              </div>
                              {item.receiptUrl && (
                                <button
                                  type="button"
                                  onClick={() => setPreviewReceiptImage(item.receiptUrl || null)}
                                  className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                                >
                                  <ImageIcon size={14} />
                                  <span>Ver Imagem</span>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Action Bar inside Drawer */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/5">
                            <div className="text-[11px] text-white/40">
                              Validade de acesso: <strong>30 dias corridos</strong> após aprovação.
                            </div>

                            <div className="flex items-center gap-2">
                              {isPending ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleRejectPixPayment(item.id)}
                                    className="px-3 py-1.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-300 hover:text-white border border-red-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                                  >
                                    <X size={14} />
                                    <span>Rejeitar Comprovante</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleApprovePixPayment(item.id)}
                                    className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95"
                                  >
                                    <Check size={15} />
                                    <span>Aprovar & Liberar 30 Dias</span>
                                  </button>
                                </>
                              ) : (
                                <span className="px-3 py-1.5 text-xs font-bold text-emerald-400 flex items-center gap-1.5 bg-emerald-500/10 rounded-xl border border-emerald-500/30">
                                  <CheckCircle size={14} />
                                  <span>Assinatura Ativa (Liberada pelo CEO)</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* TAB 7: SEGURANÇA EXECUTIVA DO CEO */}
      {activeTab === 'ceo_security' && (
        <div className="space-y-6">
          <div className="bg-red-950/40 border border-red-500/40 p-5 rounded-3xl backdrop-blur-md">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-2xl bg-red-600 text-white shadow-lg shadow-red-600/30">
                <KeyRound size={22} />
              </div>
              <div>
                <h2 className="text-lg font-black text-white">Controle de Acesso Executivo (Modo CEO)</h2>
                <p className="text-xs text-red-200/80">
                  Critérios estritos de autenticação: apenas os e-mails desta lista conseguem acessar o Painel de Administração.
                </p>
              </div>
            </div>
            <p className="text-xs text-white/70 mt-2 leading-relaxed">
              O modo CEO é protegido por uma <strong>Whitelist Criptográfica</strong>. Qualquer tentativa de login por e-mails não autorizados é sumariamente bloqueada com alerta de segurança, impedindo que terceiros ou alunos acessem os relatórios e faturamentos da empresa.
            </p>
          </div>

          {ceoMessage && (
            <div className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 border shadow-lg ${
              ceoMessage.type === 'success'
                ? 'bg-emerald-600/30 border-emerald-500 text-emerald-200'
                : 'bg-red-600/30 border-red-500 text-red-200'
            }`}>
              {ceoMessage.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              <span>{ceoMessage.text}</span>
            </div>
          )}

          {/* Authorized CEO List */}
          <div className="glass-card p-5 sm:p-6 rounded-3xl border border-white/10 space-y-4">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <ShieldCheck size={16} className="text-amber-400" />
              <span>E-mails com Permissão de CEO / Administrador</span>
            </h3>

            <div className="space-y-2">
              {authorizedCeos.map((email) => {
                const isOwner = email.toLowerCase() === 'andrejrcardoso93@gmail.com';
                return (
                  <div
                    key={email}
                    className="p-3 px-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center font-mono font-bold text-xs">
                        CEO
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white font-mono">{email}</div>
                        <div className="text-[10px] text-white/50">
                          {isOwner ? 'Proprietário & Fundador Principal' : 'Administrador Autorizado'}
                        </div>
                      </div>
                    </div>

                    {!isOwner && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCeoEmailAction(email)}
                        className="p-2 text-white/40 hover:text-red-400 hover:bg-red-500/20 rounded-xl transition-all cursor-pointer"
                        title="Remover autorização"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Add New Authorized CEO */}
            <form onSubmit={handleAddCeoEmailSubmit} className="pt-3 border-t border-white/10 flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                required
                placeholder="novo.ceo@brazilianinaction.com"
                value={newCeoEmailInput}
                onChange={(e) => setNewCeoEmailInput(e.target.value)}
                className="flex-1 bg-black/50 border border-white/20 focus:border-amber-400 rounded-2xl px-4 py-2.5 text-xs text-white outline-none font-mono placeholder:text-white/40"
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-2xl transition-all cursor-pointer shadow-lg shadow-amber-500/20 flex items-center justify-center gap-1.5 shrink-0 active:scale-95"
              >
                <Plus size={15} />
                <span>Adicionar E-mail CEO</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'friends_cleanup' && isMainCeo && (
        <div className="space-y-6">
          <div className={`rounded-3xl border p-5 sm:p-6 ${expiredFriendMessages > 0 ? 'border-red-500/60 bg-red-950/40 animate-pulse' : 'border-emerald-500/30 bg-emerald-950/20'}`}>
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-red-600/80 p-3 text-white">
                <Trash2 size={22} />
              </div>
              <div>
                <h2 className="text-lg font-black text-white">Limpeza do Brazilian Friends</h2>
                <p className="mt-1 text-xs leading-5 text-white/65">
                  Este controle apaga somente mensagens que já passaram do prazo de 7 dias. Mensagens recentes não são tocadas.
                </p>
              </div>
            </div>
          </div>

          {friendsCleanupMessage && (
            <div className={`rounded-2xl border p-3 text-xs font-bold ${friendsCleanupMessage.type === 'success' ? 'border-emerald-500/40 bg-emerald-600/20 text-emerald-200' : 'border-red-500/40 bg-red-600/20 text-red-200'}`}>
              {friendsCleanupMessage.text}
            </div>
          )}

          <div className="glass-card flex flex-col gap-4 rounded-3xl border border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-black text-white">Mensagens com 5 dias ou mais</p>
              <p className="mt-1 text-xs text-white/50">Encontradas: {expiredFriendMessages}</p>
            </div>
            <button
              type="button"
              onClick={() => void handleCleanupExpiredFriendMessages()}
              disabled={isCleaningFriends || expiredFriendMessages === 0}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-2.5 text-xs font-black text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 size={15} />
              {isCleaningFriends ? 'Apagando...' : 'Apagar vencidas do Supabase'}
            </button>
          </div>
        </div>
      )}

      {/* RECEIPT IMAGE PREVIEW MODAL */}
      {previewReceiptImage && (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-neutral-900 border border-white/20 rounded-3xl p-5 max-w-lg w-full shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <ImageIcon size={16} className="text-amber-400" />
                <span>Visualização do Comprovante Pix</span>
              </h3>
              <button
                type="button"
                onClick={() => setPreviewReceiptImage(null)}
                className="p-1.5 rounded-full hover:bg-white/10 text-white/60 hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="max-h-[65vh] overflow-y-auto rounded-2xl border border-white/10 bg-black flex items-center justify-center p-2">
              <img
                src={previewReceiptImage}
                alt="Comprovante de Pagamento"
                className="max-h-[60vh] object-contain rounded-xl"
              />
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="button"
                onClick={() => setPreviewReceiptImage(null)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECEIPT MODAL DIALOG */}
      {receiptModalOpen && selectedReceiptType && (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-neutral-950 border border-white/20 rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-amber-400" />
                <span className="font-bold text-white text-sm">Visualização do Recibo</span>
              </div>
              <button
                type="button"
                onClick={() => setReceiptModalOpen(false)}
                className="p-1 hover:bg-white/10 rounded-lg text-white/50 hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Printable Receipt Paper */}
            {(() => {
              const r = getReceiptData(selectedReceiptType);
              return (
                <div className="bg-white text-black p-6 rounded-2xl space-y-4 font-sans text-xs select-text border border-neutral-300">
                  <div className="flex items-center justify-between border-b pb-3">
                    <div>
                      <div className="font-black text-base tracking-tight">{r.empresa}</div>
                      <div className="text-[10px] text-neutral-500 font-mono">RECIBO DE PRESTAÇÃO DE SERVIÇOS</div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-neutral-500">VALOR:</span>
                      <div className="text-base font-black font-mono">
                        R$ {r.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  <p className="leading-relaxed text-xs">
                    Recebemos a quantia de <strong>R$ {r.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> ({r.extenso}), correspondente a <strong>{r.descricao}</strong>.
                  </p>

                  <div className="pt-4 flex items-end justify-between border-t text-[11px] text-neutral-600">
                    <div>
                      <span>Data: {r.data}</span>
                    </div>
                    <div className="text-right">
                      <div className="border-t border-black pt-1 w-36 text-center font-bold">
                        André Augusto
                      </div>
                      <div className="text-[9px] text-center text-neutral-400">Diretor / Docente</div>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl cursor-pointer"
              >
                Imprimir / Salvar PDF
              </button>
              <button
                type="button"
                onClick={() => setReceiptModalOpen(false)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
