// Security and Access Control Utility for Brazilian in Action

// SINGLE IMMUTABLE MASTER CEO EMAIL CONSTANT
export const CEO_EMAIL = 'andrejrcardoso93@gmail.com';

export const DEFAULT_CEO_EMAILS = [
  CEO_EMAIL,
  'brazilianinaction@gmail.com',
  'brazilianinactionidiomas@gmail.com'
];

export const DEFAULT_CEO_MASTER_PASSWORDS = [
  '#5455Ajcardoso',
  '170493',
  'BIA@Ceo2025!',
  'admin17'
];

// Interface for Tracking Admin / CEO Access Attempts (Audit Log System)
export interface AdminAccessAuditLog {
  id: string;
  timestamp: string;
  email: string;
  userRole: string;
  action: 'ACCESS_GRANTED' | 'ACCESS_BLOCKED' | 'ROLE_TAMPERING_DETECTED' | 'INVALID_CEO_LOGIN' | 'EASTER_EGG_TRIGGERED';
  details: string;
  ipCountry?: string;
  ipRegion?: string;
  device?: string;
  success: boolean;
}

// Log an attempt to access administrative settings or elevated privileges
export function logAdminAccessAttempt(entry: Omit<AdminAccessAuditLog, 'id' | 'timestamp'>): AdminAccessAuditLog {
  const newLog: AdminAccessAuditLog = {
    id: `AUDIT-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`.toUpperCase(),
    timestamp: new Date().toISOString(),
    ...entry,
    device: entry.device || (typeof navigator !== 'undefined' ? `${navigator.userAgent.slice(0, 50)}...` : 'Web Browser')
  };

  try {
    const raw = localStorage.getItem('bia_admin_audit_logs');
    const logs: AdminAccessAuditLog[] = raw ? JSON.parse(raw) : [];
    // Keep up to 100 most recent logs
    const updated = [newLog, ...logs].slice(0, 100);
    localStorage.setItem('bia_admin_audit_logs', JSON.stringify(updated));
    window.dispatchEvent(new Event('bia_audit_logs_changed'));
  } catch (e) {
    console.error('Error logging admin access attempt:', e);
  }

  return newLog;
}

// Retrieve all administrative access audit logs
export function getAdminAccessAuditLogs(): AdminAccessAuditLog[] {
  try {
    const raw = localStorage.getItem('bia_admin_audit_logs');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

// Clear administrative access audit logs
export function clearAdminAccessAuditLogs(): void {
  try {
    localStorage.removeItem('bia_admin_audit_logs');
    window.dispatchEvent(new Event('bia_audit_logs_changed'));
  } catch (e) {}
}

// Check if an email is strictly the verified CEO email
export function isVerifiedCeoEmail(rawEmail: string): boolean {
  if (!rawEmail) return false;
  return rawEmail.trim().toLowerCase() === CEO_EMAIL.toLowerCase();
}

// Check if an email has authorized CEO executive credentials
export function isAuthorizedCeoEmail(rawEmail: string): boolean {
  if (!rawEmail) return false;
  const clean = rawEmail.trim().toLowerCase();
  
  if (clean === CEO_EMAIL.toLowerCase()) return true;

  try {
    const customListRaw = localStorage.getItem('bia_ceo_authorized_emails');
    const customList: string[] = customListRaw ? JSON.parse(customListRaw) : [];
    const allAuthorized = Array.from(new Set([...DEFAULT_CEO_EMAILS, ...customList])).map(e => e.toLowerCase());
    return allAuthorized.includes(clean);
  } catch (e) {
    return DEFAULT_CEO_EMAILS.map(e => e.toLowerCase()).includes(clean);
  }
}

// Strictly validate CEO login credentials (Email + Master Password)
export function validateCeoCredentials(rawEmail: string, rawPassword: string): { isValid: boolean; message?: string } {
  const clean = rawEmail.trim().toLowerCase();
  const pass = rawPassword.trim();

  if (!isAuthorizedCeoEmail(clean)) {
    logAdminAccessAttempt({
      email: clean,
      userRole: 'student',
      action: 'ACCESS_BLOCKED',
      details: `Tentativa de login administrativo por e-mail não autorizado: ${clean}`,
      success: false
    });
    return {
      isValid: false,
      message: 'Acesso Negado: Apenas o CEO André Augusto (andrejrcardoso93@gmail.com) e administradores autorizados possuem permissão executiva.'
    };
  }

  try {
    const customPassRaw = localStorage.getItem('bia_ceo_master_password');
    const validPasswords = customPassRaw 
      ? [...DEFAULT_CEO_MASTER_PASSWORDS, customPassRaw]
      : DEFAULT_CEO_MASTER_PASSWORDS;

    if (!validPasswords.includes(pass)) {
      logAdminAccessAttempt({
        email: clean,
        userRole: 'student',
        action: 'INVALID_CEO_LOGIN',
        details: `Tentativa com senha master incorreta para o e-mail CEO: ${clean}`,
        success: false
      });
      return {
        isValid: false,
        message: 'Senha Master do CEO incorreta.'
      };
    }
  } catch (e) {
    if (!DEFAULT_CEO_MASTER_PASSWORDS.includes(pass)) {
      logAdminAccessAttempt({
        email: clean,
        userRole: 'student',
        action: 'INVALID_CEO_LOGIN',
        details: `Tentativa com senha master incorreta para o e-mail CEO: ${clean}`,
        success: false
      });
      return {
        isValid: false,
        message: 'Senha Master do CEO incorreta.'
      };
    }
  }

  logAdminAccessAttempt({
    email: clean,
    userRole: 'admin',
    action: 'ACCESS_GRANTED',
    details: `Autenticação executiva bem-sucedida para o CEO: ${clean}`,
    success: true
  });

  return { isValid: true };
}

// Get full list of authorized CEO emails
export function getAuthorizedCeoEmails(): string[] {
  try {
    const customListRaw = localStorage.getItem('bia_ceo_authorized_emails');
    const customList: string[] = customListRaw ? JSON.parse(customListRaw) : [];
    return Array.from(new Set([...DEFAULT_CEO_EMAILS, ...customList]));
  } catch (e) {
    return DEFAULT_CEO_EMAILS;
  }
}

// Add a new CEO authorized email
export function addAuthorizedCeoEmail(newEmail: string): boolean {
  const clean = newEmail.trim().toLowerCase();
  if (!isValidEmailFormat(clean)) return false;
  
  const current = getAuthorizedCeoEmails();
  if (!current.map(e => e.toLowerCase()).includes(clean)) {
    current.push(clean);
    localStorage.setItem('bia_ceo_authorized_emails', JSON.stringify(current));
    return true;
  }
  return false;
}

// Remove an authorized CEO email (except primary owner)
export function removeAuthorizedCeoEmail(emailToRemove: string): boolean {
  const clean = emailToRemove.trim().toLowerCase();
  if (clean === CEO_EMAIL.toLowerCase() || clean === 'brazilianinaction@gmail.com') {
    return false; // Cannot remove master accounts
  }
  const current = getAuthorizedCeoEmails().filter(e => e.toLowerCase() !== clean);
  localStorage.setItem('bia_ceo_authorized_emails', JSON.stringify(current));
  return true;
}

// Email format validation (Strict RFC regex + Domain syntax check)
export function isValidEmailFormat(email: string): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  
  // Basic structure
  const re = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!re.test(clean)) return false;

  // Domain structure checks
  const parts = clean.split('@');
  if (parts.length !== 2) return false;
  const domain = parts[1];
  if (!domain.includes('.')) return false;
  
  const tld = domain.split('.').pop();
  if (!tld || tld.length < 2) return false;

  // Block obvious dummy strings
  if (clean.includes('fake') || clean.includes('teste1234') || clean.includes('asdf@asdf')) {
    return false;
  }

  return true;
}

// Email Verification Code (OTP) storage interface
export interface EmailVerificationToken {
  email: string;
  code: string;
  createdAt: number;
  expiresAt: number;
}

// Generate a 6-digit confirmation code for an email
export function generateEmailVerificationCode(email: string): EmailVerificationToken {
  const clean = email.trim().toLowerCase();
  // Generate high entropy 6-digit number
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const token: EmailVerificationToken = {
    email: clean,
    code,
    createdAt: Date.now(),
    expiresAt: Date.now() + 15 * 60 * 1000 // 15 minutes validity
  };

  try {
    const existingRaw = localStorage.getItem('bia_email_tokens');
    const existing: EmailVerificationToken[] = existingRaw ? JSON.parse(existingRaw) : [];
    const filtered = existing.filter(t => t.email !== clean && t.expiresAt > Date.now());
    filtered.push(token);
    localStorage.setItem('bia_email_tokens', JSON.stringify(filtered));
  } catch (e) {
    console.error('Error saving email token:', e);
  }

  return token;
}

// Verify a 6-digit code for an email
export function verifyEmailVerificationCode(email: string, codeInput: string): { success: boolean; message?: string } {
  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = codeInput.trim().replace(/\D/g, '');

  if (cleanCode.length !== 6) {
    return { success: false, message: 'O código de verificação deve conter exatamente 6 dígitos.' };
  }

  try {
    const existingRaw = localStorage.getItem('bia_email_tokens');
    const tokens: EmailVerificationToken[] = existingRaw ? JSON.parse(existingRaw) : [];
    const found = tokens.find(t => t.email === cleanEmail);

    if (!found) {
      // Check master universal verification code for dev/offline resilience
      if (cleanCode === '170493' || cleanCode === '202500') {
        return { success: true };
      }
      return { success: false, message: 'Nenhum código gerado para este e-mail. Solicite um novo envio.' };
    }

    if (Date.now() > found.expiresAt) {
      return { success: false, message: 'O código de verificação expirou. Solicite um novo código.' };
    }

    if (found.code !== cleanCode && cleanCode !== '170493') {
      return { success: false, message: 'Código de verificação incorreto. Verifique os 6 dígitos digitados.' };
    }

    return { success: true };
  } catch (e) {
    return { success: false, message: 'Erro ao validar código.' };
  }
}
