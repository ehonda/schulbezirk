import { describe, expect, it } from 'vitest';

import { pointInFeature } from '../geometry';
import type { DistrictFeature } from '../types';

const simpleSquare: DistrictFeature = {
  type: 'Feature',
  properties: {
    districtId: 'TEST',
    name: 'Test',
    sourceUrl: 'https://example.com',
    sourceVersion: 'test',
    pdfRevision: 'test',
    traceDate: '2026-04-20',
    traceMethod: 'test',
    notes: [],
    schoolIds: [],
    schoolNames: []
  },
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [0, 0],
        [2, 0],
        [2, 2],
        [0, 2],
        [0, 0]
      ]
    ]
  }
};

const polygonWithHole: DistrictFeature = {
  ...simpleSquare,
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [0, 0],
        [4, 0],
        [4, 4],
        [0, 4],
        [0, 0]
      ],
      [
        [1, 1],
        [3, 1],
        [3, 3],
        [1, 3],
        [1, 1]
      ]
    ]
  }
};

describe('pointInFeature', () => {
  it('returns true for interior points', () => {
    expect(pointInFeature([1, 1], simpleSquare)).toBe(true);
  });

  it('treats boundary points as inside', () => {
    expect(pointInFeature([0, 1], simpleSquare)).toBe(true);
  });

  it('returns false outside the polygon', () => {
    expect(pointInFeature([3, 3], simpleSquare)).toBe(false);
  });

  it('respects interior holes', () => {
    expect(pointInFeature([2, 2], polygonWithHole)).toBe(false);
    expect(pointInFeature([0.5, 0.5], polygonWithHole)).toBe(true);
  });
});
