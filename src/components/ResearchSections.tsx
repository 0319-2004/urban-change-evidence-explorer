import type { Experiment, Metadata } from '../types/research';

interface ResearchSectionsProps {
  experiment: Experiment;
  metadata: Metadata;
}

function formatGeneratedDate(value: string): string {
  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value));
}

export function ResearchSections({ experiment, metadata }: ResearchSectionsProps) {
  return (
    <div className="research-sections">
      <section className="research-section context-section" id="context" aria-labelledby="context-title">
        <div className="section-heading">
          <span className="section-index">01</span>
          <div>
            <p className="eyebrow">Research context</p>
            <h2 id="context-title">A screening question, not a building claim</h2>
          </div>
        </div>
        <div className="context-grid">
          <article className="research-question-card">
            <p className="quote-mark" aria-hidden="true">
              “
            </p>
            <blockquote>
              How much building change can an unsupervised statistical method recover from SAR,
              and if it fails, what is the structure of that failure?
            </blockquote>
            <p>Source research question</p>
          </article>
          <div className="context-copy">
            <p>
              The study applies an unsupervised omnibus likelihood-ratio test to Sentinel-1A VV
              intensity in Shimokitazawa. It asks whether mesh-level flags can support low-cost
              first-pass screening before more expensive verification.
            </p>
            <dl className="method-facts">
              <div>
                <dt>Sensor</dt>
                <dd>{experiment.sensor} · {experiment.instrument_mode} · {experiment.polarization}</dd>
              </div>
              <div>
                <dt>Comparison</dt>
                <dd>Winter 2019 versus winter 2025</dd>
              </div>
              <div>
                <dt>Unit</dt>
                <dd>{experiment.analysis_unit}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="result-strip" aria-label="Frozen study results">
          <div>
            <strong>0.762</strong>
            <span>Precision</span>
            <small>16 TP / 21 evaluated flags</small>
          </div>
          <div>
            <strong>1.22×</strong>
            <span>Estimated enrichment</span>
            <small>One-sided p = 0.139</small>
          </div>
          <div>
            <strong>23.1%</strong>
            <span>Rebuilding detection</span>
            <small>3 of 13 STRICT24 meshes</small>
          </div>
          <p>
            The source study reports weak cell-level discriminability as a primary negative result,
            while finding that rebuilding is harder to detect than new construction.
          </p>
        </div>
      </section>

      <section
        className="research-section limitations-section"
        id="limitations"
        aria-labelledby="limitations-title"
      >
        <div className="section-heading">
          <span className="section-index">02</span>
          <div>
            <p className="eyebrow">Scientific limitations</p>
            <h2 id="limitations-title">What the map cannot establish</h2>
          </div>
        </div>
        <div className="limitations-grid">
          <article>
            <span>Spatial</span>
            <h3>Mesh, not building</h3>
            <p>
              A flag means change-like SAR response occurred somewhere within the evaluation mesh.
              It does not locate or identify an individual building.
            </p>
          </article>
          <article>
            <span>Signal</span>
            <h3>Intensity is incomplete</h3>
            <p>
              Rebuilding can preserve wall–ground double-bounce structure, especially for similar
              low-rise buildings, reducing before/after intensity contrast.
            </p>
          </article>
          <article>
            <span>Time</span>
            <h3>Window-dependent result</h3>
            <p>
              The two-window test detects differences between selected scattering states. Changing
              observation windows substantially changed which meshes were flagged.
            </p>
          </article>
          <article>
            <span>Reference</span>
            <h3>Partial ground truth</h3>
            <p>
              Only 55 meshes have agreed binary labels. Aerial images are not included, so the
              original human interpretation cannot be independently reproduced here.
            </p>
          </article>
          <article>
            <span>Alignment</span>
            <h3>Dates do not fully match</h3>
            <p>
              Ground truth uses 2017 and 2021 aerial imagery, while the frozen SAR result compares
              winter 2019 and winter 2025.
            </p>
          </article>
          <article className="implementation-limitation">
            <span>Implementation</span>
            <h3>Frozen parameter error retained</h3>
            <p>
              The source record documents an incorrect look-number parameter in the frozen test.
              This viewer preserves the reported result and labels it clearly; corrected-look work
              remains a sensitivity analysis.
            </p>
          </article>
        </div>
      </section>

      <section
        className="research-section provenance-section"
        id="provenance"
        aria-labelledby="provenance-title"
      >
        <div className="section-heading">
          <span className="section-index">03</span>
          <div>
            <p className="eyebrow">Data provenance</p>
            <h2 id="provenance-title">Every display field has a trail</h2>
          </div>
        </div>
        <div className="provenance-layout">
          <div className="provenance-summary">
            <dl>
              <div>
                <dt>Source repository</dt>
                <dd>
                  <a href={metadata.source.repository} target="_blank" rel="noreferrer">
                    shimokita-building-change-detection
                  </a>
                </dd>
              </div>
              <div>
                <dt>Source commit</dt>
                <dd>
                  <code>{metadata.source.commit.slice(0, 12)}</code>
                </dd>
              </div>
              <div>
                <dt>Application dataset</dt>
                <dd>{metadata.dataset_version}</dd>
              </div>
              <div>
                <dt>Generated</dt>
                <dd>{formatGeneratedDate(metadata.generated_at)}</dd>
              </div>
              <div>
                <dt>Transformation</dt>
                <dd>{metadata.transformation.summary}</dd>
              </div>
            </dl>
            <div className="license-notice">
              <strong>Research-data license notice</strong>
              <p>{metadata.source.license_notice}</p>
            </div>
          </div>
          <div className="provenance-files">
            <h3>Canonical source files</h3>
            <ul>
              {metadata.source.files.map((file) => (
                <li key={file.path}>
                  <span>{file.path}</span>
                  <code title={file.sha256}>sha256 {file.sha256.slice(0, 12)}…</code>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <details className="transformation-details">
          <summary>View transformation method</summary>
          <ol>
            {metadata.transformation.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </details>
      </section>
    </div>
  );
}
