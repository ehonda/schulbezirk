import { withBase } from './config';
import type { DistrictFeature, SchoolData } from './types';

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(withBase(path));

  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function loadAppData(): Promise<{
  schools: SchoolData[];
  districts: Map<string, DistrictFeature>;
}> {
  const schools = await fetchJson<SchoolData[]>('data/schools.json');
  const districtIds = [...new Set(schools.map((school) => school.districtId))];
  const districtEntries = await Promise.all(
    districtIds.map(async (districtId) => {
      const feature = await fetchJson<DistrictFeature>(
        `data/districts/${districtId}.geojson`
      );

      return [districtId, feature] as const;
    })
  );

  return {
    schools,
    districts: new Map(districtEntries)
  };
}
