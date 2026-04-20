import {
  API_KEY_STORAGE_KEY,
  LEIPZIG_BBOX,
  LEIPZIG_CENTER
} from './config';
import type { SearchCandidate } from './types';

interface MapTilerFeature {
  id: string;
  place_name: string;
  center: [number, number];
  place_type?: string[];
}

interface MapTilerResponse {
  features: MapTilerFeature[];
}

function buildGeocodingUrl(path: string, key: string): URL {
  const url = new URL(`https://api.maptiler.com/geocoding/${path}`);

  url.searchParams.set('key', key);
  url.searchParams.set('language', 'de');
  url.searchParams.set('country', 'de');
  url.searchParams.set('bbox', LEIPZIG_BBOX.join(','));
  url.searchParams.set('proximity', `${LEIPZIG_CENTER.lon},${LEIPZIG_CENTER.lat}`);

  return url;
}

export class MapTilerGeocoder {
  get runtimeKey(): string {
    if (typeof window === 'undefined') {
      return '';
    }

    return window.localStorage.getItem(API_KEY_STORAGE_KEY)?.trim() ?? '';
  }

  get effectiveKey(): string {
    return this.runtimeKey;
  }

  get isConfigured(): boolean {
    return Boolean(this.effectiveKey);
  }

  saveRuntimeKey(key: string): void {
    const trimmed = key.trim();

    if (!trimmed || typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(API_KEY_STORAGE_KEY, trimmed);
  }

  clearRuntimeKey(): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.removeItem(API_KEY_STORAGE_KEY);
  }

  async search(query: string): Promise<SearchCandidate[]> {
    if (!this.isConfigured) {
      throw new Error('MapTiler API key is not configured.');
    }

    const url = buildGeocodingUrl(`${encodeURIComponent(query)}.json`, this.effectiveKey);
    url.searchParams.set('limit', '5');
    url.searchParams.set('autocomplete', 'false');
    url.searchParams.set('types', 'address,street');

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`MapTiler request failed: ${response.status}`);
    }

    const data = (await response.json()) as MapTilerResponse;

    return data.features.map((feature) => ({
      id: feature.id,
      label: feature.place_name,
      latitude: feature.center[1],
      longitude: feature.center[0],
      matchType: feature.place_type?.[0] ?? 'unknown'
    }));
  }

  async reverse(longitude: number, latitude: number): Promise<string> {
    if (!this.isConfigured) {
      return `Pin bei ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    }

    const url = buildGeocodingUrl(`${longitude},${latitude}.json`, this.effectiveKey);
    url.searchParams.set('limit', '1');

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`MapTiler reverse lookup failed: ${response.status}`);
    }

    const data = (await response.json()) as MapTilerResponse;
    return (
      data.features[0]?.place_name ??
      `Pin bei ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
    );
  }
}
