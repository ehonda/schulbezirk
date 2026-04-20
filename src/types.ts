export interface SchoolData {
  id: string;
  name: string;
  districtId: string;
  address: string;
  latitude: number;
  longitude: number;
  sourceUrl: string;
}

export interface DistrictProperties {
  districtId: string;
  name: string;
  sourceUrl: string;
  sourceVersion: string;
  pdfRevision: string;
  traceDate: string;
  traceMethod: string;
  notes: string[];
  schoolIds: string[];
  schoolNames: string[];
}

export type DistrictFeature = GeoJSON.Feature<
  GeoJSON.Polygon | GeoJSON.MultiPolygon,
  DistrictProperties
>;

export interface SearchCandidate {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  matchType: string;
}

export type ResolutionMethod = 'geocoded' | 'manual-pin';

export interface PointSelection {
  query: string;
  normalizedAddress: string;
  lat: number;
  lon: number;
  resolutionMethod: ResolutionMethod;
}

export interface CheckResult extends PointSelection {
  schoolId: string;
  schoolName: string;
  districtId: string;
  inside: boolean;
  sourceUrl: string;
  sourceVersion: string;
}
