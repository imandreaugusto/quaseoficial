import { useState, type FC } from 'react';
import { ArrowLeft, BookOpen, Check, CheckCircle2, RotateCcw, VenetianMask } from 'lucide-react';

const CATEGORIES = [
  {
    id: 'a+x',
    name: 'A+X',
    comics: [
      { id: '16PcBwXjMkQzkB3k08ECaRzI6HE4iR8JC', title: 'Captain America and Wolverine' },
      { id: '1u7XMWU6QMURD2uq6V0lg-hrt2xBrngO6', title: 'Iron Man Kitty Pryde' },
      { id: '1pc9v0k6JoNiR5nZWMnlYGShXj88c_PO-', title: 'Loki and Mister Snister' },
      { id: '11UHt1plpFKLQB2gK1Q5pZENI1O5u0z1L', title: 'Spider-Man and The Beast' },
      { id: '1j_xNsai8aQcllVLV9ZI5mv6oTfJpzxfB', title: 'Spider-Woman and Kitty Pryde' },
      { id: '15Ub5fnbctEygNPq68kcsDqs4Vy78VnLW', title: 'The Incredible Hulk and Wolverine' },
    ],
  },
  {
    id: 'all-new-x-men',
    name: 'All New X-Men',
    comics: [
      { id: '13yh6siBjyr1zJRoqYaMdc59r-YBCEu25', title: 'All New X-Men 001' },
      { id: '1xwcufjcY1c0tTnKEQm6O7wvBK8woQMn2', title: 'All New X-Men 002' },
      { id: '1Ps45T1b2Pzon5qIb8ZGBhyIU5AQIabzD', title: 'All New X-Men 003' },
      { id: '1cmXC8gnulAKfRWabr9eVOvR6qjNA2GDm', title: 'All New X-Men 004' },
      { id: '1RtxX7f0m5HW0M47tQYaYj6uUnnXXntBT', title: 'All New X-Men 005' },
      { id: '1zKCjTqKJWLILTBoK2-mhUjYt55PIB2Xr', title: 'All New X-Men 006' },
      { id: '1xYqgeKuPssHtr64kqw8XX1simobjaFDf', title: 'All New X-Men 007' },
      { id: '1DZBLPJQ8qej_dzBntYDcyMJpF0VD8VGT', title: 'All New X-Men 008' },
      { id: '1TZMuYxSTqKygjrQaCwNcuOXeMDX7Ho-p', title: 'All New X-Men 009' },
      { id: '12O_qH3q80p7vEJzk3kMFTI8YCTiW5Kh5', title: 'All New X-Men 010' },
      { id: '1QFoub9HZHprdsd9lCjQnDwjwod4_YhdB', title: 'All New X-Men 011' },
      { id: '1uEX7zJBqlDwX1lNKP_Jxf674X2sLbfgc', title: 'All New X-Men 012' },
    ],
  },
  {
    id: 'avengers',
    name: 'Avengers',
    comics: [
      { id: '1PLk7Gus_H8DAI63z_95SCe1jnMxXHZxt', title: 'Avengers 001' },
      { id: '1gazPU6rVnf6pQPBJH_vJ25OipkmMKPm2', title: 'Avengers 002' },
      { id: '1mInxD1-_xc-nS_MbaaUAnXxmffvNvrPm', title: 'Avengers 002 (cópia)' },
      { id: '1SCEj1M5_0d8tXmxzao9MQ9E0qEE3hSzb', title: 'Avengers 003' },
      { id: '1jdl2tswkV-COi3WxoW9OqL8at3OtDisL', title: 'Avengers 004' },
      { id: '1N9AGHvbXnRS2lraFGVnT0WjsuJ5Ps664', title: 'Avengers 005 (2013)' },
      { id: '1V7mGX5sPMdITGtZZUjuoFPI_ye2opLuY', title: 'Avengers 005 (2014)' },
      { id: '1enaZqcRLXhvpW-DcMBO8mGuFOwX4ZKwl', title: 'Avengers 006' },
      { id: '1TsFXOyORsSWZoYsIDDehhW1VwNWm_RMm', title: 'Avengers 008' },
      { id: '1mubjN_p8wKkz7ofInSsyuzz7oAJbMC4V', title: 'Avengers 009' },
      { id: '1NSczKafXle8lhRMLeVP-og0bSC8BoPyL', title: 'Avengers 010' },
      { id: '1n429wYP4X5M1WLRiPxzwm31PuBZRop2H', title: 'Avengers 011' },
    ],
  },
  {
    id: 'avengers-arena',
    name: 'Avengers Arena',
    comics: [
      { id: '1gny7DNMcGP_wUJzI3f-ToNoHL23Fdlzs', title: 'Avengers Arena 001' },
      { id: '1sPpXB7_NPu-YcEvcYKFpDvswSDi5rRW1', title: 'Avengers Arena 001 (cópia)' },
      { id: '19W042eAMUyC9Y87NVF_LTvvgY48Thi5J', title: 'Avengers Arena 003' },
      { id: '1CsVaJrHGY1vx39ttc-9Tktkrw8x2FDTI', title: 'Avengers Arena 003 (cópia)' },
      { id: '1QClPctrYJzoO5Y30r_1V_koFw-1hA8H7', title: 'Avengers Arena 004' },
      { id: '1DDmomTDfaRiIr0elRHepXtyTQi7_aMzt', title: 'Avengers Arena 005' },
      { id: '1bx9ssD-BydNqEoLwC0fF-ReEy-_xyyx6', title: 'Avengers Arena 006' },
      { id: '1R6-4zrpjelqPZ9r2QSQyZ5GBtF0IbymG', title: 'Avengers Arena 007' },
      { id: '1Aoa_ep5aHiiglHI6mn7dwlGWsahYJE3A', title: 'Avengers Arena 009' },
      { id: '1bknRCzh6rLv8egj5iImzj6LeT-Xy98fY', title: 'Avengers Arena 009 (cópia)' },
      { id: '1Bwotv71w5yhIejMAxG7XvJruZnkjJ-29', title: 'Avengers Arena 010' },
      { id: '1OxnmNND4q7WOVrtuUr-TwvNfNKXS9N_C', title: 'Avengers Arena 011' },
    ],
  },
  {
    id: 'black-widow',
    name: 'Black Widow',
    comics: [
      { id: '1mV78V-9skfOSF5IvZBp3QhT1tkXEFDo3', title: 'Black Widow 001' },
      { id: '1iR9e_fM3wcrwZHg9b2KlhBQd8nhHL5xN', title: 'Black Widow 002' },
      { id: '17HzhFPHQfq0HYnvbklaZlyumfl6blAcO', title: 'Black Widow 003' },
      { id: '1k42IW6MAX3g9cfCNEnh-hz5wiHtYFCOY', title: 'Black Widow 004' },
      { id: '1ymPqNaQVKw4fi9PBBEP3fJ02ePtVPZ-I', title: 'Black Widow 005' },
      { id: '17BEHf7j2Qn7whrzKUoiDYJZnm8rEoNn8', title: 'Black Widow 006' },
      { id: '1eb-rgzISyVWiNK4MkWvhdthEFmrLccYO', title: 'Black Widow 007' },
    ],
  },
];

const COMICS = CATEGORIES.flatMap((category) =>
  category.comics.map((comic) => ({ ...comic, category: category.id }))
);
const READ_COMICS_KEY = -3;
type ReadFilter = 'all' | 'unread' | 'read';

interface BrazilianHQProps {
  learnedWords: Record<number, string[]>;
  onUpdateLearnedWords: (next: Record<number, string[]>) => void;
}

export const BrazilianHQ: FC<BrazilianHQProps> = ({ learnedWords, onUpdateLearnedWords }) => {
  const [selectedComicId, setSelectedComicId] = useState(COMICS[0].id);
  const [readerOpen, setReaderOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [readFilter, setReadFilter] = useState<ReadFilter>('all');
  const readComicIds = learnedWords[READ_COMICS_KEY] || [];
  const isRead = (comicId: string) => readComicIds.includes(comicId);
  const visibleComics = COMICS.filter((comic) =>
    (categoryFilter === 'all' || comic.category === categoryFilter)
      && (readFilter === 'all' || (readFilter === 'read' ? isRead(comic.id) : !isRead(comic.id)))
  );
  const selectedComic = visibleComics.find((comic) => comic.id === selectedComicId) || visibleComics[0] || null;
  const readCount = COMICS.filter((comic) => isRead(comic.id)).length;

  const toggleReadStatus = (comicId: string) => {
    const nextReadIds = isRead(comicId)
      ? readComicIds.filter((id) => id !== comicId)
      : [...readComicIds, comicId];
    onUpdateLearnedWords({ ...learnedWords, [READ_COMICS_KEY]: nextReadIds });
  };

  const renderReaderFrame = (comic: (typeof COMICS)[number], preview = false) => (
    <div
      className={`relative overflow-hidden bg-neutral-900 ${preview ? 'h-full w-full' : 'min-h-0 flex-1'}`}
      style={{
        WebkitMaskImage: preview ? undefined : 'linear-gradient(to bottom, transparent 0, #000 40px, #000 calc(100% - 40px), transparent 100%)',
        maskImage: preview ? undefined : 'linear-gradient(to bottom, transparent 0, #000 40px, #000 calc(100% - 40px), transparent 100%)',
      }}
    >
      <iframe
        key={comic.id}
        src={`https://drive.google.com/file/d/${comic.id}/preview?rm=minimal`}
        title={`Leitor: ${comic.title}`}
        className="absolute inset-x-0 -top-14 h-[calc(100%+3.5rem)] w-[calc(100%+16px)] border-0 bg-neutral-900"
        allow="autoplay"
        allowFullScreen
        sandbox="allow-scripts allow-same-origin allow-forms"
      />
    </div>
  );

  if (readerOpen && selectedComic) {
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
        {renderReaderFrame(selectedComic)}
      </section>
    );
  }

  return (
    <section className="mx-auto flex h-[calc(100dvh-5rem)] min-h-[32rem] w-full max-w-7xl flex-col px-3 py-4 text-white sm:px-5 sm:py-5">
      <header className="mb-4 flex shrink-0 items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-400/25 bg-amber-400/10 text-amber-300">
          <VenetianMask size={22} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-amber-300/80">Leitura</p>
          <h1 className="text-xl font-black tracking-tight sm:text-2xl">Brazilian HQ</h1>
        </div>
        <p className="ml-auto hidden text-xs text-white/50 sm:block">{readCount} de {COMICS.length} lidas</p>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(13rem,1.3fr)_minmax(11rem,1fr)] gap-4 lg:grid-cols-[minmax(14rem,0.85fr)_minmax(0,1.7fr)] lg:grid-rows-1">
        <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-neutral-950/65 backdrop-blur-xl">
          <div className="shrink-0 border-b border-white/10 p-3">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">Biblioteca</h2>
              <span className="text-[10px] text-white/40">{visibleComics.length} HQs</span>
            </div>
            <label htmlFor="brazilian-hq-category" className="mb-1 block text-[9px] font-bold uppercase tracking-wider text-white/45">
              Pasta
            </label>
            <select
              id="brazilian-hq-category"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="mb-2 w-full rounded-lg border border-white/10 bg-neutral-900 px-2.5 py-2 text-xs font-semibold text-white outline-none transition focus:border-amber-300/50"
            >
              <option value="all">Todas as pastas</option>
              {CATEGORIES.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
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

          <div className="readclub-library-list min-h-0 flex-1 overflow-y-auto p-2">
            <div className="flex flex-col gap-2">
              {visibleComics.map((comic) => {
                const comicIsRead = isRead(comic.id);
                return (
                  <button
                    key={comic.id}
                    type="button"
                    onClick={() => setSelectedComicId(comic.id)}
                    aria-pressed={selectedComic?.id === comic.id}
                    className={`flex min-h-16 items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                      selectedComic?.id === comic.id
                        ? 'border-amber-400/40 bg-amber-400/10'
                        : 'border-transparent bg-white/[0.025] hover:border-white/10 hover:bg-white/[0.06]'
                    }`}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-amber-300/90">
                      {comicIsRead ? <Check size={18} /> : <BookOpen size={18} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-semibold leading-snug text-white/90">{comic.title}</span>
                      <span className={`mt-1 block text-[9px] font-semibold uppercase tracking-wider ${comicIsRead ? 'text-emerald-300/80' : 'text-white/45'}`}>
                        {comicIsRead ? 'Já lida' : 'Não lida'}
                      </span>
                    </span>
                    {comicIsRead && <CheckCircle2 size={16} className="shrink-0 text-emerald-300/80" />}
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
              <h2 className="truncate text-sm font-bold text-white sm:text-base">{selectedComic?.title || 'Selecione uma pasta ou HQ'}</h2>
            </div>
            {selectedComic && (
              <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ${
                isRead(selectedComic.id)
                  ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200'
                  : 'border-white/10 bg-white/5 text-white/55'
              }`}>
                {isRead(selectedComic.id) ? 'Já lida' : 'Não lida'}
              </span>
            )}
          </header>

          <div className="relative min-h-0 flex-1 overflow-hidden p-2 sm:p-3">
            <div className="h-full min-h-0 overflow-hidden rounded-xl border border-white/10">
              {selectedComic ? renderReaderFrame(selectedComic, true) : (
                <div className="flex h-full items-center justify-center px-6 text-center text-sm text-white/45">
                  Não há HQs nesta pasta com o filtro de leitura selecionado.
                </div>
              )}
            </div>
          </div>

          {selectedComic && <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-white/10 px-3 py-3 sm:px-4">
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
          </footer>}
        </article>
      </div>
    </section>
  );
};
