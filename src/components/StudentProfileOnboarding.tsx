import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Camera, MapPin, UserRound } from 'lucide-react';
import type { UserProfile } from '../types';
import { COUNTRY_OPTIONS, getCountryFlag } from '../utils/countries';
import { saveStudentOnboardingProfile } from '../utils/supabaseClient';

interface StudentProfileOnboardingProps {
  user: UserProfile;
  onSaved: (user: UserProfile) => void;
}

const makePhotoDataUrl = async (file: File) => {
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
    throw new Error('Escolha uma imagem JPG, PNG, WEBP ou GIF.');
  }
  if (file.size > 10 * 1024 * 1024) throw new Error('A imagem deve ter até 10 MB.');
  const image = await createImageBitmap(file);
  try {
    const createBlob = (size: number, quality: number) => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Não foi possível preparar a foto.');

      const scale = Math.max(size / image.width, size / image.height);
      const width = image.width * scale;
      const height = image.height * scale;
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, size, size);
      context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);

      return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Não foi possível preparar a foto.'));
        }, 'image/jpeg', quality);
      });
    };

    let blob = await createBlob(256, 0.72);
    if (blob.size > 48_000) blob = await createBlob(160, 0.58);
    if (blob.size > 48_000) throw new Error('A foto ficou grande demais. Escolha outra imagem.');

    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Não foi possível carregar a foto.'));
      reader.readAsDataURL(blob);
    });
  } finally {
    image.close();
  }
};

const getNameParts = (fullName?: string) => {
  const parts = fullName?.trim().split(/\s+/).filter(Boolean) || [];
  return { firstName: parts[0] || '', lastName: parts.slice(1).join(' ') };
};

export function StudentProfileOnboarding({ user, onSaved }: StudentProfileOnboardingProps) {
  const nameParts = getNameParts(user.full_name);
  const [firstName, setFirstName] = useState(user.first_name || nameParts.firstName);
  const [lastName, setLastName] = useState(user.last_name || nameParts.lastName);
  const [state, setState] = useState(user.profile_state || '');
  const [city, setCity] = useState(user.profile_city || '');
  const [country, setCountry] = useState(user.profile_country || '');
  const [photo, setPhoto] = useState(user.photo_url || '');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handlePhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      setPhoto(await makePhotoDataUrl(file));
      setError('');
    } catch (photoError) {
      setError(photoError instanceof Error ? photoError.message : 'Não foi possível carregar a foto.');
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSaving(true);
    try {
      const savedProfile = await saveStudentOnboardingProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        state: state.trim(),
        city: city.trim(),
        country,
        photoUrl: photo || null
      });
      onSaved({ ...user, ...savedProfile });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Não foi possível salvar seu perfil.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[5000] flex items-center justify-center overflow-y-auto bg-slate-950/90 p-4 backdrop-blur-md">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-profile-title"
        className="my-auto w-full max-w-xl rounded-3xl border border-white/15 bg-slate-900 p-6 text-white shadow-2xl sm:p-8"
      >
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white/10">
            {photo
              ? <img src={photo} alt="" className="h-full w-full object-cover" />
              : <UserRound size={30} className="text-white/70" />}
          </div>
          <h1 id="student-profile-title" className="text-2xl font-semibold">Complete seu perfil</h1>
          <p className="mt-2 text-sm text-white/70">
            Essas informações ficam salvas na sua conta e não precisarão ser preenchidas novamente.
          </p>
        </div>

        <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-medium hover:bg-white/10">
            <Camera size={17} />
            <span>{photo ? 'Alterar foto de perfil' : 'Adicionar foto de perfil (opcional)'}</span>
            <input type="file" accept="image/*" className="sr-only" onChange={(event) => void handlePhotoChange(event)} />
          </label>
          <p className="text-center text-xs text-white/55">
            Sem foto enviada, usaremos a imagem da sua conta quando disponível.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm">
              <span>Nome</span>
              <input
                required
                autoComplete="given-name"
                maxLength={80}
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                className="w-full rounded-xl border border-white/15 bg-slate-950/70 px-3 py-3 outline-none focus:border-amber-400"
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span>Sobrenome</span>
              <input
                required
                autoComplete="family-name"
                maxLength={80}
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                className="w-full rounded-xl border border-white/15 bg-slate-950/70 px-3 py-3 outline-none focus:border-amber-400"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm">
              <span>Estado / região</span>
              <input
                required
                autoComplete="address-level1"
                maxLength={100}
                value={state}
                onChange={(event) => setState(event.target.value)}
                className="w-full rounded-xl border border-white/15 bg-slate-950/70 px-3 py-3 outline-none focus:border-amber-400"
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span>Cidade</span>
              <input
                required
                autoComplete="address-level2"
                maxLength={100}
                value={city}
                onChange={(event) => setCity(event.target.value)}
                className="w-full rounded-xl border border-white/15 bg-slate-950/70 px-3 py-3 outline-none focus:border-amber-400"
              />
            </label>
          </div>

          <label className="block space-y-1.5 text-sm">
            <span>País</span>
            <span className="flex items-center gap-3 rounded-xl border border-white/15 bg-slate-950/70 px-3 focus-within:border-amber-400">
              <MapPin size={17} className="shrink-0 text-white/60" />
              <span className="text-xl" aria-hidden="true">{getCountryFlag(country)}</span>
              <select
                required
                autoComplete="country"
                value={country}
                onChange={(event) => setCountry(event.target.value)}
                className="min-w-0 flex-1 appearance-none bg-transparent py-3 text-white outline-none [&>option]:bg-slate-900"
              >
                <option value="">Selecione seu país</option>
                {country && !COUNTRY_OPTIONS.some((option) => option.code === country) && (
                  <option value={country}>{country}</option>
                )}
                {COUNTRY_OPTIONS.map((option) => (
                  <option key={option.code} value={option.code}>
                    {getCountryFlag(option.code)} {option.name}
                  </option>
                ))}
              </select>
            </span>
          </label>

          {error && <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}

          <button
            type="submit"
            disabled={isSaving}
            className="w-full rounded-xl bg-amber-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-amber-400 disabled:cursor-wait disabled:opacity-60"
          >
            {isSaving ? 'Salvando perfil...' : 'Salvar e entrar na plataforma'}
          </button>
        </form>
      </section>
    </div>
  );
}
