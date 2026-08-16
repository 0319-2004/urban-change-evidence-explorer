import type { Experiment, MeshFeature, Metadata } from '../types/research';
import {
  EVALUATION_CLASS_CONFIG,
  explainEvaluation,
  formatChangeType,
  formatGroundTruth,
  formatReviewStatus,
} from '../utils/classification';

interface EvidencePanelProps {
  feature: MeshFeature | null;
  experiment: Experiment;
  metadata: Metadata;
  onClearSelection: () => void;
}

interface EvidenceRowProps {
  label: string;
  value: string;
  detail?: string;
}

function EvidenceRow({ label, value, detail }: EvidenceRowProps) {
  return (
    <div className="evidence-row">
      <dt>{label}</dt>
      <dd>
        {value}
        {detail && <small>{detail}</small>}
      </dd>
    </div>
  );
}

function sourceUrl(metadata: Metadata, path: string): string {
  return `${metadata.source.repository}/blob/${metadata.source.commit}/${path}`;
}

function displayText(value: string | null): string {
  return value ?? 'Not available';
}

export function EvidencePanel({
  feature,
  experiment,
  metadata,
  onClearSelection,
}: EvidencePanelProps) {
  if (!feature) {
    return (
      <aside className="evidence-panel evidence-panel-empty" aria-labelledby="evidence-title">
        <div className="panel-kicker">Evidence panel</div>
        <h2 id="evidence-title">Select a mesh</h2>
        <p className="panel-lead">
          Click any grid cell to inspect what is known, what is missing, and how the frozen SAR
          screening result performed there.
        </p>
        <div className="selection-guide" aria-label="How to read the map">
          <div>
            <span>01</span>
            <p>Use color to locate evaluated outcomes.</p>
          </div>
          <div>
            <span>02</span>
            <p>Click a mesh—not a building—to open its evidence.</p>
          </div>
          <div>
            <span>03</span>
            <p>Trace every displayed field to the frozen source data.</p>
          </div>
        </div>
        <div className="boundary-note">
          <strong>Scientific boundary</strong>
          <p>
            Only 55 of 676 meshes have agreed reference labels. Pale grid cells are not assumed
            negatives; they are explicitly marked Not evaluated.
          </p>
        </div>
      </aside>
    );
  }

  const properties = feature.properties;
  const classConfig = EVALUATION_CLASS_CONFIG[properties.evaluation_class];
  const densityPercent = `${(properties.source_density * 100).toFixed(2)}%`;
  const observationLabel = experiment.observation_windows.map((window) => window.label).join(' × ');

  return (
    <aside className="evidence-panel" aria-labelledby="evidence-title" aria-live="polite">
      <div className="panel-heading-row">
        <div>
          <div className="panel-kicker">Selected spatial unit</div>
          <h2 id="evidence-title">Mesh {properties.mesh_id}</h2>
        </div>
        <button
          className="icon-button"
          type="button"
          onClick={onClearSelection}
          aria-label="Clear mesh selection"
        >
          Close
        </button>
      </div>

      <div
        className="class-banner"
        style={{ backgroundColor: classConfig.color, color: classConfig.textColor }}
      >
        <span>{classConfig.label}</span>
        <div>
          <strong>{classConfig.longLabel}</strong>
          <small>{classConfig.definition}</small>
        </div>
      </div>

      <p className="rule-explanation">{explainEvaluation(properties)}</p>

      <section className="evidence-section" aria-labelledby="outcome-heading">
        <h3 id="outcome-heading">Evaluation outcome</h3>
        <dl>
          <EvidenceRow label="Mesh ID" value={String(properties.mesh_id)} />
          <EvidenceRow
            label="Evaluation class"
            value={classConfig.longLabel}
            detail={properties.evaluation_class}
          />
          <EvidenceRow label="Ground truth" value={formatGroundTruth(properties.ground_truth)} />
          <EvidenceRow
            label="SAR screening"
            value={properties.detected ? 'Flagged' : 'Not flagged'}
            detail="Frozen mesh rule: source density > 0"
          />
          <EvidenceRow label="Frozen change type" value={formatChangeType(properties.change_type)} />
          <EvidenceRow
            label="Review status"
            value={formatReviewStatus(properties.review_status)}
          />
        </dl>
      </section>

      <section className="evidence-section" aria-labelledby="statistic-heading">
        <h3 id="statistic-heading">SAR evidence</h3>
        <dl>
          <EvidenceRow
            label="Source density"
            value={properties.source_density.toFixed(4)}
            detail={`${densityPercent} mean of binary change mask—not confidence`}
          />
          <EvidenceRow
            label="Positive-density rank"
            value={properties.density_rank ? `#${properties.density_rank}` : 'Not available'}
            detail={
              properties.density_rank
                ? `Derived rank among ${metadata.counts.detected_meshes} flagged meshes`
                : undefined
            }
          />
          <EvidenceRow label="Experiment" value={experiment.label} />
          <EvidenceRow label="Observation windows" value={observationLabel} detail="January–March" />
          <EvidenceRow
            label="Implemented threshold"
            value={`Nominal α = ${experiment.implemented_nominal_alpha}`}
            detail="Frozen implementation; see limitation note below"
          />
        </dl>
      </section>

      <section className="evidence-section" aria-labelledby="reference-heading">
        <h3 id="reference-heading">Reference interpretation</h3>
        <dl>
          <EvidenceRow
            label="Interpreter A"
            value={displayText(properties.interpreter_a_judgment)}
            detail={properties.interpreter_a_type ? `Type entry: ${properties.interpreter_a_type}` : undefined}
          />
          <EvidenceRow
            label="Interpreter B"
            value={displayText(properties.interpreter_b_judgment)}
            detail={properties.interpreter_b_type ? `Type entry: ${properties.interpreter_b_type}` : undefined}
          />
          <EvidenceRow label="Type basis" value={displayText(properties.type_basis)} />
          <EvidenceRow label="Interpreter A note" value={displayText(properties.interpreter_a_note)} />
          <EvidenceRow label="Interpreter B note" value={displayText(properties.interpreter_b_note)} />
        </dl>
      </section>

      <details className="source-trace">
        <summary>Trace this evidence to source</summary>
        <ul>
          <li>
            <a
              href={sourceUrl(metadata, '02_canonical_data/shimokita_density_2025.geojson')}
              target="_blank"
              rel="noreferrer"
            >
              Geometry and frozen density
            </a>
          </li>
          <li>
            <a
              href={sourceUrl(metadata, '02_canonical_data/graduate_thesis_judge_A.csv')}
              target="_blank"
              rel="noreferrer"
            >
              Interpreter A record
            </a>
          </li>
          <li>
            <a
              href={sourceUrl(metadata, '02_canonical_data/graduate_thesis_judge_B.csv')}
              target="_blank"
              rel="noreferrer"
            >
              Interpreter B record
            </a>
          </li>
          <li>
            <a
              href={sourceUrl(metadata, '02_canonical_data/strict24_members.csv')}
              target="_blank"
              rel="noreferrer"
            >
              Frozen change-type subset
            </a>
          </li>
        </ul>
      </details>

      <div className="scope-warning">
        <strong>Mesh-level statement</strong>
        <p>This evidence does not identify which building, if any, changed within the cell.</p>
      </div>
    </aside>
  );
}
