import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  GraduationCap, 
  BookOpen, 
  Megaphone, 
  Users, 
  FileText, 
  ExternalLink, 
  RefreshCw, 
  LogOut, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  Search, 
  Calendar, 
  AlertCircle,
  FolderOpen,
  HardDrive,
  File,
  Folder,
  Music,
  Video,
  Image,
  Play,
  Download
} from 'lucide-react';
import { User } from 'firebase/auth';
import { initAuth, googleSignIn, getAccessToken, logout } from '../lib/classroomAuth';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  webContentLink?: string;
  thumbnailLink?: string;
  iconLink?: string;
  modifiedTime?: string;
}

interface Course {
  id: string;
  name: string;
  section?: string;
  descriptionHeading?: string;
  description?: string;
  room?: string;
  ownerId?: string;
  creationTime?: string;
  courseState?: string;
  alternateLink?: string;
  enrollmentCode?: string;
}

interface MaterialAttachment {
  driveFile?: {
    driveFile?: {
      id?: string;
      title?: string;
      alternateLink?: string;
      thumbnailUrl?: string;
    };
  };
  youtubeVideo?: {
    id?: string;
    title?: string;
    alternateUrl?: string;
    thumbnailUrl?: string;
  };
  link?: {
    url?: string;
    title?: string;
    thumbnailUrl?: string;
  };
  form?: {
    formUrl?: string;
    title?: string;
    thumbnailUrl?: string;
  };
}

interface Announcement {
  id: string;
  courseId: string;
  text: string;
  creationTime: string;
  alternateLink?: string;
  materials?: MaterialAttachment[];
}

interface CourseWork {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  state?: string;
  alternateLink?: string;
  creationTime?: string;
  dueDate?: { year: number; month: number; day: number };
  dueTime?: { hours: number; minutes: number };
  maxPoints?: number;
  workType?: string;
  materials?: MaterialAttachment[];
}

interface CourseWorkMaterial {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  materials?: MaterialAttachment[];
  alternateLink?: string;
  creationTime?: string;
}

interface TeacherOrStudent {
  userId: string;
  courseId: string;
  profile: {
    name?: { fullName?: string };
    emailAddress?: string;
    photoUrl?: string;
  };
}

interface GoogleClassroomProps {
  accentColor: string;
}

export const GoogleClassroom: React.FC<GoogleClassroomProps> = ({ accentColor }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Classroom & Drive Data States
  const [activeModule, setActiveModule] = useState<'drive' | 'classroom'>('drive');
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [courseWork, setCourseWork] = useState<CourseWork[]>([]);
  const [courseMaterials, setCourseMaterials] = useState<CourseWorkMaterial[]>([]);
  const [teachers, setTeachers] = useState<TeacherOrStudent[]>([]);
  const [students, setStudents] = useState<TeacherOrStudent[]>([]);

  // Drive States
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [loadingDrive, setLoadingDrive] = useState(false);
  const [driveFilter, setDriveFilter] = useState<'all' | 'pdf' | 'audio' | 'video' | 'folder'>('all');
  const [driveSearch, setDriveSearch] = useState('');

  // UI States
  const [activeTab, setActiveTab] = useState<'mural' | 'work' | 'materials' | 'roster'>('mural');
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch Drive Files
  const fetchDriveFiles = useCallback(async (token: string, search = '') => {
    setLoadingDrive(true);
    try {
      let q = "trashed = false";
      if (search.trim()) {
        const escaped = search.replace(/'/g, "\\'");
        q += ` and name contains '${escaped}'`;
      }
      const url = `https://www.googleapis.com/drive/v3/files?pageSize=100&fields=files(id,name,mimeType,webViewLink,webContentLink,thumbnailLink,iconLink,modifiedTime)&q=${encodeURIComponent(q)}&orderBy=modifiedTime%20desc`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDriveFiles(data.files || []);
      }
    } catch (err) {
      console.error('Fetch Drive files error:', err);
    } finally {
      setLoadingDrive(false);
    }
  }, []);

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

  // Fetch Courses list
  const fetchCourses = useCallback(async (token: string) => {
    setLoadingCourses(true);
    setErrorMsg(null);
    try {
      const res = await fetch('https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        if (res.status === 401) {
          setNeedsAuth(true);
          throw new Error('Sua sessão do Google expirou. Por favor, faça login novamente.');
        }
        throw new Error(`Erro ao buscar turmas do Google Classroom (${res.status})`);
      }

      const data = await res.json();
      const courseList: Course[] = data.courses || [];
      setCourses(courseList);
      if (courseList.length > 0 && !selectedCourse) {
        setSelectedCourse(courseList[0]);
      }
    } catch (err: any) {
      console.error('Fetch courses error:', err);
      setErrorMsg(err.message || 'Falha ao carregar suas turmas do Google Classroom.');
    } finally {
      setLoadingCourses(false);
    }
  }, [selectedCourse]);

  // Fetch details for selected course
  const fetchCourseDetails = useCallback(async (courseId: string, token: string) => {
    setLoadingDetails(true);
    setErrorMsg(null);
    try {
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch Announcements, CourseWork, CourseWorkMaterials, Teachers, Students in parallel
      const [annRes, workRes, matRes, teachRes, studRes] = await Promise.all([
        fetch(`https://classroom.googleapis.com/v1/courses/${courseId}/announcements`, { headers }),
        fetch(`https://classroom.googleapis.com/v1/courses/${courseId}/courseWork`, { headers }),
        fetch(`https://classroom.googleapis.com/v1/courses/${courseId}/courseWorkMaterials`, { headers }),
        fetch(`https://classroom.googleapis.com/v1/courses/${courseId}/teachers`, { headers }),
        fetch(`https://classroom.googleapis.com/v1/courses/${courseId}/students`, { headers }),
      ]);

      if (annRes.ok) {
        const annData = await annRes.json();
        setAnnouncements(annData.announcements || []);
      } else {
        setAnnouncements([]);
      }

      if (workRes.ok) {
        const workData = await workRes.json();
        setCourseWork(workData.courseWork || []);
      } else {
        setCourseWork([]);
      }

      if (matRes.ok) {
        const matData = await matRes.json();
        setCourseMaterials(matData.courseWorkMaterial || []);
      } else {
        setCourseMaterials([]);
      }

      if (teachRes.ok) {
        const teachData = await teachRes.json();
        setTeachers(teachData.teachers || []);
      } else {
        setTeachers([]);
      }

      if (studRes.ok) {
        const studData = await studRes.json();
        setStudents(studData.students || []);
      } else {
        setStudents([]);
      }
    } catch (err: any) {
      console.error('Fetch course details error:', err);
      setErrorMsg('Falha ao carregar os detalhes e mural desta turma.');
    } finally {
      setLoadingDetails(false);
    }
  }, []);

  // Fetch courses and drive files when accessToken is ready
  useEffect(() => {
    if (accessToken) {
      fetchCourses(accessToken);
      fetchDriveFiles(accessToken, driveSearch);
    }
  }, [accessToken, fetchCourses, fetchDriveFiles, driveSearch]);

  // Fetch details when selectedCourse changes
  useEffect(() => {
    if (selectedCourse && accessToken) {
      fetchCourseDetails(selectedCourse.id, accessToken);
    }
  }, [selectedCourse, accessToken, fetchCourseDetails]);

  const handleLogin = async (basicOnly = false) => {
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      const result = await googleSignIn(basicOnly);
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
        setNeedsAuth(false);
        if (result.accessToken) {
          fetchCourses(result.accessToken);
          fetchDriveFiles(result.accessToken, driveSearch);
        }
      }
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/cancelled-popup-request') {
        console.error('Login error:', err);
        setAuthError(err.message || 'O Google bloqueou a permissão direta da API do Classroom.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setAccessToken(null);
    setNeedsAuth(true);
    setCourses([]);
    setSelectedCourse(null);
  };

  const filteredCourses = courses.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.section && c.section.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredDriveFiles = driveFiles.filter((f) => {
    if (driveFilter === 'pdf') return f.mimeType.includes('pdf');
    if (driveFilter === 'audio') return f.mimeType.includes('audio');
    if (driveFilter === 'video') return f.mimeType.includes('video');
    if (driveFilter === 'folder') return f.mimeType.includes('folder');
    return true;
  });

  // Helper to render attachments (Drive Files, PDFs, YouTube, Links, Forms)
  const renderAttachments = (materials?: MaterialAttachment[]) => {
    if (!materials || materials.length === 0) return null;

    return (
      <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-white/10">
        <span className="text-[10px] font-mono uppercase tracking-wider text-white/50 flex items-center gap-1 font-bold">
          <FolderOpen size={12} className="text-emerald-400" />
          Anexos & PDFs ({materials.length}):
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {materials.map((mat, idx) => {
            if (mat.driveFile?.driveFile) {
              const df = mat.driveFile.driveFile;
              return (
                <a
                  key={df.id || idx}
                  href={df.alternateLink || '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/5 hover:bg-emerald-500/20 border border-white/10 hover:border-emerald-500/40 text-xs text-white/90 hover:text-white transition-all group shadow-sm"
                >
                  {df.thumbnailUrl ? (
                    <img src={df.thumbnailUrl} alt="" className="w-8 h-8 rounded object-cover border border-white/10 flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                      PDF
                    </div>
                  )}
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-semibold text-xs truncate group-hover:text-emerald-300">
                      {df.title || 'Arquivo PDF / Google Drive'}
                    </span>
                    <span className="text-[10px] text-emerald-400/80 font-mono flex items-center gap-1 mt-0.5">
                      <span>Abrir / Baixar PDF</span>
                      <ExternalLink size={10} />
                    </span>
                  </div>
                </a>
              );
            }

            if (mat.youtubeVideo) {
              const yt = mat.youtubeVideo;
              return (
                <a
                  key={yt.id || idx}
                  href={yt.alternateUrl || '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/40 text-xs text-white/90 hover:text-white transition-all group shadow-sm"
                >
                  {yt.thumbnailUrl ? (
                    <img src={yt.thumbnailUrl} alt="" className="w-8 h-8 rounded object-cover border border-white/10 flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded bg-red-500/20 text-red-300 flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                      YT
                    </div>
                  )}
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-semibold text-xs truncate group-hover:text-red-300">
                      {yt.title || 'Vídeo do YouTube'}
                    </span>
                    <span className="text-[10px] text-red-400/80 font-mono flex items-center gap-1 mt-0.5">
                      <span>Assistir Vídeo</span>
                      <ExternalLink size={10} />
                    </span>
                  </div>
                </a>
              );
            }

            if (mat.link) {
              const lk = mat.link;
              return (
                <a
                  key={lk.url || idx}
                  href={lk.url || '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/5 hover:bg-blue-500/20 border border-white/10 hover:border-blue-500/40 text-xs text-white/90 hover:text-white transition-all group shadow-sm"
                >
                  <div className="w-8 h-8 rounded bg-blue-500/20 text-blue-300 flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                    LINK
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-semibold text-xs truncate group-hover:text-blue-300">
                      {lk.title || lk.url}
                    </span>
                    <span className="text-[10px] text-blue-400/80 font-mono flex items-center gap-1 mt-0.5">
                      <span>Acessar Link</span>
                      <ExternalLink size={10} />
                    </span>
                  </div>
                </a>
              );
            }

            if (mat.form) {
              const fm = mat.form;
              return (
                <a
                  key={fm.formUrl || idx}
                  href={fm.formUrl || '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/5 hover:bg-purple-500/20 border border-white/10 hover:border-purple-500/40 text-xs text-white/90 hover:text-white transition-all group shadow-sm"
                >
                  <div className="w-8 h-8 rounded bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                    FORM
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-semibold text-xs truncate group-hover:text-purple-300">
                      {fm.title || 'Formulário do Google'}
                    </span>
                    <span className="text-[10px] text-purple-400/80 font-mono flex items-center gap-1 mt-0.5">
                      <span>Abrir Form</span>
                      <ExternalLink size={10} />
                    </span>
                  </div>
                </a>
              );
            }

            return null;
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-6 pb-16 pt-2">
      {/* Top Banner & Title Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-neutral-950/70 border border-white/10 p-6 rounded-3xl backdrop-blur-xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="flex items-center gap-4 z-10">
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 text-emerald-400 shadow-lg shadow-emerald-950/40">
            <GraduationCap size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">Google Classroom</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider">
                Oficial
              </span>
            </div>
            <p className="text-xs text-white/50 mt-1">
              Conecte suas turmas, ative atividades, mural de recados e turmas do Google Sala de Aula.
            </p>
          </div>
        </div>

        {/* User Status / Login Actions */}
        <div className="flex items-center gap-3 z-10 self-start md:self-auto">
          {!needsAuth && user ? (
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-2 px-3 rounded-2xl backdrop-blur-md">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || 'Usuário'} className="w-8 h-8 rounded-full border border-white/20" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-xs font-bold text-emerald-300">
                  {user.displayName?.[0] || 'U'}
                </div>
              )}
              <div className="flex flex-col text-left">
                <span className="text-xs font-semibold text-white truncate max-w-[140px]">
                  {user.displayName || 'Conectado'}
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">Google Ativo</span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="p-1.5 hover:bg-white/10 rounded-xl text-white/50 hover:text-red-400 transition-all cursor-pointer ml-1"
                title="Desconectar do Google"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => handleLogin(false)}
              disabled={isLoggingIn}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-emerald-950/50 disabled:opacity-50"
            >
              {isLoggingIn ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <Sparkles size={16} />
              )}
              <span>Conectar Google Classroom</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {needsAuth ? (
        /* Sign-In Hero Card */
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto my-8 p-8 md:p-12 rounded-3xl bg-neutral-950/80 border border-white/10 text-center flex flex-col items-center gap-6 backdrop-blur-2xl shadow-2xl relative overflow-hidden"
        >
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-950/50">
            <GraduationCap size={36} />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl md:text-2xl font-bold text-white">
              Sincronize suas turmas do Google Classroom
            </h2>
            <p className="text-xs md:text-sm text-white/60 leading-relaxed max-w-lg mx-auto">
              Acesse avisos do mural, trabalhos, datas de entrega e listas de alunos diretamente pelo app, com integração oficial da API do Google.
            </p>
          </div>

          {authError && (
            <div className="w-full bg-red-500/10 border border-red-500/30 p-3 rounded-xl text-xs text-red-300 flex items-center justify-center gap-2">
              <AlertCircle size={16} />
              <span>{authError}</span>
            </div>
          )}

          {/* Sign In Buttons & Options */}
          <div className="flex flex-col items-center gap-3 w-full max-w-sm mt-2">
            {/* Primary Google Login Button */}
            <button
              type="button"
              onClick={() => handleLogin(false)}
              disabled={isLoggingIn}
              className="w-full group relative flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-white text-neutral-900 hover:bg-neutral-100 font-bold text-sm transition-all shadow-xl hover:scale-102 active:scale-98 cursor-pointer disabled:opacity-50"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              <span>{isLoggingIn ? 'Conectando ao Google...' : 'Entrar com Conta do Google'}</span>
            </button>

            {/* Basic Login Fallback */}
            <button
              type="button"
              onClick={() => handleLogin(true)}
              disabled={isLoggingIn}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-white/10 text-white/80 hover:text-white text-xs font-semibold transition-all cursor-pointer"
            >
              <Users size={14} className="text-emerald-400" />
              <span>Entrar como Usuário Google (Sem Restrições de API)</span>
            </button>

            <p className="text-[11px] text-emerald-400/90 font-medium flex items-center justify-center gap-1">
              <span>Sugerido para:</span>
              <span className="font-semibold underline">brazilianinaction@gmail.com</span>
            </p>

            {/* Direct Classroom Link Shortcut */}
            <a
              href="https://classroom.google.com/c/MzU1Nzc5NTYzNjgw?cjc=zdaigqev"
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-bold text-xs transition-all cursor-pointer shadow-md mt-1"
            >
              <GraduationCap size={16} />
              <span>Acessar Turma Direta no Google Classroom</span>
              <ExternalLink size={13} />
            </a>
          </div>

          {/* Explanation Box for Google OAuth Block */}
          <div className="w-full text-left bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl text-xs text-amber-200/90 space-y-2 mt-2">
            <div className="flex items-center gap-2 font-bold text-amber-300 text-sm">
              <AlertCircle size={16} />
              <span>Aviso sobre o "Acesso Bloqueado" pelo Google:</span>
            </div>
            <p className="leading-relaxed text-[11px] text-amber-100/80">
              O Google exige verificação oficial para escopos do Google Classroom. Se ao tentar entrar você vir a mensagem <strong className="text-white">"Acesso Bloqueado"</strong>:
            </p>
            <ul className="list-disc list-inside text-[11px] space-y-1 text-amber-100/80 pl-1">
              <li>No popup do Google, clique em <strong className="text-white">"Avançado"</strong> e depois em <strong className="text-white">"Acessar (não seguro)"</strong> para autorizar a leitura.</li>
              <li>Ou utilize o botão verde <strong className="text-white">"Acessar Turma Direta no Google Classroom"</strong> acima para abrir sua sala diretamente no navegador!</li>
            </ul>
          </div>

          <div className="flex items-center gap-6 pt-4 text-[11px] text-white/40">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-emerald-400" /> Leitura oficial de turmas
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-emerald-400" /> Conexão segura Google OAuth2
            </span>
          </div>
        </motion.div>
      ) : (
        /* Authenticated Google Hub (Drive & Classroom) */
        <div className="flex flex-col gap-6">
          {/* Main Module Switcher Tabs */}
          <div className="flex items-center gap-3 border-b border-white/10 pb-4 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveModule('drive')}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg whitespace-nowrap ${
                activeModule === 'drive'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border border-emerald-400/40 shadow-emerald-950/50'
                  : 'bg-neutral-900/80 hover:bg-neutral-800 text-white/60 hover:text-white border border-white/10'
              }`}
            >
              <HardDrive size={18} className={activeModule === 'drive' ? 'text-white' : 'text-emerald-400'} />
              <span>Google Drive (Meus PDFs & Conteúdos)</span>
              <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-white/20 text-white font-bold">
                {driveFiles.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveModule('classroom')}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg whitespace-nowrap ${
                activeModule === 'classroom'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border border-emerald-400/40 shadow-emerald-950/50'
                  : 'bg-neutral-900/80 hover:bg-neutral-800 text-white/60 hover:text-white border border-white/10'
              }`}
            >
              <GraduationCap size={18} className={activeModule === 'classroom' ? 'text-white' : 'text-emerald-400'} />
              <span>Google Classroom (Turmas)</span>
              <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-white/20 text-white font-bold">
                {courses.length}
              </span>
            </button>
          </div>

          {/* GOOGLE DRIVE MODULE */}
          {activeModule === 'drive' && (
            <div className="flex flex-col gap-6">
              {/* Drive Filter & Search Header */}
              <div className="bg-neutral-950/70 border border-white/10 p-5 rounded-3xl backdrop-blur-xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
                  <button
                    type="button"
                    onClick={() => setDriveFilter('all')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      driveFilter === 'all'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-white/5 text-white/60 hover:text-white'
                    }`}
                  >
                    Todos ({driveFiles.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setDriveFilter('pdf')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      driveFilter === 'pdf'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-white/5 text-white/60 hover:text-white'
                    }`}
                  >
                    <FileText size={14} className="text-emerald-400" />
                    <span>PDFs & Docs</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDriveFilter('audio')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      driveFilter === 'audio'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                        : 'bg-white/5 text-white/60 hover:text-white'
                    }`}
                  >
                    <Music size={14} className="text-purple-400" />
                    <span>Áudios (MP3)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDriveFilter('video')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      driveFilter === 'video'
                        ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                        : 'bg-white/5 text-white/60 hover:text-white'
                    }`}
                  >
                    <Video size={14} className="text-red-400" />
                    <span>Vídeos</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDriveFilter('folder')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      driveFilter === 'folder'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-white/5 text-white/60 hover:text-white'
                    }`}
                  >
                    <Folder size={14} className="text-amber-400" />
                    <span>Pastas</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1 md:w-64">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                    <input
                      type="text"
                      placeholder="Buscar no Google Drive..."
                      value={driveSearch}
                      onChange={(e) => setDriveSearch(e.target.value)}
                      className="w-full bg-neutral-900 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => accessToken && fetchDriveFiles(accessToken, driveSearch)}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-white/60 hover:text-white border border-white/10 transition-all cursor-pointer"
                    title="Atualizar Google Drive"
                  >
                    <RefreshCw size={15} className={loadingDrive ? 'animate-spin text-emerald-400' : ''} />
                  </button>
                </div>
              </div>

              {/* Drive File Grid */}
              {loadingDrive ? (
                <div className="py-20 text-center text-xs text-white/40 flex flex-col items-center gap-3">
                  <RefreshCw size={28} className="animate-spin text-emerald-400" />
                  <span>Carregando seus arquivos e PDFs do Google Drive...</span>
                </div>
              ) : filteredDriveFiles.length === 0 ? (
                <div className="p-12 text-center text-xs text-white/40 bg-neutral-950/70 border border-white/10 rounded-3xl flex flex-col items-center gap-3">
                  <HardDrive size={36} className="text-emerald-400/50" />
                  <span className="font-bold text-white/80 text-sm">Nenhum arquivo encontrado</span>
                  <span className="text-white/50 max-w-sm">
                    {driveSearch ? 'Tente buscar com outra palavra-chave.' : 'Seus arquivos do Google Drive aparecerão aqui para acesso direto.'}
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredDriveFiles.map((file) => {
                    const isPdf = file.mimeType.includes('pdf');
                    const isAudio = file.mimeType.includes('audio');
                    const isVideo = file.mimeType.includes('video');
                    const isFolder = file.mimeType.includes('folder');
                    const isImg = file.mimeType.includes('image');

                    return (
                      <div
                        key={file.id}
                        className="p-4 rounded-2xl bg-neutral-950/80 border border-white/10 hover:border-emerald-500/40 transition-all flex flex-col justify-between gap-3 group shadow-lg"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-3 rounded-xl flex items-center justify-center shrink-0 ${
                            isPdf ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                            isAudio ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                            isVideo ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                            isFolder ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                            isImg ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                            'bg-white/10 text-white/70 border border-white/20'
                          }`}>
                            {isPdf && <FileText size={20} />}
                            {isAudio && <Music size={20} />}
                            {isVideo && <Video size={20} />}
                            {isFolder && <Folder size={20} />}
                            {isImg && <Image size={20} />}
                            {!isPdf && !isAudio && !isVideo && !isFolder && !isImg && <File size={20} />}
                          </div>

                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="font-bold text-xs text-white truncate group-hover:text-emerald-300 transition-colors" title={file.name}>
                              {file.name}
                            </span>
                            <span className="text-[10px] text-white/40 font-mono mt-0.5">
                              {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString('pt-BR') : 'Google Drive'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                          {file.webViewLink && (
                            <a
                              href={file.webViewLink}
                              target="_blank"
                              rel="noreferrer"
                              className="flex-1 py-2 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all shadow-sm"
                            >
                              <span>{isPdf ? 'Visualizar PDF' : isAudio ? 'Ouvir Áudio' : isVideo ? 'Assistir Vídeo' : 'Abrir no Drive'}</span>
                              <ExternalLink size={12} />
                            </a>
                          )}
                          {file.webContentLink && (
                            <a
                              href={file.webContentLink}
                              target="_blank"
                              rel="noreferrer"
                              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-all"
                              title="Baixar arquivo"
                            >
                              <Download size={14} />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* GOOGLE CLASSROOM MODULE */}
          {activeModule === 'classroom' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sidebar: Course Selection List */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <div className="bg-neutral-950/70 border border-white/10 p-4 rounded-3xl backdrop-blur-xl shadow-xl flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-widest text-white/70 flex items-center gap-2">
                  <BookOpen size={14} className="text-emerald-400" />
                  <span>Minhas Turmas</span>
                  <span className="text-[10px] font-mono text-white/40 bg-white/5 px-2 py-0.5 rounded-full">
                    {courses.length}
                  </span>
                </h2>
                <button
                  type="button"
                  onClick={() => accessToken && fetchCourses(accessToken)}
                  className="p-1.5 hover:bg-white/10 rounded-lg text-white/50 hover:text-white transition-all cursor-pointer"
                  title="Atualizar Turmas"
                >
                  <RefreshCw size={14} className={loadingCourses ? 'animate-spin text-emerald-400' : ''} />
                </button>
              </div>

              {/* Course Search Filter */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="text"
                  placeholder="Buscar turma..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-neutral-900 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              {/* Direct Class Link / Code Shortcut Box */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-950/40 to-neutral-900 border border-emerald-500/20 text-xs flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-400 flex items-center gap-1.5 text-[11px]">
                    <Sparkles size={13} /> Link da Sua Turma
                  </span>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-300 px-2 py-0.5 rounded-full font-mono">
                    Código: zdaigqev
                  </span>
                </div>
                <p className="text-[11px] text-white/60 leading-tight">
                  Acesse sua turma diretamente no Google Classroom com este link:
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <a
                    href="https://classroom.google.com/c/MzU1Nzc5NTYzNjgw?cjc=zdaigqev"
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all shadow-md"
                  >
                    <span>Abrir no Classroom</span>
                    <ExternalLink size={12} />
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText('https://classroom.google.com/c/MzU1Nzc5NTYzNjgw?cjc=zdaigqev');
                      alert('Link da turma copiado!');
                    }}
                    className="py-1.5 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white transition-all text-[11px] font-medium"
                    title="Copiar Link"
                  >
                    Copiar
                  </button>
                </div>
              </div>

              {/* Course List */}
              <div className="flex flex-col gap-2 max-h-[500px] overflow-y-auto pr-1">
                {loadingCourses && courses.length === 0 ? (
                  <div className="p-6 text-center text-xs text-white/40 flex flex-col items-center gap-2">
                    <RefreshCw size={20} className="animate-spin text-emerald-400" />
                    <span>Carregando turmas...</span>
                  </div>
                ) : filteredCourses.length === 0 ? (
                  <div className="p-6 text-center text-xs text-white/40 bg-white/[0.02] border border-white/5 rounded-2xl">
                    Nenhuma turma encontrada no Google Classroom.
                  </div>
                ) : (
                  filteredCourses.map((c) => {
                    const isSelected = selectedCourse?.id === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedCourse(c)}
                        className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col gap-1.5 group ${
                          isSelected
                            ? 'bg-emerald-500/15 border-emerald-500/40 shadow-lg shadow-emerald-950/30'
                            : 'bg-white/[0.02] border-white/5 hover:bg-white/5 hover:border-white/15'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
                        )}
                        <div className="flex items-start justify-between gap-2">
                          <h3 className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-white/80 group-hover:text-white'}`}>
                            {c.name}
                          </h3>
                          {c.alternateLink && (
                            <a
                              href={c.alternateLink}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-white/30 hover:text-emerald-400 transition-colors p-1"
                              title="Abrir no Google Classroom"
                            >
                              <ExternalLink size={12} />
                            </a>
                          )}
                        </div>
                        {c.section && (
                          <p className="text-[11px] text-white/50 truncate font-mono">
                            {c.section}
                          </p>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Right Main Panel: Course Feed / Details */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {selectedCourse ? (
              <div className="bg-neutral-950/70 border border-white/10 p-6 rounded-3xl backdrop-blur-xl shadow-xl flex flex-col gap-6">
                {/* Selected Course Header Banner */}
                <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-900/40 via-teal-900/20 to-neutral-900 border border-emerald-500/20 relative overflow-hidden flex flex-col gap-2 shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                      {selectedCourse.section || 'Turma Ativa'}
                    </span>
                    {selectedCourse.alternateLink && (
                      <a
                        href={selectedCourse.alternateLink}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-xs text-white/70 hover:text-white bg-black/40 border border-white/15 px-3 py-1 rounded-xl backdrop-blur-md transition-all hover:bg-black/60"
                      >
                        <span>Classroom Web</span>
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>

                  <h2 className="text-lg md:text-xl font-extrabold text-white">
                    {selectedCourse.name}
                  </h2>
                  {selectedCourse.descriptionHeading && (
                    <p className="text-xs text-white/60 line-clamp-2">
                      {selectedCourse.descriptionHeading}
                    </p>
                  )}
                </div>

                {/* Navigation Tabs (Mural, Atividades, Materiais, Pessoas) */}
                <div className="flex items-center gap-2 border-b border-white/10 pb-3 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setActiveTab('mural')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                      activeTab === 'mural'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-md'
                        : 'text-white/50 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Megaphone size={14} />
                    <span>Mural ({announcements.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('work')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                      activeTab === 'work'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-md'
                        : 'text-white/50 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <FileText size={14} />
                    <span>Atividades ({courseWork.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('materials')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                      activeTab === 'materials'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-md'
                        : 'text-white/50 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <FolderOpen size={14} />
                    <span>Materiais & PDFs ({courseMaterials.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('roster')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                      activeTab === 'roster'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-md'
                        : 'text-white/50 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Users size={14} />
                    <span>Pessoas ({teachers.length + students.length})</span>
                  </button>
                </div>

                {/* Tab Views */}
                {loadingDetails ? (
                  <div className="py-12 text-center text-xs text-white/40 flex flex-col items-center gap-2">
                    <RefreshCw size={24} className="animate-spin text-emerald-400" />
                    <span>Sincronizando mural, PDFs e materiais do Google Classroom...</span>
                  </div>
                ) : (
                  <div>
                    {/* 1. MURAL / ANÚNCIOS */}
                    {activeTab === 'mural' && (
                      <div className="flex flex-col gap-4">
                        {announcements.length === 0 ? (
                          <div className="p-8 text-center text-xs text-white/40 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col items-center gap-2">
                            <Megaphone size={24} className="text-white/20" />
                            <span>Nenhum aviso postado no mural desta turma ainda.</span>
                          </div>
                        ) : (
                          announcements.map((ann) => (
                            <div
                              key={ann.id}
                              className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-white/20 transition-all flex flex-col gap-2"
                            >
                              <div className="flex items-center justify-between text-[11px] text-white/40 font-mono">
                                <span className="flex items-center gap-1">
                                  <Clock size={12} />
                                  {ann.creationTime ? new Date(ann.creationTime).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recente'}
                                </span>
                                {ann.alternateLink && (
                                  <a
                                    href={ann.alternateLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-emerald-400 hover:underline flex items-center gap-1"
                                  >
                                    <span>Ver no Classroom</span>
                                    <ExternalLink size={10} />
                                  </a>
                                )}
                              </div>
                              <p className="text-xs text-white/90 whitespace-pre-wrap leading-relaxed">
                                {ann.text}
                              </p>
                              {renderAttachments(ann.materials)}
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* 2. ATIVIDADES / COURSEWORK */}
                    {activeTab === 'work' && (
                      <div className="flex flex-col gap-4">
                        {courseWork.length === 0 ? (
                          <div className="p-8 text-center text-xs text-white/40 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col items-center gap-2">
                            <FileText size={24} className="text-white/20" />
                            <span>Nenhuma atividade cadastrada nesta turma ainda.</span>
                          </div>
                        ) : (
                          courseWork.map((work) => (
                            <div
                              key={work.id}
                              className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-white/20 transition-all flex flex-col gap-3"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                                    <span>{work.title}</span>
                                    {work.maxPoints && (
                                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                                        {work.maxPoints} pts
                                      </span>
                                    )}
                                  </h4>
                                  {work.dueDate && (
                                    <p className="text-[11px] text-amber-300/90 font-mono mt-1 flex items-center gap-1">
                                      <Calendar size={12} />
                                      <span>
                                        Entrega: {String(work.dueDate.day).padStart(2, '0')}/{String(work.dueDate.month).padStart(2, '0')}/{work.dueDate.year}
                                      </span>
                                    </p>
                                  )}
                                </div>
                                {work.alternateLink && (
                                  <a
                                    href={work.alternateLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all"
                                  >
                                    <span>Abrir Atividade</span>
                                    <ExternalLink size={12} />
                                  </a>
                                )}
                              </div>
                              {work.description && (
                                <p className="text-xs text-white/60 leading-relaxed">
                                  {work.description}
                                </p>
                              )}
                              {renderAttachments(work.materials)}
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* 3. MATERIAIS & PDFS */}
                    {activeTab === 'materials' && (
                      <div className="flex flex-col gap-4">
                        {courseMaterials.length === 0 ? (
                          <div className="p-8 text-center text-xs text-white/40 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col items-center gap-3">
                            <FolderOpen size={32} className="text-emerald-400/50" />
                            <div className="flex flex-col gap-1 max-w-md">
                              <span className="font-bold text-white/80">Nenhum post no formato de "Material de Aula"</span>
                              <span className="text-[11px] text-white/50">
                                Os PDFs e arquivos também podem estar anexados dentro das <strong>Atividades</strong> ou dos posts do <strong>Mural</strong> nas abas acima!
                              </span>
                            </div>
                            {selectedCourse.alternateLink && (
                              <a
                                href={selectedCourse.alternateLink}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-md"
                              >
                                <span>Abrir Pasta da Turma no Google Classroom</span>
                                <ExternalLink size={13} />
                              </a>
                            )}
                          </div>
                        ) : (
                          courseMaterials.map((mat) => (
                            <div
                              key={mat.id}
                              className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-white/20 transition-all flex flex-col gap-3"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                                    <BookOpen size={14} className="text-emerald-400" />
                                    <span>{mat.title}</span>
                                  </h4>
                                  {mat.creationTime && (
                                    <p className="text-[10px] text-white/40 font-mono mt-0.5">
                                      Postado em {new Date(mat.creationTime).toLocaleDateString('pt-BR')}
                                    </p>
                                  )}
                                </div>
                                {mat.alternateLink && (
                                  <a
                                    href={mat.alternateLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all"
                                  >
                                    <span>Ver Material</span>
                                    <ExternalLink size={12} />
                                  </a>
                                )}
                              </div>
                              {mat.description && (
                                <p className="text-xs text-white/60 leading-relaxed">
                                  {mat.description}
                                </p>
                              )}
                              {renderAttachments(mat.materials)}
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* 3. PESSOAS / ROSTER */}
                    {activeTab === 'roster' && (
                      <div className="flex flex-col gap-6">
                        {/* Teachers */}
                        <div className="flex flex-col gap-2">
                          <h4 className="text-xs font-bold uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
                            <Users size={14} />
                            <span>Professores ({teachers.length})</span>
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {teachers.map((t) => (
                              <div
                                key={t.userId}
                                className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5"
                              >
                                {t.profile?.photoUrl ? (
                                  <img src={t.profile.photoUrl} alt="" className="w-8 h-8 rounded-full" />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-300 font-bold flex items-center justify-center text-xs">
                                    {t.profile?.name?.fullName?.[0] || 'P'}
                                  </div>
                                )}
                                <div className="flex flex-col truncate">
                                  <span className="text-xs font-semibold text-white truncate">
                                    {t.profile?.name?.fullName || 'Professor'}
                                  </span>
                                  {t.profile?.emailAddress && (
                                    <span className="text-[10px] text-white/40 truncate font-mono">
                                      {t.profile.emailAddress}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Students */}
                        <div className="flex flex-col gap-2">
                          <h4 className="text-xs font-bold uppercase tracking-widest text-white/60 flex items-center gap-1.5">
                            <Users size={14} />
                            <span>Alunos ({students.length})</span>
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1">
                            {students.length === 0 ? (
                              <p className="text-xs text-white/40 italic p-2">Nenhum aluno cadastrado na lista.</p>
                            ) : (
                              students.map((s) => (
                                <div
                                  key={s.userId}
                                  className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/5"
                                >
                                  {s.profile?.photoUrl ? (
                                    <img src={s.profile.photoUrl} alt="" className="w-7 h-7 rounded-full" />
                                  ) : (
                                    <div className="w-7 h-7 rounded-full bg-white/10 text-white/70 font-bold flex items-center justify-center text-[10px]">
                                      {s.profile?.name?.fullName?.[0] || 'A'}
                                    </div>
                                  )}
                                  <div className="flex flex-col truncate">
                                    <span className="text-xs font-medium text-white/80 truncate">
                                      {s.profile?.name?.fullName || 'Aluno'}
                                    </span>
                                    {s.profile?.emailAddress && (
                                      <span className="text-[10px] text-white/30 truncate font-mono">
                                        {s.profile.emailAddress}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 text-center text-xs text-white/40 bg-neutral-950/70 border border-white/10 rounded-3xl backdrop-blur-xl flex flex-col items-center gap-3">
                <FolderOpen size={32} className="text-white/20" />
                <span>Selecione uma turma na lista ao lado para visualizar os recados e atividades.</span>
              </div>
            )}
          </div>
        </div>
      )}
      </div>
      )}
    </div>
  );
};
