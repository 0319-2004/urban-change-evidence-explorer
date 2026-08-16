import type { ChangeType, EvaluationClass, MeshFeature } from '../types/research';

export interface MeshFilters {
  evaluationClasses: readonly EvaluationClass[];
  changeTypes: readonly ChangeType[];
}

export function meshMatchesFilters(feature: MeshFeature, filters: MeshFilters): boolean {
  if (!filters.evaluationClasses.includes(feature.properties.evaluation_class)) return false;
  if (filters.changeTypes.length === 0) return true;
  const changeType = feature.properties.change_type;
  return changeType !== null && filters.changeTypes.includes(changeType);
}

export function filterMeshes(features: readonly MeshFeature[], filters: MeshFilters): MeshFeature[] {
  return features.filter((feature) => meshMatchesFilters(feature, filters));
}
