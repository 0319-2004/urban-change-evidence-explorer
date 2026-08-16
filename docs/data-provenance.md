# Data Provenance

## Source version

- Repository: `https://github.com/0319-2004/shimokita-building-change-detection`
- Audited commit: `ef7039a717092e8918b042b23c81b44a8e45f93f`
- Audit date: 2026-08-16
- Application dataset: `window-a-frozen@ef7039a71709`

File hashes are stored in `public/data/metadata.json` and summarized in `SOURCE_AUDIT.md`.

## Canonical joins

### Detection

`shimokita_density_2025.geojson` provides 676 polygons and the frozen source density. A mesh is detected exactly when `density > 0`, matching the source verification scripts.

### Ground truth

Interpreter A and B rows are joined by integer `mesh_id`.

- `○` and `○` → `CHANGE`
- `×` and `×` → `NO_CHANGE`
- every other pair → no evaluation class

No majority rule, uncertainty-symbol cleanup, or type inference is used.

### Evaluation class

| Ground truth | Detected | Class |
|---|---:|---|
| Change | true | TP |
| No change | true | FP |
| Change | false | FN |
| No change | false | TN |
| Not available | either | Not evaluated |

### Change type

Only `strict24_members.csv` supplies the display change type.

- `N` → New construction
- `D` → Demolition
- `R` → Rebuilding
- `複合` → Compound / other

The mapping changes display labels only. `source_change_type` preserves the canonical value. Meshes outside STRICT24 have a JSON `null` type.

## Geometry transformation

The source polygons use EPSG:3857 coordinates embedded in a GeoJSON-like export. The build script applies the standard spherical Web Mercator inverse transform with radius 6,378,137 m and writes WGS84 longitude/latitude coordinates for web use.

The script validates:

- polygon geometry type;
- closed rings;
- finite numeric coordinates;
- source coordinate bounds;
- transformed longitude/latitude ranges;
- unique IDs 0–675.

## Derived visualization

`density_rank` is a competition rank among the 29 positive-density meshes. Ties share a rank. Zero-density meshes receive `null`, not a misleading tied rank.

This field is identified as derived in metadata and in the evidence panel.

## Missing values

Unavailable scientific evidence is written as JSON `null` and displayed as **Not available**. A zero density is preserved as the observed numeric value `0.0000`; it is not treated as missing.

## Regeneration

```bash
npm run build:data -- \
  --source-dir ../shimokita-building-change-detection \
  --generated-at 2026-08-16T03:15:00+00:00
```

Omit `--generated-at` to use the current UTC time. Pin the source clone to the intended commit before generating.

After regeneration:

```bash
npm test
npm run build
git diff -- public/data SOURCE_AUDIT.md
```

Review every source hash, count, and scientific field change. Do not accept changes solely because the pipeline succeeds.

## Redistribution notice

The source research repository has no standard license file. Its README requests discussion through an issue before reusing data or scripts. The viewer's MIT code license does not grant rights over the generated source-derived dataset.
