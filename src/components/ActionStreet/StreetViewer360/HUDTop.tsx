import { ArrowLeft, Backpack, BookMarked, BookOpen, Camera, Coins } from 'lucide-react';
import { getActionDollarNote } from '../ActionDollarNotes';
import { glass } from '../shared/glass';
import StreakChip from '../shared/StreakChip';
import AmbientSoundToggle from '../AmbientSoundToggle';
import type { City } from '../../../types/actionStreet';

interface Props {
  cityName: string;
  spotName: string;
  balance: number;
  streak: number;
  visaAlert: boolean;
  weatherPreset: City['weatherPreset'];
  onBack: () => void;
  onOpenCamera: () => void;
  onPassport: () => void;
  onBackpack: () => void;
  onNotebook: () => void;
}

export default function HUDTop({ cityName, spotName, balance, streak, visaAlert, weatherPreset, onBack, onOpenCamera, onPassport, onBackpack, onNotebook }: Props) {
  return (
    <header className="absolute inset-x-0 top-[4.25rem] z-20 flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6">
      <div className={`flex items-center gap-3 py-2 pl-2 pr-5 ${glass.panelOverImagery} !rounded-full`}>
        <button type="button" onClick={onBack} aria-label="Voltar ao lobby" className={glass.iconButton}>
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <p className={glass.label}>{cityName}</p>
          <p className="truncate text-sm font-black leading-tight text-white">{spotName}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <StreakChip count={streak} className="hidden sm:inline-flex" />
        <div className={`${glass.panelOverImagery} !rounded-full flex items-center gap-2 px-4 py-2.5`} aria-label={`Saldo: ${balance} Action Dollars`}>
          <img src={getActionDollarNote(cityName).image} alt="" className="h-5 w-8 rounded-sm object-cover" />
          <Coins className="h-4 w-4 text-amber-300" aria-hidden="true" />
          <span className="text-sm font-black tabular-nums text-white">{balance}</span>
          <span className={`${glass.label} hidden sm:inline`}>Action Dollars</span>
        </div>
        <button type="button" onClick={onOpenCamera} aria-label="Abrir câmera Polaroid e álbum" className={glass.iconButton}>
          <Camera className="h-5 w-5" />
        </button>
        <AmbientSoundToggle weather={weatherPreset} />
        <button type="button" onClick={onPassport} aria-label={visaAlert ? 'Rever Visto/Passaporte (visto expirado)' : 'Rever Visto/Passaporte'} title="Rever Visto/Passaporte" className={`relative ${glass.iconButton}`}>
          <BookOpen className="h-5 w-5" />
          {visaAlert && <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-slate-950 bg-amber-400" />}
        </button>
        <button type="button" data-notebook-button onClick={onNotebook} aria-label="Abrir Caderno de Campo" title="Caderno de Campo" className={glass.iconButton}>
          <BookMarked className="h-5 w-5" />
        </button>
        <button type="button" data-backpack-button onClick={onBackpack} aria-label="Abrir coleção e descobertas" className={glass.iconButton}>
          <Backpack className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
