import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { pointInFeature } from '../geometry';
import type { DistrictFeature, SchoolData } from '../types';

const districtPath = fileURLToPath(
  new URL('../../public/data/districts/SO1.geojson', import.meta.url)
);
const schoolsPath = fileURLToPath(
  new URL('../../public/data/schools.json', import.meta.url)
);

const district = JSON.parse(readFileSync(districtPath, 'utf8')) as DistrictFeature;
const schools = JSON.parse(readFileSync(schoolsPath, 'utf8')) as SchoolData[];
const calibratedBoundaryPoints: Array<[number, number]> = [
  [12.394035, 51.351209],
  [12.378102, 51.337137],
  [12.405847, 51.331768],
  [12.394322, 51.33176]
];

function toLocalMeters([lon, lat]: [number, number], meanLat: number): [number, number] {
  return [lon * 111_320 * Math.cos((meanLat * Math.PI) / 180), lat * 111_320];
}

function distanceToSegment(
  point: [number, number],
  start: [number, number],
  end: [number, number]
): number {
  const [px, py] = point;
  const [ax, ay] = start;
  const [bx, by] = end;
  const dx = bx - ax;
  const dy = by - ay;

  if (dx === 0 && dy === 0) {
    return Math.hypot(px - ax, py - ay);
  }

  const t = Math.max(
    0,
    Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy))
  );
  const qx = ax + t * dx;
  const qy = ay + t * dy;

  return Math.hypot(px - qx, py - qy);
}

describe('SO1 data files', () => {
  it('contains the required district metadata', () => {
    expect(district.type).toBe('Feature');
    expect(district.properties.districtId).toBe('SO1');
    expect(district.properties.sourceUrl).toMatch(/^https:\/\//);
    expect(district.properties.sourceVersion.length).toBeGreaterThan(10);
    expect(district.properties.schoolIds.length).toBe(2);
  });

  it('stores a closed outer ring', () => {
    const outerRing = district.geometry.coordinates[0];
    expect(outerRing[0]).toEqual(outerRing[outerRing.length - 1]);
    expect(outerRing.length).toBeGreaterThan(100);
  });

  it('keeps the calibrated anchor vertices within 2 meters of the boundary', () => {
    const outerRing = district.geometry.coordinates[0] as Array<[number, number]>;
    const meanLat =
      outerRing.slice(0, -1).reduce((sum, [, lat]) => sum + lat, 0) /
      (outerRing.length - 1);
    const ringMeters = outerRing.map((point) => toLocalMeters(point, meanLat));

    calibratedBoundaryPoints.forEach((point) => {
      const pointMeters = toLocalMeters(point, meanLat);
      let minDistance = Number.POSITIVE_INFINITY;

      for (let index = 0; index < ringMeters.length - 1; index += 1) {
        minDistance = Math.min(
          minDistance,
          distanceToSegment(pointMeters, ringMeters[index], ringMeters[index + 1])
        );
      }

      expect(minDistance).toBeLessThan(2);
    });
  });

  it('keeps both schools inside the traced district polygon', () => {
    schools.forEach((school) => {
      expect(pointInFeature([school.longitude, school.latitude], district)).toBe(true);
    });
  });

  it('keeps a clearly eastern point outside the polygon', () => {
    expect(pointInFeature([12.422, 51.338], district)).toBe(false);
  });
});
