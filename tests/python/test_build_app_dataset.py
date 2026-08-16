from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from scripts.build_app_dataset import (
    DatasetValidationError,
    JudgeRecord,
    evaluation_class,
    read_judges,
    read_strict_types,
    reconstruct_ground_truth,
    transform_polygon,
    web_mercator_to_wgs84,
)


class SourceParserTests(unittest.TestCase):
    def write_fixture(self, directory: Path, name: str, content: str) -> Path:
        path = directory / name
        path.write_text(content, encoding="utf-8")
        return path

    def test_reads_judge_records_without_coercing_missing_values(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            path = self.write_fixture(
                Path(temporary),
                "judge.csv",
                "mesh_id,judgment,type,memo,needs_check\n25,○,R,,\n92,×,,,要確認\n",
            )
            records = read_judges(path)

        self.assertEqual(records[25].change_type, "R")
        self.assertIsNone(records[25].memo)
        self.assertEqual(records[92].needs_check, "要確認")

    def test_rejects_missing_required_columns(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            path = self.write_fixture(
                Path(temporary),
                "invalid.csv",
                "mesh_id,judgment,memo,needs_check\n25,○,,\n",
            )
            with self.assertRaisesRegex(DatasetValidationError, "missing required columns"):
                read_judges(path)

    def test_rejects_duplicate_mesh_ids(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            path = self.write_fixture(
                Path(temporary),
                "duplicate.csv",
                "mesh_id,judgment,type,memo,needs_check\n25,○,R,,\n25,×,,,\n",
            )
            with self.assertRaisesRegex(DatasetValidationError, "duplicate mesh_id 25"):
                read_judges(path)

    def test_strict_type_parser_ignores_documented_comment_rows(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            path = self.write_fixture(
                Path(temporary),
                "strict.csv",
                "mesh_id,judge_A_type,judge_B_type,final_type,reason\n"
                "25,R,R,R,文字列完全一致\n"
                "# documentation comment,,,,\n",
            )
            records = read_strict_types(path)

        self.assertEqual(set(records), {25})
        self.assertEqual(records[25].final_type, "R")

    def test_rejects_unsupported_change_type(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            path = self.write_fixture(
                Path(temporary),
                "strict.csv",
                "mesh_id,judge_A_type,judge_B_type,final_type,reason\n25,R,R,X,invalid\n",
            )
            with self.assertRaisesRegex(DatasetValidationError, "unsupported final_type"):
                read_strict_types(path)


class ScientificMappingTests(unittest.TestCase):
    def record(self, mesh_id: int, judgment: str) -> JudgeRecord:
        return JudgeRecord(mesh_id, judgment, None, None, None)

    def test_ground_truth_requires_exact_interpreter_agreement(self) -> None:
        judges_a = {
            1: self.record(1, "○"),
            2: self.record(2, "×"),
            3: self.record(3, "△"),
        }
        judges_b = {
            1: self.record(1, "○"),
            2: self.record(2, "×"),
            3: self.record(3, "○"),
        }

        ground_truth, review_status = reconstruct_ground_truth(judges_a, judges_b)

        self.assertEqual(ground_truth, {1: "CHANGE", 2: "NO_CHANGE"})
        self.assertEqual(review_status[3], "DISAGREED")

    def test_evaluation_class_mapping(self) -> None:
        self.assertEqual(evaluation_class("CHANGE", True), "TP")
        self.assertEqual(evaluation_class("NO_CHANGE", True), "FP")
        self.assertEqual(evaluation_class("CHANGE", False), "FN")
        self.assertEqual(evaluation_class("NO_CHANGE", False), "TN")
        self.assertEqual(evaluation_class(None, True), "NOT_EVALUATED")


class GeometryValidationTests(unittest.TestCase):
    def test_transforms_known_web_mercator_position(self) -> None:
        lon, lat = web_mercator_to_wgs84([15_546_900.0, 4_253_400.0], "test")
        self.assertAlmostEqual(lon, 139.66017891, places=7)
        self.assertAlmostEqual(lat, 35.65607184, places=7)

    def test_rejects_unclosed_polygon(self) -> None:
        geometry = {
            "type": "Polygon",
            "coordinates": [
                [
                    [15_546_900.0, 4_253_400.0],
                    [15_546_950.0, 4_253_400.0],
                    [15_546_950.0, 4_253_450.0],
                    [15_546_900.0, 4_253_450.0],
                ]
            ],
        }
        with self.assertRaisesRegex(DatasetValidationError, "is not closed"):
            transform_polygon(geometry, "feature")


if __name__ == "__main__":
    unittest.main()
