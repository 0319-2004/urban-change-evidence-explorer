import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import type {
  FilterSpecification,
  GeoJSONSourceSpecification,
  Map as MapLibreMap,
  MapGeoJSONFeature,
  MapLayerMouseEvent,
  StyleSpecification,
} from 'maplibre-gl';
import type {
  ChangeType,
  EvaluationClass,
  MeshCollection,
  Metadata,
} from '../types/research';
import { EVALUATION_CLASS_CONFIG } from '../utils/classification';
import { Legend } from '../components/Legend';

import 'maplibre-gl/dist/maplibre-gl.css';

// MapLibre v6 requires bundlers to provide the worker URL explicitly.
// Vite's worker pipeline keeps the worker and its shared imports together.
maplibregl.setWorkerUrl(maplibreWorkerUrl);

const SOURCE_ID = 'research-meshes';
const CONTEXT_FILL_LAYER = 'mesh-context-fill';
const CONTEXT_LINE_LAYER = 'mesh-context-line';
const EVALUATION_FILL_LAYER = 'mesh-evaluation-fill';
const EVALUATION_LINE_LAYER = 'mesh-evaluation-line';
const HOVER_LAYER = 'mesh-hover-line';
const SELECTED_LAYER = 'mesh-selected-line';
const HIT_LAYER = 'mesh-hit-area';

interface MapViewProps {
  meshes: MeshCollection;
  metadata: Metadata;
  selectedMeshId: number | null;
  evaluationClasses: readonly EvaluationClass[];
  changeTypes: readonly ChangeType[];
  onSelectMesh: (meshId: number) => void;
}

const style: StyleSpecification = {
  version: 8,
  sources: {
    'openstreetmap-basemap': {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 19,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [
    { id: 'background', type: 'background', paint: { 'background-color': '#e8e7e1' } },
    {
      id: 'openstreetmap-basemap',
      type: 'raster',
      source: 'openstreetmap-basemap',
      paint: { 'raster-opacity': 0.78, 'raster-saturation': -0.72, 'raster-contrast': 0.05 },
    },
  ],
};

function makeFilter(
  evaluationClasses: readonly EvaluationClass[],
  changeTypes: readonly ChangeType[],
): FilterSpecification {
  const classFilter: FilterSpecification = [
    'in',
    ['get', 'evaluation_class'],
    ['literal', evaluationClasses],
  ];
  if (changeTypes.length === 0) return classFilter;
  return [
    'all',
    classFilter,
    ['in', ['get', 'change_type'], ['literal', changeTypes]],
  ] as FilterSpecification;
}

function featureMeshId(feature: MapGeoJSONFeature | undefined): number | null {
  if (!feature) return null;
  const raw = feature.properties?.mesh_id;
  const meshId = typeof raw === 'number' ? raw : Number(raw);
  return Number.isInteger(meshId) ? meshId : null;
}

function featureCenter(meshes: MeshCollection, meshId: number): [number, number] | null {
  const feature = meshes.features.find((candidate) => candidate.properties.mesh_id === meshId);
  const ring = feature?.geometry.coordinates[0];
  if (!ring || ring.length < 4) return null;
  const positions = ring.slice(0, -1);
  const longitude = positions.reduce((sum, position) => sum + position[0], 0) / positions.length;
  const latitude = positions.reduce((sum, position) => sum + position[1], 0) / positions.length;
  return [longitude, latitude];
}

export function MapView({
  meshes,
  metadata,
  selectedMeshId,
  evaluationClasses,
  changeTypes,
  onSelectMesh,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const hoveredIdRef = useRef<number | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [basemapUnavailable, setBasemapUnavailable] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const [west, south, east, north] = metadata.spatial.bbox;
    const map = new maplibregl.Map({
      container,
      style,
      bounds: [
        [west, south],
        [east, north],
      ],
      fitBoundsOptions: { padding: 42 },
      minZoom: 13,
      maxZoom: 20,
      pitchWithRotate: false,
      dragRotate: false,
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric', maxWidth: 110 }), 'bottom-left');

    const canvas = map.getCanvas();
    canvas.setAttribute('aria-label', 'Interactive map of Shimokitazawa evaluation meshes');
    canvas.setAttribute('role', 'application');

    const popup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 12,
      className: 'mesh-hover-popup',
    });
    popupRef.current = popup;

    map.on('error', (event) => {
      const message = event.error?.message ?? '';
      if (/tile|raster|openstreetmap/i.test(message)) setBasemapUnavailable(true);
    });

    map.on('load', () => {
      map.addSource(SOURCE_ID, {
        type: 'geojson',
        // Reuse the collection already fetched and validated by the application.
        // Loading the same file a second time inside MapLibre can leave the map
        // with a basemap but no research layer if that independent request stalls.
        data: meshes as GeoJSONSourceSpecification['data'],
        promoteId: 'mesh_id',
      } satisfies GeoJSONSourceSpecification);

      map.addLayer({
        id: CONTEXT_FILL_LAYER,
        type: 'fill',
        source: SOURCE_ID,
        paint: {
          'fill-color': '#d6ded9',
          'fill-opacity': [
            'case',
            ['==', ['get', 'evaluation_class'], 'NOT_EVALUATED'],
            0.2,
            0.1,
          ],
        },
      });
      map.addLayer({
        id: CONTEXT_LINE_LAYER,
        type: 'line',
        source: SOURCE_ID,
        paint: { 'line-color': '#2e4d48', 'line-width': 0.9, 'line-opacity': 0.76 },
      });
      map.addLayer({
        id: EVALUATION_FILL_LAYER,
        type: 'fill',
        source: SOURCE_ID,
        filter: makeFilter(evaluationClasses, changeTypes),
        paint: {
          'fill-color': [
            'match',
            ['get', 'evaluation_class'],
            'TP',
            EVALUATION_CLASS_CONFIG.TP.color,
            'FP',
            EVALUATION_CLASS_CONFIG.FP.color,
            'FN',
            EVALUATION_CLASS_CONFIG.FN.color,
            'TN',
            EVALUATION_CLASS_CONFIG.TN.color,
            EVALUATION_CLASS_CONFIG.NOT_EVALUATED.color,
          ],
          'fill-opacity': [
            'case',
            ['==', ['get', 'evaluation_class'], 'NOT_EVALUATED'],
            0.24,
            0.86,
          ],
        },
      });
      map.addLayer({
        id: EVALUATION_LINE_LAYER,
        type: 'line',
        source: SOURCE_ID,
        filter: makeFilter(evaluationClasses, changeTypes),
        paint: {
          'line-color': [
            'case',
            ['==', ['get', 'evaluation_class'], 'NOT_EVALUATED'],
            '#737a76',
            '#ffffff',
          ],
          'line-width': [
            'case',
            ['==', ['get', 'evaluation_class'], 'NOT_EVALUATED'],
            0.7,
            1.35,
          ],
          'line-opacity': 0.86,
        },
      });
      map.addLayer({
        id: HOVER_LAYER,
        type: 'line',
        source: SOURCE_ID,
        paint: {
          'line-color': '#092b35',
          'line-width': ['case', ['boolean', ['feature-state', 'hover'], false], 2.4, 0],
          'line-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 1, 0],
        },
      });
      map.addLayer({
        id: SELECTED_LAYER,
        type: 'line',
        source: SOURCE_ID,
        filter: ['==', ['get', 'mesh_id'], -1],
        paint: { 'line-color': '#071d24', 'line-width': 4, 'line-opacity': 1 },
      });
      map.addLayer({
        id: HIT_LAYER,
        type: 'fill',
        source: SOURCE_ID,
        paint: { 'fill-color': '#000000', 'fill-opacity': 0 },
      });

      map.on('mousemove', HIT_LAYER, (event: MapLayerMouseEvent) => {
        const feature = event.features?.[0];
        const meshId = featureMeshId(feature);
        if (meshId === null) return;
        if (hoveredIdRef.current !== null && hoveredIdRef.current !== meshId) {
          map.setFeatureState({ source: SOURCE_ID, id: hoveredIdRef.current }, { hover: false });
        }
        hoveredIdRef.current = meshId;
        map.setFeatureState({ source: SOURCE_ID, id: meshId }, { hover: true });
        map.getCanvas().style.cursor = 'pointer';

        const classValue = feature?.properties?.evaluation_class as EvaluationClass | undefined;
        const tooltip = document.createElement('div');
        const title = document.createElement('strong');
        title.textContent = `Mesh ${meshId}`;
        const detail = document.createElement('span');
        detail.textContent = classValue
          ? EVALUATION_CLASS_CONFIG[classValue].longLabel
          : 'Evidence available';
        tooltip.append(title, detail);
        popup.setLngLat(event.lngLat).setDOMContent(tooltip).addTo(map);
      });

      map.on('mouseleave', HIT_LAYER, () => {
        if (hoveredIdRef.current !== null) {
          map.setFeatureState({ source: SOURCE_ID, id: hoveredIdRef.current }, { hover: false });
        }
        hoveredIdRef.current = null;
        map.getCanvas().style.cursor = '';
        popup.remove();
      });

      map.on('click', HIT_LAYER, (event: MapLayerMouseEvent) => {
        const meshId = featureMeshId(event.features?.[0]);
        if (meshId !== null) onSelectMesh(meshId);
      });
      setMapReady(true);
    });

    return () => {
      setMapReady(false);
      popup.remove();
      map.remove();
      mapRef.current = null;
    };
  }, [meshes, metadata.spatial.bbox, onSelectMesh]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    const filter = makeFilter(evaluationClasses, changeTypes);
    map.setFilter(EVALUATION_FILL_LAYER, filter);
    map.setFilter(EVALUATION_LINE_LAYER, filter);
  }, [changeTypes, evaluationClasses, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    map.setFilter(SELECTED_LAYER, [
      '==',
      ['get', 'mesh_id'],
      selectedMeshId ?? -1,
    ] as FilterSpecification);
    if (selectedMeshId === null) return;
    const center = featureCenter(meshes, selectedMeshId);
    if (!center) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    map.easeTo({
      center,
      duration: reducedMotion ? 0 : 420,
    });
  }, [mapReady, meshes, selectedMeshId]);

  return (
    <div className="map-frame" aria-label="Study area map">
      <div ref={containerRef} className="map-canvas" />
      {!mapReady && <div className="map-loading">Preparing research grid…</div>}
      {basemapUnavailable && (
        <div className="basemap-status" role="status">
          Basemap unavailable. Research meshes remain interactive.
        </div>
      )}
      <Legend />
      <div className="map-scope-note">
        <strong>Analysis unit</strong>
        <span>50 m EPSG:3857 grid · ≈40.6 m on ground</span>
      </div>
    </div>
  );
}
