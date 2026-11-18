import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { lookupDictionary, sanitizeWord, translateText } from '../../../lib/translator';
import type { SpeechRate } from '../../../types/actionStreet';

interface Popup {
  word: string;
  text: string;
  loading: boolean;
  error: string;
  left: number;
  top: number;
}

interface Props {
  text: string;
  className?: string;
  speechRate?: SpeechRate;
}

const POPUP_WIDTH = 280;

function getPopupPosition(rect: DOMRect) {
  const left = Math.min(Math.max(12, rect.left + rect.width / 2 - POPUP_WIDTH / 2), window.innerWidth - POPUP_WIDTH - 12);
  const below = rect.bottom + 10;
  const top = below + 120 > window.innerHeight ? Math.max(12, rect.top - 110) : below;
  return { left, top };
}

export default function ClickableText({ text, className, speechRate = 1 }: Props) {
  const [popup, setPopup] = useState<Popup | null>(null);
  const requestId = useRef(0);

  const handleWordClick = async (word: string, event: React.MouseEvent<HTMLButtonElement>) => {
    const wordToTranslate = sanitizeWord(word);
    if (!wordToTranslate) return;

    const position = getPopupPosition(event.currentTarget.getBoundingClientRect());
    const id = ++requestId.current;
    setPopup({ word: wordToTranslate, text: '', loading: false, error: '', ...position });

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(wordToTranslate);
      utterance.lang = 'en-US';
      utterance.rate = speechRate;
      window.speechSynthesis.speak(utterance);
    }

    const dictionaryMatch = lookupDictionary(wordToTranslate);
    if (dictionaryMatch) {
      setPopup((current) => (current?.word === wordToTranslate ? { ...current, text: dictionaryMatch } : current));
      return;
    }

    setPopup((current) => (current?.word === wordToTranslate ? { ...current, loading: true } : current));
    try {
      const translated = await translateText(wordToTranslate);
      if (requestId.current === id) {
        setPopup((current) => (current?.word === wordToTranslate ? { ...current, text: translated, loading: false } : current));
      }
    } catch {
      if (requestId.current === id) {
        setPopup((current) =>
          current?.word === wordToTranslate
            ? { ...current, loading: false, error: 'Não foi possível obter a tradução agora.' }
            : current
        );
      }
    }
  };

  const parts = text.split(/(\s+)/);

  return (
    <>
      <p className={className}>
        {parts.map((part, index) =>
          /^\s+$/.test(part) ? (
            part
          ) : (
            <button
              key={index}
              type="button"
              onClick={(event) => void handleWordClick(part, event)}
              className="rounded px-0.5 text-left transition-colors hover:bg-orange-400/30 focus:outline-none focus-visible:bg-orange-400/30"
            >
              {part}
            </button>
          )
        )}
      </p>

      {popup &&
        createPortal(
          <div
            role="dialog"
            aria-label={`Tradução de ${popup.word}`}
            className="fixed z-[100] w-[280px] rounded-2xl border border-white/20 bg-slate-950/95 p-3 text-sm text-white shadow-2xl"
            style={{ left: popup.left, top: popup.top }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold text-blue-200">{popup.word}</p>
                {popup.loading && <p className="mt-1 text-white/70">Traduzindo...</p>}
                {popup.text && <p className="mt-1">{popup.text}</p>}
                {popup.error && <p className="mt-1 text-rose-300">{popup.error}</p>}
              </div>
              <button
                type="button"
                onClick={() => setPopup(null)}
                className="rounded-full p-1 text-white/70 hover:bg-white/10 hover:text-white"
                aria-label="Fechar tradução"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
