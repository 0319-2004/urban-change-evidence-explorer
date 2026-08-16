# Source Audit

## Audit scope

This audit covers the public research repository [0319-2004/shimokita-building-change-detection](https://github.com/0319-2004/shimokita-building-change-detection) at commit `ef7039a717092e8918b042b23c81b44a8e45f93f` (2026-08-04). The repository was inspected as a read-only source on 2026-08-16. No canonical research file was modified.

The application is a viewer of the frozen Window A result (winter 2019 versus winter 2025). It does not recompute the SAR test, replace the frozen result, or treat the later corrected-look sensitivity analysis as the canonical evaluation.

## Study unit and coverage

- Study area: Shimokitazawa, Setagaya, Tokyo, approximately 1 km².
- Spatial unit: a 50 m grid defined in EPSG:3857 by Google Earth Engine `coveringGrid`.
- Ground dimension: approximately 40.6 m per side at this latitude because of Web Mercator distortion.
- Grid: 676 polygons (26 × 26), mesh IDs 0–675.
- Evaluated subset: 55 meshes with agreement between both blinded interpreters on change/no-change.
- Agreed ground truth: 37 change-positive meshes and 18 change-negative meshes.
- Not evaluated in the frozen confusion matrix: 621 meshes without agreed ground truth, including 24 interpreter-disagreement meshes among the 79 reviewed candidates.
- Frozen SAR-positive set: 29 of 676 meshes, defined by source `density > 0`.
- Frozen confusion matrix over the 55 agreed meshes: TP 16, FP 5, FN 21, TN 13.

The application therefore distinguishes five states: TP, FP, FN, TN, and Not evaluated. Assigning the 621 other grid cells to TN or FN would be scientifically incorrect.

## Canonical application inputs

### `02_canonical_data/shimokita_density_2025.geojson`

Primary geometry and frozen detection-result input.

- 676 polygon features in EPSG:3857.
- Properties: `mesh_id`, `density`, and `mean`.
- `mesh_id` is unique and sequential from 0 through 675.
- `density > 0` is the frozen mesh-level detection rule documented by the repository verification scripts.
- `density` is the mesh mean of the binary pixel-level change mask; it is not a building count or probability.
- The `.geojson` extension is potentially misleading for web use because coordinates are projected EPSG:3857, while RFC 7946 web GeoJSON expects WGS84 longitude/latitude. The application pipeline must transform coordinates to EPSG:4326.
- SHA-256: `03aec3253994f6628a53741a026aa0fce4ae4dd9c1f85f8aa7a8aa865c98734f`.

Suitable for: geometry, mesh ID, source density, frozen detected/not-detected result.

### `02_canonical_data/graduate_thesis_judge_A.csv`

Interpreter A record for 79 candidate meshes.

- Columns: `mesh_id`, `judgment`, `type`, `memo`, `needs_check`.
- Change judgment uses `○`, `×`, and `△`.
- Type strings can contain compound or uncertainty notation and must not be normalized silently.
- SHA-256: `9fa97d9a5b4aa739594a9f3a3bdab26f18ee083d04eba17620ab4bbef80ab597`.

Suitable for: reconstructing agreed change/no-change ground truth when joined with interpreter B; displaying verbatim interpreter notes where present.

### `02_canonical_data/graduate_thesis_judge_B.csv`

Interpreter B record with the same schema and candidate set as interpreter A.

- SHA-256: `80f15d3e69b1a9749ee6bdabc067be64f1dd39d221a8721acd79263ae5f66d0e`.

Suitable for: reconstructing agreed ground truth and documenting disagreement or missing type consensus.

### `02_canonical_data/strict24_members.csv`

Canonical frozen change-type subset.

- 24 ground-truth-positive meshes with an accepted final type.
- Type counts: new construction (`N`) 6, demolition (`D`) 4, replacement/rebuilding (`R`) 13, compound 1.
- The set is 22 exact interpreter type-string matches plus two documented manual resolutions (mesh 118 = `N`; mesh 193 = compound).
- Type strings must be compared literally; in particular, `?` must not be removed.
- SHA-256: `2a4f8f64995cc5c44b218c9f9d13fec3869054ad77ab890d55e517d20900c474`.

Suitable for: the primary change-type filter and frozen type labels. A missing row is not equivalent to “Other”; it means no accepted frozen type is available.

## Authoritative supporting files

### `03_verification_scripts/Gee_step5_export.js`

Defines the frozen Window A experiment and export:

- AOI: `[139.6605, 35.6564, 139.6717, 35.6654]`.
- Sentinel-1A `COPERNICUS/S1_GRD_FLOAT`, IW, VV, descending orbit, relative orbit 46.
- Observation windows: 2019-01-01 to 2019-03-31 and 2025-01-01 to 2025-03-31.
- Implemented nominal pixel-level `ALPHA = 0.01`, `ENL = 4.4`.
- Mesh aggregation: mean of the binary change mask at 10 m scale.
- SHA-256: `583d77c335bcd1479738d06c628116317eed1aca63ab8c7c6b7fadd40b05169b`.

Suitable for: experiment metadata and the implemented decision-rule description. It is not executed by the viewer.

### `03_verification_scripts/verify_matched_alert_count.py`

Defines and validates the ground-truth reconstruction and frozen evaluation:

- ground-truth positive only when both interpreters use `○`;
- ground-truth negative only when both use `×`;
- all other combinations are excluded from the confusion matrix;
- verifies 37 positive, 18 negative, and 24 excluded reviewed meshes;
- verifies 29 frozen detections and TP 16 / FP 5 / FN 21 / TN 13.
- SHA-256: `6af1cfbea199eab20258de405faafbe5cd1e9208f277c0dc6e7a42885e7c66fd`.

Suitable for: validation invariants and class mapping.

### `README.en.md` and `00_handoff/HANDOFF.md`

Authoritative narrative context for the research question, screening interpretation, limitations, corrected implementation history, reproducibility scope, and missing information.

The README SHA-256 is `c89c8f28c1e8ee99d734437cedb10748fc1a9362050063f2dd3f5cc77817f0e0`.

## Files not used as primary MVP inputs

- `strict24_members_v2.csv`: a post-hoc sensitivity-analysis set. It must not silently replace the frozen STRICT24 set.
- `verifyA_mesh_scores_2019v2025.csv` and `_npix.csv`: corrected-look verification outputs. Useful for research cross-checks, but not the canonical frozen result shown in the MVP.
- `gate_A_*`: later multi-temporal Gate A analyses. These define a separate experiment and are not merged into the Window A viewer in the MVP.
- `event_decomposition_*`: detailed event records for only meshes 193 and 620. Coverage is too narrow for a general field.
- `graduate_thesis_judge_*` rows without agreement: not valid evaluation labels.
- `.geo` fields in CSV exports: empty `MultiPoint` placeholders, not usable mesh geometry.

## Field derivation rules

The application pipeline may derive only the following display fields:

| Application field | Rule | Status |
|---|---|---|
| `evaluation_class` | Agreed GT + frozen `density > 0` → TP/FP/FN/TN; otherwise `NOT_EVALUATED` | Deterministic join |
| `ground_truth` | `CHANGE` for `○/○`; `NO_CHANGE` for `×/×`; otherwise `NOT_AVAILABLE` | Deterministic join |
| `detected` | `true` exactly when source `density > 0` | Deterministic mapping |
| `change_type` | Frozen `strict24_members.csv` `final_type` only | Preserved mapping |
| `density_rank` | Competition rank of source density across all 676 meshes | Derived visualization |
| WGS84 geometry | Standard inverse Web Mercator transform from EPSG:3857 | Coordinate transformation |
| explanation | Fixed lookup from evaluation class | Deterministic presentation |

Missing values remain `null` in the generated dataset and display as “Not available.” They are never converted to zero or inferred from nearby meshes.

## Known scientific and provenance limitations

1. The ground-truth observation period (GSI aerial photo 2017-05-30 and Setagaya orthophoto November 2021) does not fully match Window A (winter 2019 versus winter 2025).
2. Human interpretation cannot be independently reproduced from this repository because the aerial imagery is not included.
3. The frozen test used an incorrect look-number parameter. Research records retain the frozen result and document corrected-look sensitivity analyses; the viewer must state this rather than relabel the result as corrected.
4. A positive mesh is a screening flag within a spatial unit, not a building-level detection claim.
5. The `density` field is not a calibrated probability and must not be formatted as confidence.
6. Change type is available only for the frozen STRICT24 subset and has lower interpreter agreement than binary change/no-change judgment.
7. Source notes may be Japanese; the application may label fields in English but must preserve verbatim content rather than machine-translate scientific evidence.

## Licensing finding

The audited source repository contains no `LICENSE` file. Its README states that the materials are published for academic reproducibility and asks users to open an issue to discuss reuse of data or scripts. The viewer can be developed under the user's instruction, but redistribution rights for source-derived data are not granted by a standard public license. The application therefore separates its code license from the research-data notice and documents this issue prominently. Public deployment should be confirmed with the research repository owner.

## Audit conclusion

The four canonical data files above are sufficient for a scientifically bounded static viewer of all 676 grid cells and the frozen 55-mesh evaluation subset. They do not support building-level claims, exact event dates, accepted change types for every positive mesh, or evaluation classes outside the agreed 55-mesh subset.
