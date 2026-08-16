import type { MeshFeature } from '../types/research';
import { EVALUATION_CLASS_CONFIG, formatChangeType } from '../utils/classification';

interface MeshBrowserProps {
  features: readonly MeshFeature[];
  selectedMeshId: number | null;
  onSelectMesh: (meshId: number) => void;
}

export function MeshBrowser({ features, selectedMeshId, onSelectMesh }: MeshBrowserProps) {
  const evaluated = features
    .filter((feature) => feature.properties.evaluation_class !== 'NOT_EVALUATED')
    .sort((left, right) => left.properties.mesh_id - right.properties.mesh_id);

  return (
    <details className="mesh-browser">
      <summary>
        Browse filtered evaluation meshes <span>{evaluated.length}</span>
      </summary>
      {evaluated.length === 0 ? (
        <p className="mesh-browser-empty">No evaluated meshes match the current filters.</p>
      ) : (
        <div className="mesh-browser-list">
          {evaluated.map((feature) => {
            const properties = feature.properties;
            const config = EVALUATION_CLASS_CONFIG[properties.evaluation_class];
            return (
              <button
                key={properties.mesh_id}
                type="button"
                className={selectedMeshId === properties.mesh_id ? 'is-selected' : ''}
                onClick={() => onSelectMesh(properties.mesh_id)}
              >
                <span
                  className="mesh-browser-class"
                  style={{ backgroundColor: config.color, color: config.textColor }}
                >
                  {config.label}
                </span>
                <span>
                  <strong>Mesh {properties.mesh_id}</strong>
                  <small>{formatChangeType(properties.change_type)}</small>
                </span>
                <span aria-hidden="true">→</span>
              </button>
            );
          })}
        </div>
      )}
    </details>
  );
}
