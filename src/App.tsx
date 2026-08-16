import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { FilterBar } from './components/FilterBar';
import { MeshBrowser } from './components/MeshBrowser';
import { ResearchSections } from './components/ResearchSections';
import { MapView } from './map/MapView';
import { EvidencePanel } from './panels/EvidencePanel';
import type { AppData, ChangeType, EvaluationClass } from './types/research';
import { appReducer, initialAppState } from './utils/appState';
import { loadAppData } from './utils/dataLoader';
import { filterMeshes } from './utils/filtering';

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; data: AppData }
  | { status: 'error'; message: string };

function Header() {
  return (
    <header className="site-header">
      <div className="header-brand">
        <a className="brand-mark" href="#top" aria-label="Urban Change Evidence Explorer home">
          UC<span>²</span>
        </a>
        <div>
          <span className="eyebrow">Sentinel-1 SAR research viewer</span>
          <strong>Urban Change Evidence Explorer</strong>
        </div>
      </div>
      <nav aria-label="Research sections">
        <a href="#context">Context</a>
        <a href="#limitations">Limitations</a>
        <a href="#provenance">Provenance</a>
        <a
          className="header-source-link"
          href="https://github.com/0319-2004/shimokita-building-change-detection"
          target="_blank"
          rel="noreferrer"
        >
          Source research ↗
        </a>
      </nav>
    </header>
  );
}

function LoadingState() {
  return (
    <main className="status-page" aria-live="polite">
      <div className="status-orbit" aria-hidden="true">
        <span />
      </div>
      <p className="eyebrow">Validating static research data</p>
      <h1>Preparing the evidence explorer</h1>
      <p>Checking geometry, evaluation classes, experiment metadata, and provenance…</p>
    </main>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <main className="status-page status-page-error" role="alert">
      <p className="eyebrow">Dataset validation failed</p>
      <h1>The research viewer could not start</h1>
      <p>{message}</p>
      <p>The application stops rather than displaying malformed or scientifically ambiguous data.</p>
    </main>
  );
}

function Explorer({ data }: { data: AppData }) {
  const [state, dispatch] = useReducer(appReducer, initialAppState);
  const filteredMeshes = useMemo(
    () =>
      filterMeshes(data.meshes.features, {
        evaluationClasses: state.evaluationClasses,
        changeTypes: state.changeTypes,
      }),
    [data.meshes.features, state.changeTypes, state.evaluationClasses],
  );
  const selectedFeature = useMemo(
    () =>
      state.selectedMeshId === null
        ? null
        : (data.meshes.features.find(
            (feature) => feature.properties.mesh_id === state.selectedMeshId,
          ) ?? null),
    [data.meshes.features, state.selectedMeshId],
  );

  const selectMesh = useCallback((meshId: number) => {
    dispatch({ type: 'select_mesh', meshId });
  }, []);
  const toggleEvaluationClass = useCallback((evaluationClass: EvaluationClass) => {
    dispatch({ type: 'toggle_evaluation_class', evaluationClass });
  }, []);
  const toggleChangeType = useCallback((changeType: ChangeType) => {
    dispatch({ type: 'toggle_change_type', changeType });
  }, []);

  return (
    <>
      <section className="hero" id="top">
        <div className="hero-copy">
          <div className="hero-labels">
            <span>Shimokitazawa · Tokyo</span>
            <span>Frozen Window A · 2019–2025</span>
          </div>
          <h1>
            Understand the result
            <br />
            by clicking the map.
          </h1>
          <p>
            Explore evidence and uncertainty in mesh-level Sentinel-1 SAR urban change screening—
            with every result tied back to its source.
          </p>
        </div>
        <div className="hero-stats" aria-label="Dataset summary">
          <div>
            <strong>{data.metadata.counts.meshes}</strong>
            <span>Study meshes</span>
          </div>
          <div>
            <strong>{data.metadata.counts.evaluated_meshes}</strong>
            <span>Agreed evaluations</span>
          </div>
          <div>
            <strong>{data.metadata.counts.detected_meshes}</strong>
            <span>Frozen SAR flags</span>
          </div>
        </div>
      </section>

      <main id="explorer">
        <section className="explorer-shell" aria-labelledby="explorer-title">
          <div className="explorer-heading">
            <div>
              <p className="eyebrow">Interactive evidence map</p>
              <h2 id="explorer-title">Frozen mesh evaluation</h2>
            </div>
            <p>
              Pale cells retain spatial context. Color is assigned only where evaluation evidence
              supports it.
            </p>
          </div>

          <FilterBar
            metadata={data.metadata}
            evaluationClasses={state.evaluationClasses}
            changeTypes={state.changeTypes}
            visibleCount={filteredMeshes.length}
            onToggleEvaluationClass={toggleEvaluationClass}
            onToggleChangeType={toggleChangeType}
            onClearChangeTypes={() => dispatch({ type: 'clear_change_types' })}
            onReset={() => dispatch({ type: 'reset_filters' })}
          />

          <div className="explorer-workspace">
            <MapView
              meshes={data.meshes}
              metadata={data.metadata}
              selectedMeshId={state.selectedMeshId}
              evaluationClasses={state.evaluationClasses}
              changeTypes={state.changeTypes}
              onSelectMesh={selectMesh}
            />
            <div className="evidence-column">
              <EvidencePanel
                feature={selectedFeature}
                experiment={data.experiment}
                metadata={data.metadata}
                onClearSelection={() => dispatch({ type: 'clear_selection' })}
              />
              <MeshBrowser
                features={filteredMeshes}
                selectedMeshId={state.selectedMeshId}
                onSelectMesh={selectMesh}
              />
            </div>
          </div>
        </section>

        <ResearchSections experiment={data.experiment} metadata={data.metadata} />
      </main>

      <footer className="site-footer">
        <div>
          <strong>Urban Change Evidence Explorer</strong>
          <p>A research viewer—not a new scientific experiment.</p>
        </div>
        <div>
          <span>Dataset {data.metadata.dataset_version}</span>
          <a href="#top">Back to top ↑</a>
        </div>
      </footer>
    </>
  );
}

export default function App() {
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    loadAppData()
      .then((data) => {
        if (!cancelled) setLoadState({ status: 'ready', data });
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Unknown dataset error';
        if (!cancelled) setLoadState({ status: 'error', message });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="site-frame">
      <Header />
      {loadState.status === 'loading' && <LoadingState />}
      {loadState.status === 'error' && <ErrorState message={loadState.message} />}
      {loadState.status === 'ready' && <Explorer data={loadState.data} />}
    </div>
  );
}
