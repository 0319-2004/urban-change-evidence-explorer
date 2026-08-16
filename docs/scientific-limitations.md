# Scientific Limitations

## Screening scope

The method is intended as first-stage screening. A flag prioritizes a mesh for further inspection; it is not proof of urban change and does not identify a changed building.

## Analysis unit

The source grid is 50 m in EPSG:3857. At Shimokitazawa's latitude, a cell is approximately 40.6 m per side on the ground. The mesh can contain multiple buildings, roads, vegetation, temporary objects, and scattering contributions from nearby cells.

## Evaluation coverage

Only 55 of 676 meshes have agreed change/no-change labels. The remaining 621 are Not evaluated, comprising 24 reviewed meshes without interpreter agreement and 597 meshes outside the reviewed candidate set.

The frozen confusion matrix is valid only over the 55 agreed meshes. It must not be extended to all 676 cells.

## Ground-truth limitations

- Binary reference interpretation used two blinded interpreters.
- Type agreement is lower than binary change/no-change agreement.
- Frozen change type exists for only 24 positive meshes.
- The aerial imagery used for interpretation is not included in the repository.
- Recorded labels can be analyzed, but the human interpretation act cannot be independently reproduced from the published materials alone.
- Ground-truth images date from 2017-05-30 and November 2021, which does not fully align with the 2019/2025 SAR comparison.

## SAR intensity limitations

Intensity differences respond to scattering-state changes, not semantic construction events. Rebuilding may preserve wall–ground double-bounce structure when the old and new buildings are similar in height, orientation, and material. This explanation is scoped to conditions such as low-rise, dense neighborhoods and is not a universal statement about rebuilding.

False positives can arise from spillover, temporal mismatch, unresolved reference interpretation, or non-building scattering changes. A source density is not a confidence score.

## Observation-window dependence

A two-window comparison measures the difference between selected scattering states. Changing only the observation windows changed the detected set substantially in the source study. More dates did not improve rebuilding detection in the reported multi-temporal sensitivity experiment.

The interface therefore identifies the exact experiment and does not merge Window A, Window B, or Gate A results.

## Frozen implementation history

The frozen implementation used `m = 4.4`, while the source research record later documented that the summed epochs required different look-number treatment. The nominal `α = 0.01` does not describe the realized operating point.

The source study deliberately retains the frozen result and reports corrected-look and empirical sensitivity analyses separately. This viewer follows the same discipline:

- it labels the result as frozen;
- it exposes the nominal implemented threshold with a warning;
- it does not silently replace the canonical geometry/density file;
- it does not describe the result as correctly calibrated.

## Interpretation language

Allowed statement:

> Change was identified within this evaluation mesh.

Unsupported statement:

> This building changed.

Rule-based explanations are deterministic mappings from the recorded ground truth and detection result. No LLM or automated scientific interpretation is used.
