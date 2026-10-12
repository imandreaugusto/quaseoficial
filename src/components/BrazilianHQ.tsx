import { useState, type FC } from 'react';
import { ArrowLeft, BookOpen, BookOpenText, Check, CheckCircle2, RotateCcw } from 'lucide-react';

const COMICS = [
  { id: '1akrvp8M1il1yIeBINDikTdTnlDqN3iJT', title: 'Captain America and Wolverine' },
  { id: '1-bjyMKouTeUgmI01az-vWM163dEjY2_b', title: 'Iron Man Kitty Pryde' },
  { id: '1Ke53GeHubtOYh8zRgBmz-W5p9u2MxEy0', title: 'Loki and Mister Snister' },
  { id: '1ChlwfTKhWD5Ld_p7NV4pXTUGBYgo0ViO', title: 'Spider-Man and The Beast' },
  { id: '1ADCLVTQF0c7u1jfmiS8YFNPSzR-z-QsO', title: 'Spider-Woman and Kitty Pryde' },
  { id: '1jNLf75XoIIz-ubGyMjkikv91Zpg7p58E', title: 'The Incredible Hulk and Wolverine' },
];

const READ_COMICS_KEY = -3;
type ReadFilter = 'all' | 'unread' | 'read';

interface BrazilianHQProps {
  learnedWords: Record<number, string[]>;
  onUpdateLearnedWords: (next: Record<number, string[]>) => void;
}

export const BrazilianHQ: FC<BrazilianHQProps> = ({ learnedWords, onUpdateLearnedWords }) => {
  const [selectedComicId, setSelectedComicId] = useState(COMICS[0].id);
  const [readerOpen, setReaderOpen] = useState(false);
  const [readFilter, setReadFilter] = useState<ReadFilter>('all');
  const selectedComic = COMICS.find((comic) => comic.id === selectedComicId) || COMICS[0];
  const readComicIds = learnedWords[READ_COMICS_KEY] || [];
  const isRead = (comicId: string) => readComicIds.includes(comicId);
  const visibleComics = COMICS.filter((comic) =>
    readFilter === 'all' || (readFilter === 'read' ? isRead(comic.id) : !isRead(comic.id))
  );
  const readCount = COMICS.filter((comic) => isRead(comic.id)).length;

  const toggleReadStatus = (comicId: string) => {
    const nextReadIds = isRead(comicId)
      ? readComicIds.filter((id) => id !== comicId)
      : [...readComicIds, comicId];
    onUpdateLearnedWords({ ...learnedWords, [READ_COMICS_KEY]: nextReadIds });
  };

  const renderReaderFrame = (preview = false) => (
    <div
      className="relative min-h-0 flex-1 overflow-hidden bg-neutral-900"
      style={{
        WebkitMaskImage: preview ? undefined : 'linear-gradient(to bottom, transparent 0, #000 40px, #000 calc(100% - 40px), transparent 100%)',
        maskImage: preview ? undefined : 'linear-gradient(to bottom, transparent 0, #000 40px, #000 calc(100% - 40px), transparent 100%)',
      }}
    >
      <iframe
        key={selectedComic.id}
        src={`https://drive.google.com/file/d/${selectedComic.id}/preview?rm=minimal`}
        title={`Leitor: ${selectedComic.title}`}
        className={`absolute border-0 bg-neutral-900 ${
          preview ? 'inset-y-0 left-0 h-full w-[calc(100%+16px)]' : 'inset-x-0 -top-14 h-[calc(100%+3.5rem)] w-[calc(100%+16px)]'
        }`}
        allow="autoplay"
        allowFullScreen
      />
    </div>
  );

  if (readerOpen) {
    return (
      <section className="flex h-[calc(100dvh-5rem)] min-h-[32rem] flex-col overflow-hidden rounded-3xl border border-white/10 bg-neutral-950/90 shadow-2xl">
        <header className="flex shrink-0 items-center gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => setReaderOpen(false)}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft size={16} />
            Voltar à biblioteca
          </button>
          <h1 className="min-w-0 truncate text-sm font-bold text-white sm:text-base">{selectedComic.title}</h1>
        </header>
        {renderReaderFrame()}
      </section>
    );
  }

  return (
    <section className="mx-auto flex h-[calc(100dvh-5rem)] min-h-[32rem] w-full max-w-7xl flex-col px-3 py-4 text-white sm:px-5 sm:py-5">
      <header className="mb-4 flex shrink-0 items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-400/25 bg-amber-400/10 text-amber-300">
          <BookOpenText size={22} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-amber-300/80">Leitura</p>
          <h1 className="text-xl font-black tracking-tight sm:text-2xl">Brazilian HQ</h1>
        </div>
        <p className="ml-auto hidden text-xs text-white/50 sm:block">{readCount} de {COMICS.length} lidas</p>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(10rem,0.75fr)_minmax(0,2fr)] gap-4 lg:grid-cols-[minmax(14rem,0.85fr)_minmax(0,1.7fr)] lg:grid-rows-1">
        <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-neutral-950/65 backdrop-blur-xl">
          <div className="shrink-0 border-b border-white/10 p-3">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">Biblioteca</h2>
              <span className="text-[10px] text-white/40">{visibleComics.length} HQs</span>
            </div>
            <div className="flex gap-1" role="group" aria-label="Filtrar HQs por leitura">
              {([
                ['all', 'Todas'],
                ['unread', 'Não lidas'],
                ['read', 'Lidas'],
              ] as const).map(([filter, label]) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setReadFilter(filter)}
                  aria-pressed={readFilter === filter}
                  className={`flex-1 rounded-full border px-2 py-1.5 text-[10px] font-bold transition ${
                    readFilter === filter
                      ? 'border-amber-300/50 bg-amber-400/20 text-amber-100'
                      : 'border-white/10 bg-white/[0.03] text-white/55 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            <div className="flex flex-col gap-1.5">
              {visibleComics.map((comic) => {
                const comicIsRead = isRead(comic.id);
                return (
                  <button
                    key={comic.id}
                    type="button"
                    onClick={() => setSelectedComicId(comic.id)}
                    aria-pressed={selectedComic.id === comic.id}
                    className={`flex min-h-14 items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition ${
                      selectedComic.id === comic.id
                        ? 'border-amber-400/40 bg-amber-400/10'
                        : 'border-transparent bg-white/[0.025] hover:border-white/10 hover:bg-white/[0.06]'
                    }`}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-amber-300/90">
                      {comicIsRead ? <Check size={15} /> : <BookOpen size={15} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-semibold leading-snug text-white/90">{comic.title}</span>
                      <span className={`mt-0.5 block text-[9px] font-semibold uppercase tracking-wider ${comicIsRead ? 'text-emerald-300/80' : 'text-white/35'}`}>
                        {comicIsRead ? 'Já lida' : 'Não lida'}
                      </span>
                    </span>
                    {comicIsRead && <CheckCircle2 size={14} className="shrink-0 text-emerald-300/80" />}
                  </button>
                );
              })}
              {visibleComics.length === 0 && (
                <p className="px-3 py-8 text-center text-xs text-white/45">Nenhuma HQ nesta lista.</p>
              )}
            </div>
          </div>
        </aside>

        <article className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-neutral-950/65 shadow-xl backdrop-blur-xl">
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-amber-300/70">Prévia da HQ</p>
              <h2 className="truncate text-sm font-bold text-white sm:text-base">{selectedComic.title}</h2>
            </div>
            <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ${
              isRead(selectedComic.id)
                ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200'
                : 'border-white/10 bg-white/5 text-white/55'
            }`}>
              {isRead(selectedComic.id) ? 'Já lida' : 'Não lida'}
            </span>
          </header>

          <div className="relative min-h-0 flex-1 overflow-hidden p-2 sm:p-3">
            <div className="h-full min-h-0 overflow-hidden rounded-xl border border-white/10">
              {renderReaderFrame(true)}
            </div>
          </div>

          <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-white/10 px-3 py-3 sm:px-4">
            <button
              type="button"
              onClick={() => toggleReadStatus(selectedComic.id)}
              className={`inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition ${
                isRead(selectedComic.id)
                  ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/15'
                  : 'border-white/10 bg-white/5 text-white/75 hover:bg-white/10 hover:text-white'
              }`}
            >
              {isRead(selectedComic.id) ? <RotateCcw size={15} /> : <CheckCircle2 size={15} />}
              {isRead(selectedComic.id) ? 'Marcar como não lida' : 'Marcar como lida'}
            </button>
            <button
              type="button"
              onClick={() => setReaderOpen(true)}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-amber-300/40 bg-amber-400 px-4 text-xs font-bold text-neutral-950 shadow-lg shadow-amber-500/10 transition hover:bg-amber-300"
            >
              <BookOpen size={15} />
              Ler HQ
            </button>
          </footer>
        </article>
      </div>
    </section>
  );
};
