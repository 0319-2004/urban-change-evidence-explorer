import type { ChangeType, EvaluationClass, MeshProperties } from '../types/research';

export interface EvaluationClassConfig {
  label: string;
  longLabel: string;
  color: string;
  textColor: string;
  definition: string;
}

export const EVALUATION_CLASSES: readonly EvaluationClass[] = [
  'TP',
  'FP',
  'FN',
  'TN',
  'NOT_EVALUATED',
];

export const EVALUATION_CLASS_CONFIG: Record<EvaluationClass, EvaluationClassConfig> = {
  TP: {
    label: 'TP',
    longLabel: 'True positive',
    color: '#167c68',
    textColor: '#ffffff',
    definition: 'Reference change · SAR flagged',
  },
  FP: {
    label: 'FP',
    longLabel: 'False positive',
    color: '#d07a11',
    textColor: '#1e1b16',
    definition: 'Reference no change · SAR flagged',
  },
  FN: {
    label: 'FN',
    longLabel: 'False negative',
    color: '#c64c5a',
    textColor: '#ffffff',
    definition: 'Reference change · SAR not flagged',
  },
  TN: {
    label: 'TN',
    longLabel: 'True negative',
    color: '#536a7a',
    textColor: '#ffffff',
    definition: 'Reference no change · SAR not flagged',
  },
  NOT_EVALUATED: {
    label: '—',
    longLabel: 'Not evaluated',
    color: '#c7cbc8',
    textColor: '#292d2b',
    definition: 'No agreed reference label',
  },
};

export const CHANGE_TYPES: readonly ChangeType[] = [
  'NEW_CONSTRUCTION',
  'DEMOLITION',
  'REBUILDING',
  'COMPOUND_OTHER',
];

export const CHANGE_TYPE_LABELS: Record<ChangeType, string> = {
  NEW_CONSTRUCTION: 'New construction',
  DEMOLITION: 'Demolition',
  REBUILDING: 'Rebuilding',
  COMPOUND_OTHER: 'Compound / other',
};

export function deriveEvaluationClass(
  groundTruth: 'CHANGE' | 'NO_CHANGE' | null,
  detected: boolean,
): EvaluationClass {
  if (groundTruth === 'CHANGE') return detected ? 'TP' : 'FN';
  if (groundTruth === 'NO_CHANGE') return detected ? 'FP' : 'TN';
  return 'NOT_EVALUATED';
}

export function explainEvaluation(properties: MeshProperties): string {
  switch (properties.evaluation_class) {
    case 'TP':
      return 'Reference interpretation indicates a change, and the frozen SAR screening method flagged this evaluation mesh.';
    case 'FP':
      return 'Reference interpretation indicates no change, but the frozen SAR screening method flagged this evaluation mesh.';
    case 'FN':
      return 'Reference interpretation indicates a change, but the frozen SAR screening method did not flag this evaluation mesh.';
    case 'TN':
      return 'Reference interpretation indicates no change, and the frozen SAR screening method did not flag this evaluation mesh.';
    case 'NOT_EVALUATED':
      return properties.detected
        ? 'The frozen SAR method flagged this mesh, but no agreed ground-truth label is available; a TP or FP assignment is not possible.'
        : 'The frozen SAR method did not flag this mesh, but no agreed ground-truth label is available; an FN or TN assignment is not possible.';
  }
}

export function formatChangeType(changeType: ChangeType | null): string {
  return changeType ? CHANGE_TYPE_LABELS[changeType] : 'Not available';
}

export function formatGroundTruth(groundTruth: MeshProperties['ground_truth']): string {
  if (groundTruth === 'CHANGE') return 'Change';
  if (groundTruth === 'NO_CHANGE') return 'No change';
  return 'Not available';
}

export function formatReviewStatus(status: MeshProperties['review_status']): string {
  if (status === 'AGREED') return 'Both interpreters agreed';
  if (status === 'DISAGREED') return 'Interpreter agreement not reached';
  return 'Not in reviewed candidate set';
}
