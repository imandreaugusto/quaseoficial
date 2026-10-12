import { useState } from 'react';
import { ArrowLeft, BookOpen, BookOpenText } from 'lucide-react';

const COMICS = [
  { id: '1akrvp8M1il1yIeBINDikTdTnlDqN3iJT', title: 'Captain America and Wolverine' },
  { id: '1-bjyMKouTeUgmI01az-vWM163dEjY2_b', title: 'Iron Man Kitty Pryde' },
  { id: '1Ke53GeHubtOYh8zRgBmz-W5p9u2MxEy0', title: 'Loki and Mister Snister' },
  { id: '1ChlwfTKhWD5Ld_p7NV4pXTUGBYgo0ViO', title: 'Spider-Man and The Beast' },
  { id: '1ADCLVTQF0c7u1jfmiS8YFNPSzR-z-QsO', title: 'Spider-Woman and Kitty Pryde' },
  { id: '1jNLf75XoIIz-ubGyMjkikv91Zpg7p58E', title: 'The Incredible Hulk and Wolverine' },
];

export const BrazilianHQ = () => {
  const [selectedComicId, setSelectedComicId] = useState<string | null>(null);
  const selectedComic = COMICS.find((comic) => comic.id === selectedComicId);

  if (selectedComic) {
    return (
      <section className="flex h-[calc(100dvh-5rem)] min-h-[32rem] flex-col overflow-hidden rounded-3xl border border-white/10 bg-neutral-950/90 shadow-2xl">
        <header className="flex shrink-0 items-center gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => setSelectedComicId(null)}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft size={16} />
            Todas as HQs
          </button>
          <h1 className="min-w-0 truncate text-sm font-bold text-white sm:text-base">{selectedComic.title}</h1>
        </header>
        <div
          className="relative min-h-0 flex-1 overflow-hidden bg-neutral-900"
          style={{
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0, #000 40px, #000 calc(100% - 40px), transparent 100%)',
            maskImage: 'linear-gradient(to bottom, transparent 0, #000 40px, #000 calc(100% - 40px), transparent 100%)',
          }}
        >
          <iframe
            key={selectedComic.id}
            src={`https://drive.google.com/file/d/${selectedComic.id}/preview?rm=minimal`}
            title={`Leitor: ${selectedComic.title}`}
            className="absolute inset-x-0 -top-14 h-[calc(100%+3.5rem)] w-full border-0 bg-neutral-900"
            allow="autoplay"
            allowFullScreen
          />
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-amber-400/25 bg-amber-400/10 text-amber-300">
          <BookOpenText size={27} />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-300/80">Leitura</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Brazilian HQ</h1>
          <p className="mt-1 text-sm text-white/60">Escolha uma história para ler aqui na plataforma.</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {COMICS.map((comic) => (
          <button
            key={comic.id}
            type="button"
            onClick={() => setSelectedComicId(comic.id)}
            className="group flex min-h-24 items-center gap-4 rounded-2xl border border-white/10 bg-neutral-950/55 p-4 text-left shadow-lg transition hover:-translate-y-0.5 hover:border-amber-400/40 hover:bg-white/[0.07]"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/5 text-amber-300 transition group-hover:bg-amber-400/10">
              <BookOpen size={22} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold leading-snug text-white">{comic.title}</span>
              <span className="mt-1 block text-xs text-white/45">Abrir para ler</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
};
