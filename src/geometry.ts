import type { DistrictFeature } from './types';

export type LonLat = [number, number];

function isPointOnSegment(point: LonLat, start: LonLat, end: LonLat): boolean {
  const epsilon = 1e-10;
  const [px, py] = point;
  const [x1, y1] = start;
  const [x2, y2] = end;
  const cross = (px - x1) * (y2 - y1) - (py - y1) * (x2 - x1);

  if (Math.abs(cross) > epsilon) {
    return false;
  }

  const dot = (px - x1) * (px - x2) + (py - y1) * (py - y2);
  return dot <= epsilon;
}

function isPointInRing(point: LonLat, ring: LonLat[]): boolean {
  let inside = false;

  for (let index = 0; index < ring.length - 1; index += 1) {
    const start = ring[index];
    const end = ring[index + 1];

    if (isPointOnSegment(point, start, end)) {
      return true;
    }

    const [px, py] = point;
    const [x1, y1] = start;
    const [x2, y2] = end;
    const crosses =
      (y1 > py) !== (y2 > py) &&
      px < ((x2 - x1) * (py - y1)) / (y2 - y1) + x1;

    if (crosses) {
      inside = !inside;
    }
  }

  return inside;
}

function isPointInPolygon(point: LonLat, polygon: LonLat[][]): boolean {
  if (!polygon.length || !isPointInRing(point, polygon[0])) {
    return false;
  }

  for (let index = 1; index < polygon.length; index += 1) {
    if (isPointInRing(point, polygon[index])) {
      return false;
    }
  }

  return true;
}

export function pointInFeature(point: LonLat, feature: DistrictFeature): boolean {
  if (feature.geometry.type === 'Polygon') {
    return isPointInPolygon(point, feature.geometry.coordinates as LonLat[][]);
  }

  return feature.geometry.coordinates.some((polygon) =>
    isPointInPolygon(point, polygon as LonLat[][])
  );
}
