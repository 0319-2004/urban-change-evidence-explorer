import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseAppData } from '../../src/utils/dataLoader';

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(resolve(process.cwd(), path), 'utf-8')) as unknown;
}

describe('generated application data', () => {
  it('passes the browser-boundary schemas and frozen invariants', () => {
    const data = parseAppData(
      readJson('public/data/meshes.geojson'),
      readJson('public/data/experiments.json'),
      readJson('public/data/metadata.json'),
    );
    expect(data.meshes.features).toHaveLength(676);
    expect(data.metadata.counts.evaluation_classes).toEqual({
      TP: 16,
      FP: 5,
      FN: 21,
      TN: 13,
      NOT_EVALUATED: 621,
    });
  });

  it('rejects a malformed feature instead of coercing it', () => {
    const meshes = readJson('public/data/meshes.geojson') as {
      features: Array<{ properties: Record<string, unknown> }>;
    };
    delete meshes.features[0]?.properties.mesh_id;

    expect(() =>
      parseAppData(
        meshes,
        readJson('public/data/experiments.json'),
        readJson('public/data/metadata.json'),
      ),
    ).toThrow();
  });
});
