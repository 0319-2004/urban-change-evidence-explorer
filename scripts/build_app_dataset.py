#!/usr/bin/env python3
"""Build the static application dataset from the read-only research repository.

The script validates the frozen Window A source schemas and invariants, converts
the projected grid from EPSG:3857 to RFC 7946-compatible EPSG:4326, and writes
web-safe files. It never writes inside the source repository.
"""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import hashlib
import json
import math
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable, Mapping, Sequence


SOURCE_REPOSITORY = "https://github.com/0319-2004/shimokita-building-change-detection"
SCHEMA_VERSION = "1.0.0"

GEOMETRY_FILE = Path("02_canonical_data/shimokita_density_2025.geojson")
JUDGE_A_FILE = Path("02_canonical_data/graduate_thesis_judge_A.csv")
JUDGE_B_FILE = Path("02_canonical_data/graduate_thesis_judge_B.csv")
STRICT24_FILE = Path("02_canonical_data/strict24_members.csv")
EXPERIMENT_FILE = Path("03_verification_scripts/Gee_step5_export.js")
VERIFY_FILE = Path("03_verification_scripts/verify_matched_alert_count.py")

EXPECTED_MESH_COUNT = 676
EXPECTED_REVIEWED_COUNT = 79
EXPECTED_STRICT_TYPE_COUNT = 24
EXPECTED_GT_COUNTS = {"change": 37, "no_change": 18, "excluded": 24}
EXPECTED_CLASS_COUNTS = {"TP": 16, "FP": 5, "FN": 21, "TN": 13, "NOT_EVALUATED": 621}
EXPECTED_DETECTED_COUNT = 29

ALLOWED_JUDGMENTS = {"○", "×", "△"}
ALLOWED_SOURCE_TYPES = {"N", "D", "R", "複合"}
CHANGE_TYPE_MAP = {
    "N": "NEW_CONSTRUCTION",
    "D": "DEMOLITION",
    "R": "REBUILDING",
    "複合": "COMPOUND_OTHER",
}


class DatasetValidationError(ValueError):
    """Raised when scientific source data violates an expected invariant."""


@dataclass(frozen=True)
class JudgeRecord:
    mesh_id: int
    judgment: str
    change_type: str | None
    memo: str | None
    needs_check: str | None


@dataclass(frozen=True)
class StrictTypeRecord:
    mesh_id: int
    judge_a_type: str
    judge_b_type: str
    final_type: str
    reason: str


def log(message: str) -> None:
    print(f"[build_app_dataset] {message}")


def require_columns(fieldnames: Sequence[str] | None, required: set[str], path: Path) -> None:
    if fieldnames is None:
        raise DatasetValidationError(f"{path}: missing CSV header")
    actual = set(fieldnames)
    missing = required - actual
    if missing:
        raise DatasetValidationError(f"{path}: missing required columns {sorted(missing)}")


def parse_mesh_id(raw: Any, context: str) -> int:
    if isinstance(raw, bool):
        raise DatasetValidationError(f"{context}: boolean is not a valid mesh_id")
    if isinstance(raw, int):
        return raw
    if isinstance(raw, str) and raw.strip().isdigit():
        return int(raw.strip())
    raise DatasetValidationError(f"{context}: invalid mesh_id {raw!r}")


def optional_text(raw: str | None) -> str | None:
    if raw is None:
        return None
    value = raw.strip()
    return value or None


def read_judges(path: Path) -> dict[int, JudgeRecord]:
    required = {"mesh_id", "judgment", "type", "memo", "needs_check"}
    records: dict[int, JudgeRecord] = {}
    with path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        require_columns(reader.fieldnames, required, path)
        for line_number, row in enumerate(reader, start=2):
            mesh_id = parse_mesh_id(row["mesh_id"], f"{path}:{line_number}")
            if mesh_id in records:
                raise DatasetValidationError(f"{path}:{line_number}: duplicate mesh_id {mesh_id}")
            judgment = row["judgment"].strip()
            if judgment not in ALLOWED_JUDGMENTS:
                raise DatasetValidationError(
                    f"{path}:{line_number}: unsupported judgment {judgment!r}"
                )
            records[mesh_id] = JudgeRecord(
                mesh_id=mesh_id,
                judgment=judgment,
                change_type=optional_text(row.get("type")),
                memo=optional_text(row.get("memo")),
                needs_check=optional_text(row.get("needs_check")),
            )
    return records


def read_strict_types(path: Path) -> dict[int, StrictTypeRecord]:
    required = {"mesh_id", "judge_A_type", "judge_B_type", "final_type", "reason"}
    records: dict[int, StrictTypeRecord] = {}
    with path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        require_columns(reader.fieldnames, required, path)
        for line_number, row in enumerate(reader, start=2):
            raw_mesh_id = (row.get("mesh_id") or "").strip()
            if not raw_mesh_id or raw_mesh_id.startswith("#"):
                continue
            mesh_id = parse_mesh_id(raw_mesh_id, f"{path}:{line_number}")
            if mesh_id in records:
                raise DatasetValidationError(f"{path}:{line_number}: duplicate mesh_id {mesh_id}")
            final_type = row["final_type"].strip()
            if final_type not in ALLOWED_SOURCE_TYPES:
                raise DatasetValidationError(
                    f"{path}:{line_number}: unsupported final_type {final_type!r}"
                )
            records[mesh_id] = StrictTypeRecord(
                mesh_id=mesh_id,
                judge_a_type=row["judge_A_type"].strip(),
                judge_b_type=row["judge_B_type"].strip(),
                final_type=final_type,
                reason=row["reason"].strip(),
            )
    return records


def finite_number(value: Any, context: str) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise DatasetValidationError(f"{context}: expected a number, got {value!r}")
    number = float(value)
    if not math.isfinite(number):
        raise DatasetValidationError(f"{context}: expected a finite number, got {value!r}")
    return number


def web_mercator_to_wgs84(position: Sequence[Any], context: str) -> list[float]:
    if len(position) != 2:
        raise DatasetValidationError(f"{context}: coordinate must contain exactly two numbers")
    x = finite_number(position[0], f"{context}[0]")
    y = finite_number(position[1], f"{context}[1]")
    limit = 20_037_508.342789244
    if not (-limit <= x <= limit and -limit <= y <= limit):
        raise DatasetValidationError(f"{context}: coordinate is outside EPSG:3857 bounds")
    radius = 6_378_137.0
    lon = math.degrees(x / radius)
    lat = math.degrees(2 * math.atan(math.exp(y / radius)) - math.pi / 2)
    if not (-180 <= lon <= 180 and -90 <= lat <= 90):
        raise DatasetValidationError(f"{context}: transformed coordinate is outside WGS84 bounds")
    return [round(lon, 8), round(lat, 8)]


def transform_polygon(geometry: Mapping[str, Any], context: str) -> dict[str, Any]:
    if geometry.get("type") != "Polygon":
        raise DatasetValidationError(f"{context}: only Polygon geometry is supported")
    coordinates = geometry.get("coordinates")
    if not isinstance(coordinates, list) or not coordinates:
        raise DatasetValidationError(f"{context}: Polygon coordinates are missing")
    transformed: list[list[list[float]]] = []
    for ring_index, ring in enumerate(coordinates):
        if not isinstance(ring, list) or len(ring) < 4:
            raise DatasetValidationError(f"{context}: ring {ring_index} has fewer than four positions")
        new_ring = [
            web_mercator_to_wgs84(position, f"{context}.ring[{ring_index}].position[{index}]")
            for index, position in enumerate(ring)
        ]
        if new_ring[0] != new_ring[-1]:
            raise DatasetValidationError(f"{context}: ring {ring_index} is not closed")
        transformed.append(new_ring)
    return {"type": "Polygon", "coordinates": transformed}


def reconstruct_ground_truth(
    judges_a: Mapping[int, JudgeRecord], judges_b: Mapping[int, JudgeRecord]
) -> tuple[dict[int, str], dict[int, str]]:
    if set(judges_a) != set(judges_b):
        only_a = sorted(set(judges_a) - set(judges_b))
        only_b = sorted(set(judges_b) - set(judges_a))
        raise DatasetValidationError(
            f"Interpreter mesh sets differ; only A={only_a}, only B={only_b}"
        )
    ground_truth: dict[int, str] = {}
    review_status: dict[int, str] = {}
    for mesh_id in judges_a:
        judgment_a = judges_a[mesh_id].judgment
        judgment_b = judges_b[mesh_id].judgment
        if judgment_a == "○" and judgment_b == "○":
            ground_truth[mesh_id] = "CHANGE"
            review_status[mesh_id] = "AGREED"
        elif judgment_a == "×" and judgment_b == "×":
            ground_truth[mesh_id] = "NO_CHANGE"
            review_status[mesh_id] = "AGREED"
        else:
            review_status[mesh_id] = "DISAGREED"
    return ground_truth, review_status


def evaluation_class(ground_truth: str | None, detected: bool) -> str:
    if ground_truth == "CHANGE":
        return "TP" if detected else "FN"
    if ground_truth == "NO_CHANGE":
        return "FP" if detected else "TN"
    return "NOT_EVALUATED"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(65_536), b""):
            digest.update(chunk)
    return digest.hexdigest()


def source_commit(source_dir: Path) -> str:
    try:
        completed = subprocess.run(
            ["git", "-C", str(source_dir), "rev-parse", "HEAD"],
            check=True,
            capture_output=True,
            text=True,
        )
    except (OSError, subprocess.CalledProcessError):
        return "not-available"
    return completed.stdout.strip()


def iter_positions(geometry: Mapping[str, Any]) -> Iterable[tuple[float, float]]:
    for ring in geometry["coordinates"]:
        for lon, lat in ring:
            yield float(lon), float(lat)


def calculate_positive_ranks(densities: Mapping[int, float]) -> dict[int, int | None]:
    positive = sorted(
        ((mesh_id, density) for mesh_id, density in densities.items() if density > 0),
        key=lambda item: (-item[1], item[0]),
    )
    ranks: dict[int, int | None] = {mesh_id: None for mesh_id in densities}
    previous_density: float | None = None
    previous_rank = 0
    for index, (mesh_id, density) in enumerate(positive, start=1):
        if previous_density is None or density != previous_density:
            previous_rank = index
            previous_density = density
        ranks[mesh_id] = previous_rank
    return ranks


def load_source_geojson(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict) or data.get("type") != "FeatureCollection":
        raise DatasetValidationError(f"{path}: expected a GeoJSON FeatureCollection")
    features = data.get("features")
    if not isinstance(features, list):
        raise DatasetValidationError(f"{path}: missing features array")
    return data


def validate_source_counts(
    mesh_count: int,
    reviewed_count: int,
    strict_count: int,
    gt: Mapping[int, str],
    review_status: Mapping[int, str],
) -> None:
    if mesh_count != EXPECTED_MESH_COUNT:
        raise DatasetValidationError(
            f"Expected {EXPECTED_MESH_COUNT} mesh features, found {mesh_count}"
        )
    if reviewed_count != EXPECTED_REVIEWED_COUNT:
        raise DatasetValidationError(
            f"Expected {EXPECTED_REVIEWED_COUNT} reviewed meshes, found {reviewed_count}"
        )
    if strict_count != EXPECTED_STRICT_TYPE_COUNT:
        raise DatasetValidationError(
            f"Expected {EXPECTED_STRICT_TYPE_COUNT} STRICT24 rows, found {strict_count}"
        )
    counts = {
        "change": sum(value == "CHANGE" for value in gt.values()),
        "no_change": sum(value == "NO_CHANGE" for value in gt.values()),
        "excluded": sum(value == "DISAGREED" for value in review_status.values()),
    }
    if counts != EXPECTED_GT_COUNTS:
        raise DatasetValidationError(
            f"Ground-truth counts changed: expected {EXPECTED_GT_COUNTS}, found {counts}"
        )


def build_dataset(source_dir: Path, generated_at: str) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]]:
    paths = {
        "geometry": source_dir / GEOMETRY_FILE,
        "judge_a": source_dir / JUDGE_A_FILE,
        "judge_b": source_dir / JUDGE_B_FILE,
        "strict24": source_dir / STRICT24_FILE,
        "experiment": source_dir / EXPERIMENT_FILE,
        "verification": source_dir / VERIFY_FILE,
    }
    for label, path in paths.items():
        if not path.is_file():
            raise DatasetValidationError(f"Required {label} source file does not exist: {path}")
        log(f"source {label}: {path}")

    source_geojson = load_source_geojson(paths["geometry"])
    judges_a = read_judges(paths["judge_a"])
    judges_b = read_judges(paths["judge_b"])
    strict_types = read_strict_types(paths["strict24"])
    ground_truth, review_status = reconstruct_ground_truth(judges_a, judges_b)

    validate_source_counts(
        len(source_geojson["features"]),
        len(judges_a),
        len(strict_types),
        ground_truth,
        review_status,
    )

    source_features: dict[int, Mapping[str, Any]] = {}
    densities: dict[int, float] = {}
    for index, feature in enumerate(source_geojson["features"]):
        if not isinstance(feature, dict) or feature.get("type") != "Feature":
            raise DatasetValidationError(f"Feature {index}: expected GeoJSON Feature")
        properties = feature.get("properties")
        if not isinstance(properties, dict):
            raise DatasetValidationError(f"Feature {index}: missing properties")
        for required_property in ("mesh_id", "density", "mean"):
            if required_property not in properties:
                raise DatasetValidationError(
                    f"Feature {index}: missing required property {required_property!r}"
                )
        mesh_id = parse_mesh_id(properties["mesh_id"], f"Feature {index}")
        if mesh_id in source_features:
            raise DatasetValidationError(f"Feature {index}: duplicate mesh_id {mesh_id}")
        density = finite_number(properties["density"], f"Feature {mesh_id}.density")
        mean = finite_number(properties["mean"], f"Feature {mesh_id}.mean")
        if not (0 <= density <= 1 and 0 <= mean <= 1):
            raise DatasetValidationError(f"Feature {mesh_id}: density/mean must be in [0, 1]")
        if not math.isclose(density, mean, rel_tol=0, abs_tol=1e-12):
            raise DatasetValidationError(
                f"Feature {mesh_id}: source density {density} differs from mean {mean}"
            )
        source_features[mesh_id] = feature
        densities[mesh_id] = density

    expected_ids = set(range(EXPECTED_MESH_COUNT))
    if set(source_features) != expected_ids:
        missing = sorted(expected_ids - set(source_features))
        unexpected = sorted(set(source_features) - expected_ids)
        raise DatasetValidationError(
            f"Mesh ID domain changed; missing={missing}, unexpected={unexpected}"
        )

    detected_count = sum(value > 0 for value in densities.values())
    if detected_count != EXPECTED_DETECTED_COUNT:
        raise DatasetValidationError(
            f"Expected {EXPECTED_DETECTED_COUNT} detected meshes, found {detected_count}"
        )

    ranks = calculate_positive_ranks(densities)
    output_features: list[dict[str, Any]] = []
    bbox = [180.0, 90.0, -180.0, -90.0]
    class_counts = {key: 0 for key in EXPECTED_CLASS_COUNTS}

    for mesh_id in sorted(source_features):
        source_feature = source_features[mesh_id]
        source_properties = source_feature["properties"]
        geometry = transform_polygon(source_feature.get("geometry") or {}, f"Feature {mesh_id}")
        for lon, lat in iter_positions(geometry):
            bbox[0] = min(bbox[0], lon)
            bbox[1] = min(bbox[1], lat)
            bbox[2] = max(bbox[2], lon)
            bbox[3] = max(bbox[3], lat)

        density = densities[mesh_id]
        detected = density > 0
        gt = ground_truth.get(mesh_id)
        eval_class = evaluation_class(gt, detected)
        class_counts[eval_class] += 1
        strict = strict_types.get(mesh_id)
        judge_a = judges_a.get(mesh_id)
        judge_b = judges_b.get(mesh_id)

        if strict is not None and gt != "CHANGE":
            raise DatasetValidationError(
                f"Mesh {mesh_id}: STRICT24 type is attached to non-positive ground truth"
            )

        output_features.append(
            {
                "type": "Feature",
                "id": mesh_id,
                "geometry": geometry,
                "properties": {
                    "mesh_id": mesh_id,
                    "source_feature_id": str(source_feature.get("id", "")),
                    "evaluation_class": eval_class,
                    "ground_truth": gt,
                    "detected": detected,
                    "review_status": review_status.get(mesh_id, "NOT_REVIEWED"),
                    "change_type": CHANGE_TYPE_MAP[strict.final_type] if strict else None,
                    "source_change_type": strict.final_type if strict else None,
                    "type_basis": strict.reason if strict else None,
                    "source_density": density,
                    "source_mean": float(source_properties["mean"]),
                    "density_rank": ranks[mesh_id],
                    "interpreter_a_judgment": judge_a.judgment if judge_a else None,
                    "interpreter_b_judgment": judge_b.judgment if judge_b else None,
                    "interpreter_a_type": judge_a.change_type if judge_a else None,
                    "interpreter_b_type": judge_b.change_type if judge_b else None,
                    "interpreter_a_note": judge_a.memo if judge_a else None,
                    "interpreter_b_note": judge_b.memo if judge_b else None,
                    "interpreter_a_needs_check": judge_a.needs_check if judge_a else None,
                    "interpreter_b_needs_check": judge_b.needs_check if judge_b else None,
                    "experiment_id": "window-a-2019-2025-frozen",
                },
            }
        )

    if class_counts != EXPECTED_CLASS_COUNTS:
        raise DatasetValidationError(
            f"Evaluation classes changed: expected {EXPECTED_CLASS_COUNTS}, found {class_counts}"
        )

    commit = source_commit(source_dir)
    meshes = {
        "type": "FeatureCollection",
        "bbox": [round(value, 8) for value in bbox],
        "features": output_features,
    }
    experiments = {
        "schema_version": SCHEMA_VERSION,
        "experiments": [
            {
                "id": "window-a-2019-2025-frozen",
                "label": "Window A · frozen result",
                "status": "Canonical frozen evaluation",
                "description": "Two-window Sentinel-1 SAR intensity screening result retained by the source study.",
                "observation_windows": [
                    {"label": "Winter 2019", "start": "2019-01-01", "end_exclusive": "2019-03-31", "scene_count": 8},
                    {"label": "Winter 2025", "start": "2025-01-01", "end_exclusive": "2025-03-31", "scene_count": 7},
                ],
                "sensor": "Sentinel-1A",
                "product": "COPERNICUS/S1_GRD_FLOAT",
                "instrument_mode": "IW",
                "polarization": "VV",
                "orbit_pass": "Descending",
                "relative_orbit": 46,
                "method": "Conradsen two-window omnibus likelihood-ratio test (single-polarization form)",
                "implemented_nominal_alpha": 0.01,
                "implemented_enl": 4.4,
                "mesh_aggregation": "Mean of the binary pixel-level change mask at 10 m scale",
                "mesh_detection_rule": "source_density > 0",
                "analysis_unit": "50 m EPSG:3857 grid cell (approximately 40.6 m on the ground)",
                "implementation_note": "The research record documents that the frozen implementation used an incorrect look-number parameter. The frozen result is displayed unchanged; corrected-look analyses are sensitivity checks, not replacements.",
                "source_files": [str(GEOMETRY_FILE), str(EXPERIMENT_FILE), str(VERIFY_FILE)],
            }
        ],
    }
    source_file_metadata = [
        {"path": str(relative), "sha256": sha256(source_dir / relative)}
        for relative in (GEOMETRY_FILE, JUDGE_A_FILE, JUDGE_B_FILE, STRICT24_FILE, EXPERIMENT_FILE, VERIFY_FILE)
    ]
    metadata = {
        "schema_version": SCHEMA_VERSION,
        "dataset_version": f"window-a-frozen@{commit[:12] if commit != 'not-available' else 'unknown'}",
        "generated_at": generated_at,
        "generator": "scripts/build_app_dataset.py",
        "source": {
            "repository": SOURCE_REPOSITORY,
            "commit": commit,
            "license_notice": "No standard license file was present in the audited source repository. Confirm source-data redistribution with the repository owner.",
            "files": source_file_metadata,
        },
        "transformation": {
            "summary": "Validated frozen source values, joined agreed interpreter ground truth and STRICT24 types, derived evaluation classes, and transformed EPSG:3857 polygons to EPSG:4326.",
            "steps": [
                "Validate required source files, schemas, unique mesh IDs, value domains, and frozen counts.",
                "Reconstruct ground truth only for ○/○ and ×/× interpreter agreement.",
                "Define mesh detection exactly as source density > 0.",
                "Map agreed ground truth and detection to TP, FP, FN, or TN; otherwise mark Not evaluated.",
                "Join frozen change types only from strict24_members.csv.",
                "Calculate a positive-density competition rank as a documented derived visualization.",
                "Transform polygon coordinates from EPSG:3857 to EPSG:4326 without changing mesh topology.",
            ],
            "derived_fields": ["evaluation_class", "ground_truth", "detected", "review_status", "change_type", "density_rank"],
        },
        "counts": {
            "meshes": EXPECTED_MESH_COUNT,
            "reviewed_candidates": EXPECTED_REVIEWED_COUNT,
            "evaluated_meshes": 55,
            "ground_truth_change": EXPECTED_GT_COUNTS["change"],
            "ground_truth_no_change": EXPECTED_GT_COUNTS["no_change"],
            "review_disagreement": EXPECTED_GT_COUNTS["excluded"],
            "not_reviewed": EXPECTED_MESH_COUNT - EXPECTED_REVIEWED_COUNT,
            "detected_meshes": EXPECTED_DETECTED_COUNT,
            "strict_change_types": EXPECTED_STRICT_TYPE_COUNT,
            "evaluation_classes": class_counts,
        },
        "spatial": {
            "source_crs": "EPSG:3857",
            "output_crs": "EPSG:4326",
            "bbox": meshes["bbox"],
            "grid_definition": "50 m in EPSG:3857",
            "approximate_ground_dimension_m": 40.6,
        },
        "missing_value_policy": "Unsupported or unavailable fields are JSON null. Missing values are never converted to zero.",
    }
    return meshes, experiments, metadata


def write_json(path: Path, value: Mapping[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    with temporary.open("w", encoding="utf-8", newline="\n") as handle:
        json.dump(value, handle, ensure_ascii=False, indent=2, sort_keys=False)
        handle.write("\n")
    temporary.replace(path)
    log(f"wrote {path}")


def parse_args(argv: Sequence[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--source-dir",
        type=Path,
        required=True,
        help="Path to a read-only clone of shimokita-building-change-detection",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("public/data"),
        help="Output directory (default: public/data)",
    )
    parser.add_argument(
        "--generated-at",
        default=None,
        help="ISO-8601 generation timestamp; defaults to current UTC time",
    )
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv if argv is not None else sys.argv[1:])
    source_dir = args.source_dir.resolve()
    output_dir = args.output_dir.resolve()
    if output_dir == source_dir or source_dir in output_dir.parents:
        raise DatasetValidationError("Output directory must not be inside the read-only source repository")
    generated_at = args.generated_at or dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()
    meshes, experiments, metadata = build_dataset(source_dir, generated_at)
    write_json(output_dir / "meshes.geojson", meshes)
    write_json(output_dir / "experiments.json", experiments)
    write_json(output_dir / "metadata.json", metadata)
    log(
        "validated 676 meshes, 55 evaluation labels, 29 detections, "
        "and TP/FP/FN/TN = 16/5/21/13"
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except DatasetValidationError as error:
        print(f"[build_app_dataset] ERROR: {error}", file=sys.stderr)
        raise SystemExit(2)
