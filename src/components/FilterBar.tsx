import type { ChangeType, EvaluationClass, Metadata } from '../types/research';
import {
  CHANGE_TYPES,
  CHANGE_TYPE_LABELS,
  EVALUATION_CLASSES,
  EVALUATION_CLASS_CONFIG,
} from '../utils/classification';

interface FilterBarProps {
  metadata: Metadata;
  evaluationClasses: readonly EvaluationClass[];
  changeTypes: readonly ChangeType[];
  visibleCount: number;
  onToggleEvaluationClass: (evaluationClass: EvaluationClass) => void;
  onToggleChangeType: (changeType: ChangeType) => void;
  onClearChangeTypes: () => void;
  onReset: () => void;
}

export function FilterBar({
  metadata,
  evaluationClasses,
  changeTypes,
  visibleCount,
  onToggleEvaluationClass,
  onToggleChangeType,
  onClearChangeTypes,
  onReset,
}: FilterBarProps) {
  return (
    <section className="filter-bar" aria-labelledby="filter-heading">
      <div className="filter-intro">
        <div>
          <span className="eyebrow" id="filter-heading">
            Filter evidence
          </span>
          <strong>{visibleCount.toLocaleString()} matching meshes</strong>
        </div>
        <button className="text-button" type="button" onClick={onReset}>
          Reset filters
        </button>
      </div>

      <fieldset className="filter-group">
        <legend>Evaluation class</legend>
        <div className="filter-options">
          {EVALUATION_CLASSES.map((evaluationClass) => {
            const config = EVALUATION_CLASS_CONFIG[evaluationClass];
            const count = metadata.counts.evaluation_classes[evaluationClass];
            return (
              <label className="filter-chip" key={evaluationClass}>
                <input
                  type="checkbox"
                  checked={evaluationClasses.includes(evaluationClass)}
                  onChange={() => onToggleEvaluationClass(evaluationClass)}
                />
                <span
                  className="filter-chip-dot"
                  style={{ backgroundColor: config.color }}
                  aria-hidden="true"
                />
                <span>{config.longLabel}</span>
                <small>{count}</small>
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="filter-group filter-group-types">
        <legend>Frozen change type</legend>
        <div className="filter-options">
          <button
            className={`filter-chip filter-chip-button ${changeTypes.length === 0 ? 'is-active' : ''}`}
            type="button"
            aria-pressed={changeTypes.length === 0}
            onClick={onClearChangeTypes}
          >
            Any type
          </button>
          {CHANGE_TYPES.map((changeType) => (
            <label className="filter-chip" key={changeType}>
              <input
                type="checkbox"
                checked={changeTypes.includes(changeType)}
                onChange={() => onToggleChangeType(changeType)}
              />
              <span>{CHANGE_TYPE_LABELS[changeType]}</span>
            </label>
          ))}
        </div>
        <p>Type is available only for the 24-mesh frozen STRICT24 subset.</p>
      </fieldset>
    </section>
  );
}
