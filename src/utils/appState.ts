import type { ChangeType, EvaluationClass } from '../types/research';
import { EVALUATION_CLASSES } from './classification';

export interface AppState {
  selectedMeshId: number | null;
  evaluationClasses: EvaluationClass[];
  changeTypes: ChangeType[];
}

export type AppAction =
  | { type: 'select_mesh'; meshId: number }
  | { type: 'clear_selection' }
  | { type: 'toggle_evaluation_class'; evaluationClass: EvaluationClass }
  | { type: 'toggle_change_type'; changeType: ChangeType }
  | { type: 'clear_change_types' }
  | { type: 'reset_filters' };

export const initialAppState: AppState = {
  selectedMeshId: null,
  evaluationClasses: [...EVALUATION_CLASSES],
  changeTypes: [],
};

function toggleValue<T>(values: readonly T[], value: T): T[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'select_mesh':
      return { ...state, selectedMeshId: action.meshId };
    case 'clear_selection':
      return { ...state, selectedMeshId: null };
    case 'toggle_evaluation_class':
      return {
        ...state,
        evaluationClasses: toggleValue(state.evaluationClasses, action.evaluationClass),
      };
    case 'toggle_change_type':
      return { ...state, changeTypes: toggleValue(state.changeTypes, action.changeType) };
    case 'clear_change_types':
      return { ...state, changeTypes: [] };
    case 'reset_filters':
      return { ...state, evaluationClasses: [...EVALUATION_CLASSES], changeTypes: [] };
  }
}
