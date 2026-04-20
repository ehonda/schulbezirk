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
    expect(outerRing.length).toBeGreaterThan(40);
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
