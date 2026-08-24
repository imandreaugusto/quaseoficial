export interface ClassItem {
  id: string;
  n: string; // name of student / class
  tipo: 'individual' | 'turma' | 'bia';
  h: string; // hour (e.g., '08')
  p: string; // period ('AM' | 'PM')
  d: number[]; // active days (0-6, Monday-Sunday)
  f: number[]; // holidays (feriados)
  notas: string;
  valor?: number; // custom monthly value / rate
}

export interface ExpenseItem {
  id: string;
  n: string; // name of account
  v: number; // value in BRL
}

export interface AppSettings {
  soundEnabled: boolean;
  prewarnMin: number;
  clock24h: boolean;
  autoStart: boolean;
  confirmDel: boolean;
  blurValues: boolean;
  bgEnabled: boolean;
  bgBright: 'darker' | 'normal' | 'lighter';
  accentColor: string;
  readerFont: number;
  readerFontFamily: 'poppins' | 'lora' | 'crimson';
  readerAlign: 'center' | 'justify';
  lang: 'pt' | 'en';
  uiDensity: 'normal' | 'compact' | 'spacious';
  uiScale: 'sm' | 'md' | 'lg';
  showNextClass: boolean;
  animOn: boolean;
  menuMode: 'click' | 'hover';
  focusMode: boolean;
  compactStreamOverlay: boolean;
  bgInterval?: number;
}

export interface StoryItem {
  id: number;
  type: 'story' | 'music';
  cat: string; // category / author / artist
  title: string;
  level: string; // A1, A2, etc.
  text: string;
  coverUrl?: string;
  coverImages?: string[];
  qs?: string; // questions (newline separated)
  hints?: string; // hints (newline separated)
}

export interface ReadSession {
  key: string; // `${bookId}_${className}`
  bookId: number;
  className: string;
  notes: string;
  marks: Record<number, string>; // maps word index to highlighted color
}

export interface GlossaryEntry {
  word: string;
  translation: string;
  bookId: number | null;
  bookTitle: string;
  addedAt: number;
}

export interface BoardState {
  tool: 'pen' | 'pencil' | 'marker' | 'eraser' | 'text' | 'rect' | 'circle' | 'line' | 'stamp';
  color: string;
  stroke: number;
  theme: 'dark' | 'light';
  grid: boolean;
  slides: (string | null)[];
  current: number;
}

export interface SavedBoard {
  name: string;
  data: string; // dataURL of canvas
  slides: (string | null)[];
  currentSlide: number;
  theme: 'dark' | 'light';
  at: string; // iso date
}

export interface VocabularyItem {
  word: string;
  pos: string;
  pronunciation: string;
  translation: string;
  example: string;
}

export type UserRole = 'student' | 'admin';
export type SubscriptionStatus = 'pending' | 'active' | 'expired' | 'trial';

export interface StudentPermissions {
  friends: boolean;
  readclub: boolean;
  board: boolean;
  quiz: boolean;
  biacompare: boolean;
  conversation: boolean;
  tradutor: boolean;
  youtube: boolean;
  practice: boolean;
  stories: boolean;
}

export interface StorySubmission {
  id: string;
  studentId: string;
  studentName: string;
  studentAvatar?: string;
  title: string;
  category: 'challenge' | 'episoden' | 'readclub' | 'expression' | 'routine';
  promptUsed: string;
  videoUrl?: string; // Blob object URL or data URL
  thumbnailUrl?: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'featured';
  likesCount: number;
  instagramHandle?: string;
  adminFeedback?: string;
}

export interface StoryBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  dateUnlocked?: string;
}

export interface GlobalAppConfig {
  studentAppOrder: string[];
  adminAppOrder: string[];
  studentGlobalEnabled: Record<string, boolean>; // toggle for maintenance/global availability
}

export interface PixPaymentRecord {
  id: string;
  userId: string;
  userEmail: string;
  amount: number;
  paidAt: string;
  expiresAt: string;
  status: 'approved' | 'pending' | 'expired';
  method: 'pix';
  transactionId: string;
  planName: string;
  receiptUrl?: string; // image/base64 receipt proof
  receiptNotes?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  password?: string;
  full_name?: string;
  role: UserRole;
  status: SubscriptionStatus;
  data_expiracao?: string | null;
  email_verified?: boolean;
  ip_country?: string;
  ip_region?: string;
  ip_city?: string;
  cupom_usado?: string;
  last_pix_tx_id?: string;
  last_pix_receipt?: string;
  pix_submitted_at?: string;
  permissions: StudentPermissions;
  created_at: string;
  updated_at?: string;
}

export interface GatewaySettings {
  subscriptionPrice: number;
  provider: 'asaas' | 'mercadopago';
  apiKey: string;
  publicKey?: string;
  clientId?: string;
  clientSecret?: string;
  webhookSecret: string;
  pixKey: string;
  pixKeyType: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';
  beneficiaryName: string;
  city: string;
}

export interface TrialCoupon {
  id: string;
  code: string;
  days: number;
  createdAt: string;
  expiresAt?: string | null; // expiration of the coupon itself
  isUsed: boolean;
  usedByEmail?: string;
  usedAt?: string;
  notes?: string;
}

export interface ConversationLesson {
  id: string;
  title: string;
  level: string;
  goal: string;
  theme: string;
  duration: string;
  starter: string;
  warmup: string[];
  mainDiscussion: string[];
  followup: string[];
  vocabulary: VocabularyItem[];
  expressions: string[];
  grammarFocus: string;
  teacherNotes: string[];
  isFavorite?: boolean;
  createdAt: string;
}

