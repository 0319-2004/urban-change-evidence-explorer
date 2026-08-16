import { describe, expect, it } from 'vitest';
import type { MeshFeature, MeshProperties } from '../../src/types/research';
import {
  deriveEvaluationClass,
  explainEvaluation,
  formatChangeType,
} from '../../src/utils/classification';
import { filterMeshes, meshMatchesFilters } from '../../src/utils/filtering';

function properties(overrides: Partial<MeshProperties> = {}): MeshProperties {
  return {
    mesh_id: 25,
    source_feature_id: 'source-25',
    evaluation_class: 'TP',
    ground_truth: 'CHANGE',
    detected: true,
    review_status: 'AGREED',
    change_type: 'REBUILDING',
    source_change_type: 'R',
    type_basis: 'exact match',
    source_density: 0.0492,
    source_mean: 0.0492,
    density_rank: 24,
    interpreter_a_judgment: '○',
    interpreter_b_judgment: '○',
    interpreter_a_type: 'R',
    interpreter_b_type: 'R',
    interpreter_a_note: null,
    interpreter_b_note: null,
    interpreter_a_needs_check: null,
    interpreter_b_needs_check: null,
    experiment_id: 'window-a-2019-2025-frozen',
    ...overrides,
  };
}

function feature(overrides: Partial<MeshProperties> = {}): MeshFeature {
  const meshProperties = properties(overrides);
  return {
    type: 'Feature',
    id: meshProperties.mesh_id,
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [139.66, 35.65],
          [139.661, 35.65],
          [139.661, 35.651],
          [139.66, 35.651],
          [139.66, 35.65],
        ],
      ],
    },
    properties: meshProperties,
  };
}

describe('evaluation-class mapping', () => {
  it.each([
    ['CHANGE', true, 'TP'],
    ['NO_CHANGE', true, 'FP'],
    ['CHANGE', false, 'FN'],
    ['NO_CHANGE', false, 'TN'],
    [null, true, 'NOT_EVALUATED'],
  ] as const)('maps %s / %s to %s', (groundTruth, detected, expected) => {
    expect(deriveEvaluationClass(groundTruth, detected)).toBe(expected);
  });
});

describe('rule-based explanations', () => {
  it('explains a false negative without making a building-level claim', () => {
    const explanation = explainEvaluation(
      properties({ evaluation_class: 'FN', detected: false }),
    );
    expect(explanation).toContain('Reference interpretation indicates a change');
    expect(explanation).toContain('did not flag this evaluation mesh');
    expect(explanation).not.toContain('building changed');
  });

  it('keeps unavailable change type explicit', () => {
    expect(formatChangeType(null)).toBe('Not available');
  });

  it('distinguishes a flagged but unevaluated mesh', () => {
    const explanation = explainEvaluation(
      properties({
        evaluation_class: 'NOT_EVALUATED',
        ground_truth: null,
        review_status: 'NOT_REVIEWED',
        detected: true,
      }),
    );
    expect(explanation).toContain('flagged this mesh');
    expect(explanation).toContain('a TP or FP assignment is not possible');
  });
});

describe('mesh filtering', () => {
  const features = [
    feature(),
    feature({ mesh_id: 114, evaluation_class: 'FN', detected: false }),
    feature({ mesh_id: 149, evaluation_class: 'TP', change_type: 'NEW_CONSTRUCTION' }),
  ];

  it('filters by evaluation class', () => {
    expect(
      filterMeshes(features, { evaluationClasses: ['FN'], changeTypes: [] }).map(
        (candidate) => candidate.properties.mesh_id,
      ),
    ).toEqual([114]);
  });

  it('applies change-type filtering only when a type is selected', () => {
    expect(
      meshMatchesFilters(features[2]!, {
        evaluationClasses: ['TP'],
        changeTypes: ['NEW_CONSTRUCTION'],
      }),
    ).toBe(true);
    expect(
      meshMatchesFilters(features[0]!, {
        evaluationClasses: ['TP'],
        changeTypes: ['NEW_CONSTRUCTION'],
      }),
    ).toBe(false);
  });
});
