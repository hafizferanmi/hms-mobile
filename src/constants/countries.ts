import { countries } from 'countries-list';

// Same `countries-list` package (and major version — 2.x) hms-frontend-
// react's own CompanySettinsForm.js builds its country/currency pickers
// from (see helpers/misc.js's groupCodeWithCountry/formatCurrencies).
// hms-backend-node validates `country` against this exact package's
// `Object.keys(countries)` (ValidationSchemas/companySettingsSchema.js)
// and `currency` against its per-country `currency` values
// (helpers/misc.js#formatCurrencies) — using the same package here
// guarantees every option this app offers is one the backend will accept.
//
// `country` is stored/sent as the 2-letter code (e.g. "NG"), not the
// display name — company-settings.tsx's picker shows `name` but submits
// `code`.
export type CountryOption = {
  code: string;
  name: string;
};

export const COUNTRY_OPTIONS: CountryOption[] = Object.entries(countries)
  .map(([code, data]) => ({ code, name: data.name }))
  .sort((a, b) => a.name.localeCompare(b.name));

export function countryName(code: string | undefined) {
  if (!code) return undefined;
  return COUNTRY_OPTIONS.find((c) => c.code === code)?.name ?? code;
}

// Deduped, alphabetical currency codes (e.g. "NGN") across every country
// — matches formatCurrencies() exactly, including the fact that most
// currencies are shared by several countries.
export const CURRENCY_OPTIONS: string[] = Array.from(
  new Set(Object.values(countries).map((data) => data.currency).filter(Boolean)),
).sort();
