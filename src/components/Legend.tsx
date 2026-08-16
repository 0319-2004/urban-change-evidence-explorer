import { EVALUATION_CLASSES, EVALUATION_CLASS_CONFIG } from '../utils/classification';

export function Legend() {
  return (
    <aside className="map-legend" aria-label="Evaluation class legend">
      <div className="legend-heading">Evaluation class</div>
      <div className="legend-items">
        {EVALUATION_CLASSES.map((evaluationClass) => {
          const config = EVALUATION_CLASS_CONFIG[evaluationClass];
          return (
            <div className="legend-item" key={evaluationClass}>
              <span
                className="legend-swatch"
                style={{ backgroundColor: config.color }}
                aria-hidden="true"
              />
              <span>
                <strong>{config.longLabel}</strong>
                <small>{config.definition}</small>
              </span>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
