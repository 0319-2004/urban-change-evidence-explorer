# Technical Research

Research performed 2026-08-16, before application implementation.

## Similar open-source projects and patterns

| Repository | Relevant pattern | Technical lesson | License | Code reuse decision |
|---|---|---|---|---|
| [maplibre/maplibre-gl-js](https://github.com/maplibre/maplibre-gl-js) | Official interactive WebGL map engine with GeoJSON sources, data-driven styles, events, filters, and feature state | Use one GeoJSON source, categorical paint expressions, layer-scoped events, and `feature-state` for hover/selection | BSD-3-Clause | Use the published package and documented API only; no source copying |
| [opengeos/GeoLibre](https://github.com/opengeos/GeoLibre) | React + TypeScript + MapLibre browser GIS with adaptive panels | Keep map rendering separate from React evidence UI; use a responsive panel rather than putting research prose in popups | MIT | Architectural reference only; its general-purpose GIS scope is much larger than this viewer |
| [TerriaJS/terriajs](https://github.com/TerriaJS/terriajs) | Static-deployable geospatial explorer with clear map/workbench/feature-information separation | Provenance and feature information deserve first-class UI alongside the map | Apache-2.0 | No reuse; catalog/3D/service architecture is unnecessary for one static dataset |
| [keplergl/kepler.gl](https://github.com/keplergl/kepler.gl) | Tested React geospatial visualization with filterable, data-driven layers | Keep filtering as deterministic state over data rather than mutating source records | MIT | No reuse; Redux/deck.gl and large-data tooling are disproportionate for 676 polygons |

All selected repositories are actively maintained as of the research date and expose clear licenses and test infrastructure. The project learns interaction and architecture patterns but does not copy their implementation.

## Official documentation consulted

### MapLibre GL JS

- [MapLibre GL JS documentation](https://maplibre.org/maplibre-gl-js/docs/)
- [Create a hover effect](https://maplibre.org/maplibre-gl-js/docs/examples/create-a-hover-effect/): feature IDs plus `setFeatureState` for per-feature hover state.
- [GeoJSONSource API](https://maplibre.org/maplibre-gl-js/docs/API/classes/GeoJSONSource/): URL-backed GeoJSON sources and `setData` when data changes.
- [MapLibre npm/ESM installation](https://github.com/maplibre/maplibre-gl-js/blob/main/docs/index.md): MapLibre v6 requires Vite to bundle the module worker with `?worker&url` and register it through `setWorkerUrl()`.
- MapLibre's BSD-3-Clause license was verified in its [repository license](https://github.com/maplibre/maplibre-gl-js/blob/main/LICENSE.txt).

Selected use: direct `maplibre-gl` integration rather than a React wrapper. React owns application state and the evidence panel; a dedicated map component owns the imperative map instance and synchronizes selection/filter state. The Vite build emits a self-contained MapLibre worker; without this explicit v6 configuration, the basemap can render while GeoJSON sources remain pending without a useful console error.

### React

- [React `useEffect` reference](https://react.dev/reference/react/useEffect)
- [Synchronizing with Effects](https://react.dev/learn/synchronizing-with-effects)

Selected use: initialize and clean up the MapLibre instance inside one effect because it is an external imperative system. Keep derived filtering and explanations in pure functions rather than effects.

### Vite

- [Vite static deployment guide](https://vite.dev/guide/static-deploy.html)

Selected use: a static Vite build with relative asset paths so the same `dist/` works on GitHub Pages project paths or Vercel. Include a GitHub Pages Actions workflow; no runtime backend.

### TypeScript

- [TypeScript Handbook: strictness](https://www.typescriptlang.org/docs/handbook/2/basic-types.html#strictness)
- [`strict` TSConfig option](https://www.typescriptlang.org/tsconfig/strict.html)

Selected use: strict TypeScript and explicit nullable fields. Missing scientific evidence is represented as `null`, not a falsy numeric default.

## Implementation patterns considered

### Selected: validated static data bundle

```text
Read-only research clone
  → Python schema and invariant validation
  → EPSG:3857 to EPSG:4326 transformation
  → public/data/meshes.geojson
  → public/data/experiments.json
  → public/data/metadata.json
  → browser-side schema validation
  → MapLibre + React evidence UI
```

Reasons:

- 676 polygons are small enough for a single static GeoJSON file.
- Static hosting minimizes operational and reproducibility burden.
- Preprocessing makes the non-RFC-7946 projected source safe for browser maps.
- Validation can fail before deployment if source schemas or frozen invariants drift.
- The generated files can include source hashes and a transformation record.

### Selected: one map route with in-page research sections

The primary task is spatial inspection, so the map and evidence panel remain in the first viewport. Method, limitations, and provenance are visible below the map and linked from the header. Separate routes would add navigation cost without improving the MVP's evidence trail.

### Selected: direct MapLibre integration

The app needs only one map, one GeoJSON source, a small set of layers, and standard hover/click events. Direct integration keeps dependencies and abstraction layers small. A React wrapper would not remove the need to understand the underlying layer and source lifecycle.

### Selected: simple remote basemap with an intentional fallback

Use a public OpenStreetMap raster tile source with visible attribution. Research polygons and evidence remain available if basemap tiles fail; the app shows a neutral background rather than hiding the data. No API token is required.

### Selected: deterministic explanations

Explanations are a total mapping over TP/FP/FN/TN/Not evaluated. This is testable, transparent, and avoids unsupported generated interpretation.

## Rejected alternatives

### Backend or spatial database

Rejected because the dataset is static, small, and read-only. A backend would add deployment, security, and maintenance work without enabling an MVP requirement.

### General-purpose GIS frameworks (TerriaJS, GeoLibre, Kepler.gl)

Rejected as application foundations because their catalog, data-upload, analysis, or state-management systems exceed this viewer's scope. Their information-panel and data-driven styling patterns remain useful references.

### Building footprints or inferred event points

Rejected because the source evaluation unit is a mesh and the repository does not provide validated building-level prediction geometry.

### Treating every grid cell as an evaluated negative

Rejected because ground truth exists for only 55 meshes. The correct fifth state is Not evaluated.

### Client-only transformation of the canonical files

Rejected because the source GeoJSON is projected EPSG:3857 and joins require domain-specific validation. A reproducible preprocessing step should detect schema changes and generate web-safe data before the application runs.

### Runtime scientific recomputation

Rejected because the application must visualize existing results. Re-running the SAR statistic in the browser would create a new experiment and is technically inappropriate for a lightweight portfolio viewer.

## Licensing considerations

- MapLibre GL JS: BSD-3-Clause; appropriate as a dependency with attribution through package metadata.
- GeoLibre and Kepler.gl: MIT; patterns reviewed, no copied code.
- TerriaJS: Apache-2.0; patterns reviewed, no copied code.
- OpenStreetMap tiles/data: attribution is displayed on the map; production traffic must comply with the [OpenStreetMap tile usage policy](https://operations.osmfoundation.org/policies/tiles/).
- Source research repository: no standard license is present. Source-derived data redistribution must be confirmed with the repository owner. The application code license does not relicense the research data.

## Selected architecture

- Frontend: React, TypeScript, Vite, MapLibre GL JS.
- Data validation: strict Python preprocessing plus Zod validation at the browser boundary.
- Tests: Python `unittest` for the source parser and Vitest for class mapping, filtering, selection state, missing values, and explanations.
- Hosting: static `dist/`; GitHub Pages workflow included, Vercel compatible without a backend.
- Accessibility: keyboard-operable filters, visible focus, text equivalents for class colors, panel headings announced as selection changes, and reduced-motion-friendly styling.

This is the smallest architecture that supports the requested scientific traceability and interaction without introducing a database, API keys, or new analysis.
