export const DEFAULT_SCHOOL_ID = 'august-bebel';
export const API_KEY_STORAGE_KEY = 'wohnungssuche.maptilerKey';
export const OFFICIAL_SO1_MAP_URL =
  'https://geodaten.leipzig.de/public/projekte/schulweg/pdf/gemeinsamerSchulbezirk_SO1.pdf';

export const LEIPZIG_CENTER = {
  lat: 51.3397,
  lon: 12.3731
} as const;

export const LEIPZIG_BBOX = [12.236, 51.249, 12.516, 51.431] as const;

export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;

  return `${base}${path.replace(/^\//, '')}`;
}
