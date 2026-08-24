import React, { useState, useEffect, useRef } from 'react';
import { BoardState, SavedBoard } from '../types';
import { auth, listenToAuth, syncToCloud } from '../lib/cloudSync';
import { subscribeToUserDataFromCloud } from '../lib/firebase';
import {
  Pen,
  Highlighter,
  Eraser,
  Type,
  Square,
  Circle,
  Minus,
  Image as ImageIcon,
  Grid,
  Undo,
  Redo,
  RefreshCw,
  Plus,
  Save,
  Download,
  Maximize2,
  Minimize2,
  FolderOpen,
  Trash2,
  Smile,
  Sparkles,
  Sliders,
  Layers,
  HelpCircle
} from 'lucide-react';

interface BrazilianBoardProps {
  accentColor: string;
}

// 4 Premium Pedagogical Board Background Presets
const BOARD_THEMES = [
  { id: 'charcoal', label: 'Grafite Escuro', bg: '#16171b', grid: 'rgba(255, 255, 255, 0.04)', dark: true },
  { id: 'greenboard', label: 'Verde Lousa', bg: '#0d251a', grid: 'rgba(255, 255, 255, 0.04)', dark: true },
  { id: 'blueprint', label: 'Blueprint', bg: '#112240', grid: 'rgba(255, 255, 255, 0.08)', dark: true },
  { id: 'whiteboard', label: 'Quadro Branco', bg: '#fdfdfd', grid: 'rgba(0, 0, 0, 0.04)', dark: false },
] as const;

// Pedagogical English Lesson Stamps
const STAMPS = [
  { emoji: 'LABEL: Rule', label: 'Rule' },
  { emoji: 'LABEL: Speech', label: 'Speech' },
  { emoji: 'LABEL: Vocab', label: 'Vocab' },
  { emoji: 'LABEL: Mistake', label: 'Mistake' },
  { emoji: 'LABEL: Great!', label: 'Great!' },
  { emoji: 'LABEL: Right', label: 'Right' },
  { emoji: 'LABEL: Wrong', label: 'Wrong' },
  { emoji: 'LABEL: Note', label: 'Note' },
] as const;

export const BrazilianBoard: React.FC<BrazilianBoardProps> = ({ accentColor }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Board background and parameters state
  const [boardTheme, setBoardTheme] = useState<typeof BOARD_THEMES[number]['id']>('charcoal');
  const [tool, setTool] = useState<BoardState['tool']>('pen');
  const [color, setColor] = useState('#ffffff');
  const [stroke, setStroke] = useState(4);
  const [gridOn, setGridOn] = useState(true);
  const [focusClassMode, setFocusClassMode] = useState(false);
  const [selectedStamp, setSelectedStamp] = useState('LABEL: Rule');

  // Multi-page Slide Management
  const [slides, setSlides] = useState<(string | null)[]>([null]);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Undo/Redo stacks
  const [history, setHistory] = useState<string[]>([]);
  const [future, setFuture] = useState<string[]>([]);

  // Saved boards list
  const [savedBoards, setSavedBoards] = useState<Record<string, SavedBoard>>({});
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [loadModalOpen, setLoadModalOpen] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');

  // Interactive Text insertion box overlay state (No native prompt)
  const [textInput, setTextInput] = useState<{ x: number; y: number } | null>(null);
  const [textValue, setTextValue] = useState('');
  const [textFont, setTextFont] = useState('Poppins');

  // Drawing tracking states
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const startPointRef = useRef<{ x: number; y: number } | null>(null);
  const snapshotRef = useRef<ImageData | null>(null);

  const colors = ['#ffffff', '#ff8c00', '#10b981', '#3b82f6', '#a855f7', '#f43f5e', '#ffd700', '#18181b'];
  const strokes = [2, 4, 8, 14];

  // Load saved boards list on mount & Cloud Sync
  useEffect(() => {
    const saved = localStorage.getItem('bia_board_saves');
    if (saved) {
      try {
        setSavedBoards(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading saved boards', e);
      }
    }

    const unsubAuth = listenToAuth((user) => {
      if (!user) return;
      const unsubCloud = subscribeToUserDataFromCloud(
        user.uid,
        'bia_board_saves',
        (data) => {
          if (data && typeof data === 'object') {
            setSavedBoards(data);
            localStorage.setItem('bia_board_saves', JSON.stringify(data));
          }
        },
        () => {
          const stored = localStorage.getItem('bia_board_saves');
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              syncToCloud(user.uid, 'bia_board_saves', parsed);
            } catch (e) {}
          }
        }
      );
      return () => unsubCloud();
    });
    return () => unsubAuth();
  }, []);

  // Sync canvas background on theme change
  useEffect(() => {
    const activePreset = BOARD_THEMES.find((t) => t.id === boardTheme);
    if (!activePreset) return;

    // Automatically swap white/dark ink depending on board background theme
    if (!activePreset.dark) {
      if (color === '#ffffff') {
        setColor('#18181b');
      }
    } else {
      if (color === '#18181b' || color === '#000000') {
        setColor('#ffffff');
      }
    }
  }, [boardTheme]);

  // Resize canvas according to container with debounce
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Save drawing before resize
      const data = canvas.toDataURL();

      // Adjust dimensions
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;

      // Restore drawing
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = data;
    };

    let timeoutId: NodeJS.Timeout;
    const observer = new ResizeObserver(() => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(resizeCanvas, 150); // debounce resize trigger
    });

    observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
      clearTimeout(timeoutId);
    };
  }, [focusClassMode]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const handleStartDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const pt = getCoordinates(e);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!pt || !canvas || !ctx) return;

    // Close text box if clicking elsewhere while not committed
    if (tool !== 'text') {
      setTextInput(null);
    }

    if (tool === 'text') {
      setTextInput({ x: pt.x, y: pt.y });
      setTextValue('');
      return;
    }

    if (tool === 'stamp') {
      ctx.font = `${28 + stroke * 2}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(selectedStamp, pt.x, pt.y);
      pushHistory();
      return;
    }

    drawingRef.current = true;
    lastPointRef.current = pt;
    startPointRef.current = pt;

    if (['rect', 'circle', 'line'].includes(tool)) {
      snapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    }
  };

  const handleDrawMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const pt = getCoordinates(e);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const last = lastPointRef.current;
    const startPt = startPointRef.current;

    if (!pt || !canvas || !ctx || !last || !startPt) return;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (tool === 'eraser') {
      // Chalk eraser / Whiteboard eraser effect
      const currentThemePreset = BOARD_THEMES.find((t) => t.id === boardTheme);
      ctx.strokeStyle = currentThemePreset?.bg || '#16171b';
      ctx.lineWidth = stroke * 6;
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
    } else if (tool === 'pen' || tool === 'pencil') {
      ctx.strokeStyle = color;
      ctx.globalAlpha = tool === 'pencil' ? 0.45 : 1.0;
      ctx.lineWidth = stroke;
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    } else if (tool === 'marker') {
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = stroke * 3.5;
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    } else if (snapshotRef.current) {
      // Temporary drag-to-size drawing helpers
      ctx.putImageData(snapshotRef.current, 0, 0);
      ctx.strokeStyle = color;
      ctx.lineWidth = stroke;

      if (tool === 'rect') {
        ctx.strokeRect(startPt.x, startPt.y, pt.x - startPt.x, pt.y - startPt.y);
      } else if (tool === 'circle') {
        const rx = (pt.x - startPt.x) / 2;
        const ry = (pt.y - startPt.y) / 2;
        ctx.beginPath();
        ctx.ellipse(startPt.x + rx, startPt.y + ry, Math.abs(rx), Math.abs(ry), 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (tool === 'line') {
        ctx.beginPath();
        ctx.moveTo(startPt.x, startPt.y);
        ctx.lineTo(pt.x, pt.y);
        ctx.stroke();
      }
    }

    lastPointRef.current = pt;
  };

  const handleEndDraw = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    snapshotRef.current = null;
    pushHistory();
  };

  const handleCommitText = () => {
    if (!textInput || !textValue.trim()) {
      setTextInput(null);
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.fillStyle = color;

    let fontStyle = '';
    const size = 16 + stroke * 2.5;

    if (textFont === 'Caveat') {
      fontStyle = `bold ${size * 1.3}px 'Caveat', cursive`;
    } else if (textFont === 'Playfair Display') {
      fontStyle = `bold ${size}px 'Playfair Display', serif`;
    } else if (textFont === 'JetBrains Mono') {
      fontStyle = `${size * 0.9}px 'JetBrains Mono', monospace`;
    } else {
      fontStyle = `600 ${size}px 'Poppins', sans-serif`;
    }

    ctx.font = fontStyle;
    ctx.fillText(textValue.trim(), textInput.x, textInput.y);

    pushHistory();
    setTextInput(null);
    setTextValue('');
  };

  // State undo/redo stack
  const pushHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const snap = canvas.toDataURL();
    setHistory((prev) => [...prev.slice(-29), snap]); // max 30 snapshots
    setFuture([]);
  };

  const handleUndo = () => {
    if (history.length < 2) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const currentSnap = history[history.length - 1];
    setFuture((prev) => [...prev, currentSnap]);

    const newHistory = history.slice(0, -1);
    setHistory(newHistory);

    const prevSnap = newHistory[newHistory.length - 1];
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
    img.src = prevSnap;
  };

  const handleRedo = () => {
    if (future.length === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const nextSnap = future[future.length - 1];
    setFuture((prev) => prev.slice(0, -1));
    setHistory((prev) => [...prev, nextSnap]);

    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
    img.src = nextSnap;
  };

  // Add customized images to board
  const handleAddImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        // Place neatly near center top of blackboard
        const targetWidth = Math.min(img.width, 350);
        const scale = targetWidth / img.width;
        const targetHeight = img.height * scale;

        ctx.drawImage(img, 60, 60, targetWidth, targetHeight);
        pushHistory();
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Multi-page Slide selectors
  const handleAddSlide = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const currentSnap = canvas.toDataURL();
    const updatedSlides = [...slides];
    updatedSlides[currentSlide] = currentSnap;
    updatedSlides.push(null);

    setSlides(updatedSlides);
    setCurrentSlide(updatedSlides.length - 1);

    // Clear board for new blank page
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    setHistory([]);
    setFuture([]);
  };

  const handleGoToSlide = (index: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // Save active slide drawing
    const currentSnap = canvas.toDataURL();
    const updatedSlides = [...slides];
    updatedSlides[currentSlide] = currentSnap;
    setSlides(updatedSlides);

    // Change slide page
    setCurrentSlide(index);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const targetSnap = updatedSlides[index];
    if (targetSnap) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        // seed history with restored state
        setHistory([targetSnap]);
        setFuture([]);
      };
      img.src = targetSnap;
    } else {
      setHistory([]);
      setFuture([]);
    }
  };

  const handleDeleteSlide = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (slides.length <= 1) return;
    if (!window.confirm(`Excluir o slide ${index + 1}? Essa ação não pode ser desfeita.`)) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const updatedSlides = slides.filter((_, i) => i !== index);
    setSlides(updatedSlides);

    // Determine target index
    const nextIdx = Math.max(0, index - 1);
    setCurrentSlide(nextIdx);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const targetSnap = updatedSlides[nextIdx];
    if (targetSnap) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        setHistory([targetSnap]);
        setFuture([]);
      };
      img.src = targetSnap;
    } else {
      setHistory([]);
      setFuture([]);
    }
  };

  const handleClearCurrentSlide = () => {
    if (!window.confirm('Limpar completamente o desenho deste slide?')) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pushHistory();
  };

  // Export board files
  const handleExportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `blackboard-brazilian-${Date.now()}.png`;
    link.click();
  };

  // Persistent Local Saving Logic
  const handleSaveBoard = () => {
    setNewBoardName('');
    setSaveModalOpen(true);
  };

  const handleSaveBoardConfirm = () => {
    if (!newBoardName.trim() || !canvasRef.current) return;

    const updatedSlides = [...slides];
    updatedSlides[currentSlide] = canvasRef.current.toDataURL();

    const currentPreset = BOARD_THEMES.find((t) => t.id === boardTheme);

    const newSave: SavedBoard = {
      name: newBoardName.trim(),
      data: canvasRef.current.toDataURL(),
      slides: updatedSlides,
      currentSlide,
      theme: currentPreset?.dark ? 'dark' : 'light',
      at: new Date().toISOString(),
    };

    const nextBoards = { ...savedBoards, [newBoardName.trim()]: newSave };
    setSavedBoards(nextBoards);
    localStorage.setItem('bia_board_saves', JSON.stringify(nextBoards));
    if (auth.currentUser) {
      syncToCloud(auth.currentUser.uid, 'bia_board_saves', nextBoards);
    }
    setSaveModalOpen(false);

    // trigger success toast
    const toast = document.getElementById('board-saved-toast');
    if (toast) {
      toast.classList.add('opacity-100');
      setTimeout(() => toast.classList.remove('opacity-100'), 2500);
    }
  };

  const handleLoadBoard = (name: string) => {
    const board = savedBoards[name];
    if (!board || !canvasRef.current) return;

    setBoardTheme(board.theme === 'light' ? 'whiteboard' : 'charcoal');
    setSlides(board.slides || [board.data]);
    setCurrentSlide(board.currentSlide || 0);

    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        setHistory([board.data]);
        setFuture([]);
      };
      img.src = board.data;
    }

    setLoadModalOpen(false);
  };

  const handleDeleteSavedBoard = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Tem certeza que deseja excluir a aula "${name}"?`)) return;

    const nextBoards = { ...savedBoards };
    delete nextBoards[name];
    setSavedBoards(nextBoards);
    localStorage.setItem('bia_board_saves', JSON.stringify(nextBoards));
    if (auth.currentUser) {
      syncToCloud(auth.currentUser.uid, 'bia_board_saves', nextBoards);
    }
  };

  const activePreset = BOARD_THEMES.find((t) => t.id === boardTheme) || BOARD_THEMES[0];

  // Tool specifications helper
  const TOOLS = [
    { id: 'pen', label: 'Caneta', icon: Pen, tooltip: 'Caneta Macia' },
    { id: 'pencil', label: 'Giz', icon: Pen, tooltip: 'Giz Texturizado' },
    { id: 'marker', label: 'Marca', icon: Highlighter, tooltip: 'Marca Texto Transparente' },
    { id: 'stamp', label: 'Stickers', icon: Smile, tooltip: 'Selo Pedagógico' },
    { id: 'text', label: 'Texto', icon: Type, tooltip: 'Digitar na Lousa' },
    { id: 'rect', label: 'Retâng.', icon: Square, tooltip: 'Quadrados e Caixas' },
    { id: 'circle', label: 'Círculo', icon: Circle, tooltip: 'Círculos de Destaque' },
    { id: 'line', label: 'Linha', icon: Minus, tooltip: 'Linha de Conexão' },
    { id: 'eraser', label: 'Apagar', icon: Eraser, tooltip: 'Apagador de Feltro' },
  ] as const;

  const cursorStyle = React.useMemo(() => {
    if (tool === 'text') return 'text';
    if (tool === 'rect' || tool === 'circle' || tool === 'line') return 'crosshair';

    let svgContent = '';
    let offsetX = 0;
    let offsetY = 0;

    if (tool === 'pen') {
      svgContent = `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 20h9" stroke="black" stroke-width="3"/>
          <path d="M12 20h9" stroke="white" stroke-width="2"/>
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" fill="rgba(255,255,255,0.2)" stroke="black" stroke-width="3.5"/>
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" fill="rgba(255,255,255,0.2)" stroke="${color === '#ffffff' ? '#ffffff' : color}" stroke-width="2"/>
        </svg>
      `;
      offsetX = 3;
      offsetY = 19;
    } else if (tool === 'pencil') {
      svgContent = `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" fill="${color === '#ffffff' ? '#eeeeee' : color}" stroke="black" stroke-width="3"/>
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" fill="${color === '#ffffff' ? '#eeeeee' : color}" stroke="white" stroke-width="1.5"/>
        </svg>
      `;
      offsetX = 3;
      offsetY = 19;
    } else if (tool === 'marker') {
      svgContent = `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none">
          <path d="m9 11-6 6v3h3l6-6" fill="${color}" stroke="black" stroke-width="3"/>
          <path d="m9 11-6 6v3h3l6-6" fill="${color}" stroke="${color}" stroke-width="1"/>
          <path d="m18 12 3-3-4-4-3 3" stroke="black" stroke-width="3"/>
          <path d="m18 12 3-3-4-4-3 3" stroke="white" stroke-width="1.5"/>
        </svg>
      `;
      offsetX = 3;
      offsetY = 19;
    } else if (tool === 'eraser') {
      svgContent = `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="6" width="20" height="12" rx="3" fill="#f43f5e" stroke="black" stroke-width="3"/>
          <rect x="2" y="6" width="20" height="12" rx="3" fill="#f43f5e" stroke="white" stroke-width="1.5"/>
          <path d="M2 14h20" stroke="black" stroke-width="3"/>
          <path d="M2 14h20" stroke="rgba(255,255,255,0.4)" stroke-width="1.5"/>
        </svg>
      `;
      offsetX = 10;
      offsetY = 10;
    } else if (tool === 'stamp') {
      svgContent = `
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
          <text x="0" y="26" font-size="24">${selectedStamp}</text>
        </svg>
      `;
      offsetX = 12;
      offsetY = 12;
    }

    if (svgContent) {
      const cleanSvg = svgContent.trim().replace(/\s+/g, ' ');
      const base64 = btoa(unescape(encodeURIComponent(cleanSvg)));
      return `url("data:image/svg+xml;base64,${base64}") ${offsetX} ${offsetY}, auto`;
    }

    return 'default';
  }, [tool, color, selectedStamp]);

  return (
    <div className={`w-full ${focusClassMode ? 'fixed inset-0 z-50 flex flex-col bg-neutral-950/85 backdrop-blur-2xl text-white' : 'max-w-7xl mx-auto px-4 md:px-6 pb-12'}`}>
      
      {/* HEADER SECTION - Embedded mode only */}
      {!focusClassMode && (
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
              Brazilian <span className="font-semibold text-amber-400" style={{ color: accentColor }}>Board</span>
            </h1>
            <p className="text-xs md:text-sm text-neutral-400 mt-1">
              Sua lousa virtual dinâmica para explicações gramaticais, anotações de vocabulário, post-its e desenhos.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setLoadModalOpen(true)}
              className="px-3.5 py-2 rounded-xl text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium border border-white/5 transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-black/30"
            >
              <FolderOpen size={13} className="text-amber-400" />
              <span>Aulas Salvas ({Object.keys(savedBoards).length})</span>
            </button>

            <button
              onClick={() => setFocusClassMode(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-500 transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-blue-600/20"
              title="Iniciar Explicação em Tela Cheia no Modo Brazilian Class"
            >
              <Maximize2 size={13} />
              <span>Brazilian Class</span>
            </button>
          </div>
        </div>
      )}

      {/* FLOAT EXIT & BADGE FOR BRAZILIAN CLASS CLASSROOM MODE */}
      {focusClassMode && (
        <div className="fixed right-6 top-6 z-50 flex items-center gap-3">
          <span className="px-3 py-1.5 bg-blue-600 text-white font-extrabold text-xs uppercase tracking-widest rounded-xl shadow-lg border border-blue-400/20">
            Modo Brazilian Class
          </span>
          <button
            onClick={() => setFocusClassMode(false)}
            className="px-4 py-2 bg-red-600/90 hover:bg-red-500 text-white border border-white/10 rounded-xl text-xs font-bold uppercase tracking-wider shadow-2xl transition-all cursor-pointer flex items-center gap-2 backdrop-blur-md"
          >
            <Minimize2 size={14} />
            <span>Sair do Modo Brazilian Class</span>
          </button>
        </div>
      )}

      {/* PRIMARY WORKSPACE */}
      <div className={`relative flex flex-col md:flex-row border border-white/10 overflow-hidden shadow-2xl transition-all ${
        focusClassMode 
          ? 'flex-1 w-full h-full' 
          : 'rounded-2xl h-[560px] md:h-[650px] bg-neutral-900/40 backdrop-blur-md'
      }`}>
        
        {/* LEFT TOOLBAR */}
        <div className={`flex md:flex-col items-center gap-1.5 p-2 border-b md:border-b-0 md:border-r border-white/5 backdrop-blur-xl z-20 ${
          focusClassMode 
            ? 'w-full md:w-16 bg-neutral-950/80' 
            : 'w-full md:w-16 bg-neutral-900/60'
        }`}>
          {/* Logo Badge in Fullscreen */}
          {focusClassMode && (
            <div className="hidden md:flex flex-col items-center py-2 mb-2">
              <span className="text-[10px] font-bold text-amber-400 font-mono tracking-widest uppercase">BIA</span>
              <span className="text-[7px] text-white/40 tracking-widest uppercase font-mono">Board</span>
            </div>
          )}

          {/* Map tools */}
          <div className="flex md:flex-col flex-wrap gap-1 w-full items-center justify-center">
            {TOOLS.map((t) => {
              const active = tool === t.id;
              const Icon = t.icon;

              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setTool(t.id as any);
                    setTextInput(null);
                  }}
                  className={`relative group w-10 h-10 rounded-xl flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all border ${
                    active
                      ? 'bg-amber-400/10 border-amber-500/30 text-amber-400'
                      : 'bg-white/[0.02] border-transparent text-white/50 hover:text-white hover:bg-white/5'
                  }`}
                  title={t.tooltip}
                >
                  <Icon size={15} />
                  <span className="text-[7px] uppercase font-bold tracking-wider">{t.label}</span>

                  {/* Micro indicator dot */}
                  {active && (
                    <span className="absolute right-1 top-1 w-1.5 h-1.5 rounded-full bg-amber-400 shadow-md shadow-amber-400/50" />
                  )}

                  {/* Tooltip hover */}
                  <span className="absolute left-full ml-2 px-2 py-1 bg-black text-[9px] font-bold uppercase tracking-wider text-white rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-md shadow-black/50">
                    {t.tooltip}
                  </span>
                </button>
              );
            })}

            <div className="h-[1px] w-8 bg-white/10 my-1 hidden md:block" />

            {/* Upload image trigger */}
            <button
              onClick={() => document.getElementById('board-img-upload')?.click()}
              className="relative group w-10 h-10 rounded-xl flex flex-col items-center justify-center gap-0.5 cursor-pointer bg-white/[0.02] border border-transparent text-white/50 hover:text-white hover:bg-white/5 transition-all"
              title="Adicionar Imagem à Lousa"
            >
              <ImageIcon size={15} />
              <span className="text-[7px] uppercase font-bold tracking-wider">Foto</span>

              <span className="absolute left-full ml-2 px-2 py-1 bg-black text-[9px] font-bold uppercase tracking-wider text-white rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                Inserir Imagem / PDF de Apoio
              </span>
            </button>
            <input
              type="file"
              id="board-img-upload"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleAddImage}
            />
          </div>
        </div>

        {/* CANVAS WORKSPACE STAGE */}
        <div
          ref={containerRef}
          className="flex-1 relative h-full overflow-hidden select-none"
          style={{
            backgroundImage: gridOn
              ? `radial-gradient(${activePreset.grid} 1.5px, transparent 1.5px)`
              : undefined,
            backgroundSize: '30px 30px',
            backgroundColor: activePreset.bg,
          }}
        >
          <canvas
            ref={canvasRef}
            onMouseDown={handleStartDraw}
            onMouseMove={handleDrawMove}
            onMouseUp={handleEndDraw}
            onMouseLeave={handleEndDraw}
            onTouchStart={handleStartDraw}
            onTouchMove={handleDrawMove}
            onTouchEnd={handleEndDraw}
            className="block w-full h-full touch-none"
            style={{ cursor: cursorStyle }}
          />

          {/* REALTIME TEXT OVERLAY WRAPPER */}
          {textInput && (
            <div
              className="absolute z-50 flex flex-col gap-2 p-3 bg-neutral-900/95 border border-white/10 rounded-xl shadow-2xl w-64 text-white backdrop-blur-md"
              style={{
                left: Math.max(10, Math.min(textInput.x, (canvasRef.current?.width || 0) - 275)),
                top: Math.max(10, Math.min(textInput.y, (canvasRef.current?.height || 0) - 160))
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] uppercase font-bold tracking-widest text-amber-400 font-mono">Digitar na Lousa</span>
                <select
                  value={textFont}
                  onChange={(e) => setTextFont(e.target.value)}
                  className="bg-white/5 border border-white/10 text-white text-[10px] rounded px-1.5 py-0.5 focus:outline-none focus:border-amber-500 cursor-pointer font-sans"
                >
                  <option value="Poppins" className="bg-neutral-900 text-white">Standard</option>
                  <option value="Caveat" className="bg-neutral-900 text-white font-bold">Giz / Caligrafia</option>
                  <option value="Playfair Display" className="bg-neutral-900 text-white font-serif">Serif Clássica</option>
                  <option value="JetBrains Mono" className="bg-neutral-900 text-white font-mono">Tech Mono</option>
                </select>
              </div>
              <input
                type="text"
                autoFocus
                value={textValue}
                onChange={(e) => setTextValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCommitText();
                  } else if (e.key === 'Escape') {
                    setTextInput(null);
                  }
                }}
                className="bg-white/5 border border-white/15 text-white text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-400 w-full"
                placeholder="Escreva algo e aperte Enter..."
              />
              <div className="flex justify-end gap-1.5">
                <button
                  onClick={() => setTextInput(null)}
                  className="px-2 py-1 text-[9px] uppercase tracking-wider font-bold text-white/50 hover:text-white rounded cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCommitText}
                  className="px-2.5 py-1 text-[9px] uppercase tracking-wider font-bold bg-amber-400 text-black hover:bg-amber-300 rounded-md transition-all cursor-pointer"
                >
                  Inserir
                </button>
              </div>
            </div>
          )}

          {/* QUICK CHALKBAG CONTROLS OVERLAY - TOP RIGHT BAR */}
          <div className="absolute right-4 top-4 flex items-center gap-1.5 bg-black/50 border border-white/10 p-1.5 rounded-xl backdrop-blur-md z-30">
            <button
              onClick={handleUndo}
              disabled={history.length < 2}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all disabled:opacity-30 cursor-pointer"
              title="Desfazer Última Linha"
            >
              <Undo size={13} />
            </button>

            <button
              onClick={handleRedo}
              disabled={future.length === 0}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all disabled:opacity-30 cursor-pointer"
              title="Refazer"
            >
              <Redo size={13} />
            </button>

            <div className="w-[1px] h-4 bg-white/10" />

            <button
              onClick={() => setGridOn(!gridOn)}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                gridOn ? 'text-amber-400 bg-amber-400/10' : 'text-white/60 hover:bg-white/10'
              }`}
              title="Grade Auxiliar"
            >
              <Grid size={13} />
            </button>

            <div className="w-[1px] h-4 bg-white/10" />

            <button
              onClick={handleClearCurrentSlide}
              className="px-2 py-1 text-[9px] font-bold tracking-wider uppercase bg-red-600/20 border border-red-500/20 text-red-300 hover:bg-red-600/30 rounded transition-all cursor-pointer"
              title="Limpar Desenho Atual"
            >
              Limpar
            </button>
          </div>

          {/* SLIDES CAROUSEL DECK (FILMSTRIP OVERLAY) */}
          <div className="absolute right-4 bottom-4 flex items-center gap-2 bg-black/60 border border-white/10 p-2 rounded-xl backdrop-blur-md z-30 max-w-[90%] overflow-x-auto">
            <div className="flex items-center gap-1.5">
              {slides.map((_, i) => (
                <div key={i} className="relative group flex items-center">
                  <button
                    onClick={() => handleGoToSlide(i)}
                    className={`w-9 h-7 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-center ${
                      i === currentSlide
                        ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20'
                        : 'bg-white/5 text-white/50 border border-white/10 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {i + 1}
                  </button>

                  {/* Mini deletion button for multiple slides */}
                  {slides.length > 1 && (
                    <button
                      onClick={(e) => handleDeleteSlide(i, e)}
                      className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[7px]"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}

              <button
                onClick={handleAddSlide}
                className="w-7 h-7 rounded-lg bg-white/10 text-white hover:bg-white/25 transition-all cursor-pointer flex items-center justify-center"
                title="Novo Slide em Branco"
              >
                <Plus size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* BOTTOM FLOATING CHALK PROPERTIES HUD */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col md:flex-row items-center gap-4 bg-neutral-950/90 border border-white/15 rounded-2xl md:rounded-full py-2.5 px-6 backdrop-blur-xl shadow-2xl z-40 max-w-[95%]">
          
          {/* THEMES PRESETS SELECTOR */}
          <div className="flex items-center gap-2">
            <span className="text-[8px] uppercase tracking-wider text-white/40 font-bold font-mono">Fundo</span>
            <div className="flex gap-1.5">
              {BOARD_THEMES.map((themePreset) => {
                const active = boardTheme === themePreset.id;
                return (
                  <button
                    key={themePreset.id}
                    onClick={() => setBoardTheme(themePreset.id)}
                    className={`px-2 py-1 rounded-lg text-[9px] font-medium transition-all cursor-pointer border ${
                      active
                        ? 'bg-amber-400 text-black border-amber-400 font-bold shadow-sm'
                        : 'bg-white/5 text-white/60 border-white/5 hover:text-white'
                    }`}
                  >
                    {themePreset.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="hidden md:block w-[1px] h-4 bg-white/15" />

          {/* DYNAMIC SUB-CONTROLS FOR SELECTED TOOL */}
          {tool === 'stamp' ? (
            /* STAMPS SELECTOR DOCK */
            <div className="flex items-center gap-2">
              <span className="text-[8px] uppercase tracking-wider text-amber-400 font-bold font-mono">Escolher Sticker</span>
              <div className="flex gap-1">
                {STAMPS.map((s) => (
                  <button
                    key={s.emoji}
                    onClick={() => setSelectedStamp(s.emoji)}
                    className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center transition-all cursor-pointer ${
                      selectedStamp === s.emoji
                        ? 'bg-amber-400/15 border border-amber-500 text-amber-400 scale-110'
                        : 'bg-white/5 border border-transparent hover:bg-white/10'
                    }`}
                    title={s.label}
                  >
                    {s.emoji}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* COLOR PICKER (DEFAULT DRAWING TOOLS) */
            <div className="flex items-center gap-2">
              <span className="text-[8px] uppercase tracking-wider text-white/40 font-bold font-mono">Giz</span>
              <div className="flex gap-1.5">
                {colors.map((c) => {
                  const active = color === c;
                  return (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={`w-4.5 h-4.5 rounded-full border border-black/30 cursor-pointer transition-all ${
                        active ? 'scale-125 ring-2 ring-white/50' : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  );
                })}
              </div>
            </div>
          )}

          <div className="w-[1px] h-4 bg-white/15" />

          {/* STROKE SIZES */}
          <div className="flex items-center gap-2">
            <span className="text-[8px] uppercase tracking-wider text-white/40 font-bold font-mono">Traço</span>
            <div className="flex gap-1.5">
              {strokes.map((s) => {
                const active = stroke === s;
                return (
                  <button
                    key={s}
                    onClick={() => setStroke(s)}
                    className={`w-6 h-6 rounded-lg text-[9px] flex items-center justify-center transition-all cursor-pointer ${
                      active
                        ? 'bg-amber-400 text-black font-bold'
                        : 'bg-white/5 hover:bg-white/10 text-white/60'
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="hidden md:block w-[1px] h-4 bg-white/15" />

          {/* ACTION BUTTONS (SAVE, EXPORT) */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleSaveBoard}
              className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 transition-all cursor-pointer flex items-center gap-1"
              title="Gravar Aula no Backup"
            >
              <Save size={13} />
              <span className="text-[9px] uppercase tracking-wider font-bold">Salvar</span>
            </button>

            <button
              onClick={handleExportPNG}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all cursor-pointer flex items-center gap-1"
              title="Exportar lousa para imagem PNG"
            >
              <Download size={13} />
              <span className="text-[9px] uppercase tracking-wider font-bold">PNG</span>
            </button>
          </div>

        </div>

      </div>

      {/* QUICK SUCCESS SAVED TOAST */}
      <div
        id="board-saved-toast"
        className="fixed bottom-6 left-6 z-[9999] px-4 py-2.5 bg-emerald-600 border border-emerald-500/20 text-white text-[10px] font-bold tracking-widest uppercase rounded-full shadow-2xl opacity-0 transition-opacity duration-300 pointer-events-none"
      >
         AULA DE EXPLANATION SALVA COM SUCESSO!
      </div>

      {/* SAVE BOARD LESSON DIALOG MODAL */}
      {saveModalOpen && (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center bg-black/85 backdrop-blur-md px-4">
          <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-sm font-bold tracking-widest uppercase text-center mb-2 text-amber-400">
              Salvar Aula no Histórico
            </h3>
            <p className="text-xs text-white/50 text-center mb-6 leading-relaxed">
              Dê um título específico para esta lousa (todos os slides inclusos) para recarregar rapidamente na próxima aula:
            </p>
            <input
              type="text"
              placeholder="Ex.: Simple Present vs Present Continuous"
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 mb-6"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setSaveModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-bold uppercase tracking-wider cursor-pointer transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveBoardConfirm}
                className="flex-1 py-2.5 rounded-xl text-black text-xs font-bold uppercase tracking-wider cursor-pointer transition-all hover:brightness-110"
                style={{ backgroundColor: accentColor || '#ffd700' }}
              >
                Salvar Aula
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOAD LESSONS DIALOG LIST MODAL */}
      {loadModalOpen && (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center bg-black/85 backdrop-blur-md px-4">
          <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-sm font-bold tracking-widest uppercase text-center mb-4 text-amber-400">
              Carregar Aula Salva
            </h3>

            {Object.keys(savedBoards).length === 0 ? (
              <div className="text-center py-10 flex flex-col items-center justify-center gap-2">
                <HelpCircle size={32} className="text-white/20" />
                <p className="text-xs text-white/30 italic">
                  Nenhuma aula gravada no backup local ainda.
                </p>
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto flex flex-col gap-2 mb-6">
                {Object.keys(savedBoards).map((name) => {
                  const b = savedBoards[name];
                  return (
                    <div
                      key={name}
                      onClick={() => handleLoadBoard(name)}
                      className="p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/5 transition-all flex items-center justify-between cursor-pointer group"
                    >
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
                          {name}
                        </span>
                        <span className="text-[9px] text-white/40 uppercase mt-0.5 font-mono">
                          {new Date(b.at).toLocaleDateString()} • {b.slides?.length || 1} slides • Tema {b.theme === 'light' ? 'Claro' : 'Escuro'}
                        </span>
                      </div>
                      <button
                        onClick={(e) => handleDeleteSavedBoard(name, e)}
                        className="p-2 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 cursor-pointer transition-all"
                        title="Deletar Aula"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <button
              onClick={() => setLoadModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-bold uppercase tracking-wider cursor-pointer transition-all"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
