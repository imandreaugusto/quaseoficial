export const COUNTRY_CODES: Record<string, string> = {
  argentina: 'AR', australia: 'AU', austria: 'AT', belgium: 'BE', bolivia: 'BO', brazil: 'BR', brasil: 'BR',
  canada: 'CA', chile: 'CL', china: 'CN', colombia: 'CO', costa_rica: 'CR', croatia: 'HR', cuba: 'CU',
  czechia: 'CZ', denmark: 'DK', ecuador: 'EC', egypt: 'EG', finland: 'FI', france: 'FR', germany: 'DE',
  greece: 'GR', india: 'IN', indonesia: 'ID', ireland: 'IE', israel: 'IL', italy: 'IT', japan: 'JP',
  mexico: 'MX', morocco: 'MA', netherlands: 'NL', new_zealand: 'NZ', nigeria: 'NG', norway: 'NO',
  panama: 'PA', paraguay: 'PY', peru: 'PE', philippines: 'PH', poland: 'PL', portugal: 'PT', romania: 'RO',
  russia: 'RU', south_africa: 'ZA', south_korea: 'KR', spain: 'ES', sweden: 'SE', switzerland: 'CH',
  thailand: 'TH', turkey: 'TR', ukraine: 'UA', united_arab_emirates: 'AE', united_kingdom: 'GB',
  united_states: 'US', uruguay: 'UY', venezuela: 'VE', vietnam: 'VN'
};

const normalizeCountry = (country?: string | null) =>
  country?.trim().toLocaleLowerCase('en-US').replace(/[\s-]+/g, '_') || '';

export const getCountryFlag = (country?: string | null) => {
  const normalized = country?.trim().toUpperCase() || '';
  const code = /^[A-Z]{2}$/.test(normalized) ? normalized : COUNTRY_CODES[normalizeCountry(country)];
  return code
    ? String.fromCodePoint(...[...code].map((letter) => 127397 + letter.charCodeAt(0)))
    : '🌐';
};

const countryNames = new Intl.DisplayNames(['pt-BR'], { type: 'region' });

export const COUNTRY_OPTIONS = [...new Set(Object.values(COUNTRY_CODES))]
  .map((code) => ({ code, name: countryNames.of(code) || code }))
  .sort((first, second) => first.name.localeCompare(second.name, 'pt-BR'));

export const getCountryName = (country?: string | null) => {
  const normalized = country?.trim().toUpperCase() || '';
  const code = /^[A-Z]{2}$/.test(normalized) ? normalized : COUNTRY_CODES[normalizeCountry(country)];
  return code ? countryNames.of(code) || country || code : country || '';
};
