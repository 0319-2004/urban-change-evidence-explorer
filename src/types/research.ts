import { z } from 'zod';

export const evaluationClassSchema = z.enum(['TP', 'FP', 'FN', 'TN', 'NOT_EVALUATED']);
export const changeTypeSchema = z.enum([
  'NEW_CONSTRUCTION',
  'DEMOLITION',
  'REBUILDING',
  'COMPOUND_OTHER',
]);
export const groundTruthSchema = z.enum(['CHANGE', 'NO_CHANGE']);
export const reviewStatusSchema = z.enum(['AGREED', 'DISAGREED', 'NOT_REVIEWED']);

const nullableText = z.string().nullable();
const nullableChangeType = changeTypeSchema.nullable();
const positionSchema = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]);
const polygonSchema = z
  .object({
    type: z.literal('Polygon'),
    coordinates: z.array(z.array(positionSchema).min(4)).min(1),
  })
  .strict();

export const meshPropertiesSchema = z
  .object({
    mesh_id: z.number().int().min(0),
    source_feature_id: z.string(),
    evaluation_class: evaluationClassSchema,
    ground_truth: groundTruthSchema.nullable(),
    detected: z.boolean(),
    review_status: reviewStatusSchema,
    change_type: nullableChangeType,
    source_change_type: nullableText,
    type_basis: nullableText,
    source_density: z.number().min(0).max(1),
    source_mean: z.number().min(0).max(1),
    density_rank: z.number().int().positive().nullable(),
    interpreter_a_judgment: nullableText,
    interpreter_b_judgment: nullableText,
    interpreter_a_type: nullableText,
    interpreter_b_type: nullableText,
    interpreter_a_note: nullableText,
    interpreter_b_note: nullableText,
    interpreter_a_needs_check: nullableText,
    interpreter_b_needs_check: nullableText,
    experiment_id: z.literal('window-a-2019-2025-frozen'),
  })
  .strict();

export const meshFeatureSchema = z
  .object({
    type: z.literal('Feature'),
    id: z.number().int().min(0),
    geometry: polygonSchema,
    properties: meshPropertiesSchema,
  })
  .strict();

export const meshCollectionSchema = z
  .object({
    type: z.literal('FeatureCollection'),
    bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]),
    features: z.array(meshFeatureSchema),
  })
  .strict()
  .superRefine((collection, context) => {
    const ids = new Set<number>();
    for (const [index, feature] of collection.features.entries()) {
      if (feature.id !== feature.properties.mesh_id) {
        context.addIssue({
          code: 'custom',
          path: ['features', index, 'id'],
          message: 'Feature ID must equal properties.mesh_id',
        });
      }
      if (ids.has(feature.id)) {
        context.addIssue({
          code: 'custom',
          path: ['features', index, 'id'],
          message: `Duplicate mesh ID ${feature.id}`,
        });
      }
      ids.add(feature.id);
    }
  });

const observationWindowSchema = z
  .object({
    label: z.string(),
    start: z.iso.date(),
    end_exclusive: z.iso.date(),
    scene_count: z.number().int().positive(),
  })
  .strict();

export const experimentSchema = z
  .object({
    id: z.literal('window-a-2019-2025-frozen'),
    label: z.string(),
    status: z.string(),
    description: z.string(),
    observation_windows: z.array(observationWindowSchema).length(2),
    sensor: z.string(),
    product: z.string(),
    instrument_mode: z.string(),
    polarization: z.string(),
    orbit_pass: z.string(),
    relative_orbit: z.number().int().positive(),
    method: z.string(),
    implemented_nominal_alpha: z.number().positive().max(1),
    implemented_enl: z.number().positive(),
    mesh_aggregation: z.string(),
    mesh_detection_rule: z.string(),
    analysis_unit: z.string(),
    implementation_note: z.string(),
    source_files: z.array(z.string()).min(1),
  })
  .strict();

export const experimentsDocumentSchema = z
  .object({
    schema_version: z.string(),
    experiments: z.array(experimentSchema).length(1),
  })
  .strict();

const sourceFileSchema = z
  .object({
    path: z.string(),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();

export const metadataSchema = z
  .object({
    schema_version: z.string(),
    dataset_version: z.string(),
    generated_at: z.iso.datetime({ offset: true }),
    generator: z.string(),
    source: z
      .object({
        repository: z.url(),
        commit: z.string(),
        license_notice: z.string(),
        files: z.array(sourceFileSchema).min(1),
      })
      .strict(),
    transformation: z
      .object({
        summary: z.string(),
        steps: z.array(z.string()).min(1),
        derived_fields: z.array(z.string()),
      })
      .strict(),
    counts: z
      .object({
        meshes: z.number().int().positive(),
        reviewed_candidates: z.number().int().nonnegative(),
        evaluated_meshes: z.number().int().nonnegative(),
        ground_truth_change: z.number().int().nonnegative(),
        ground_truth_no_change: z.number().int().nonnegative(),
        review_disagreement: z.number().int().nonnegative(),
        not_reviewed: z.number().int().nonnegative(),
        detected_meshes: z.number().int().nonnegative(),
        strict_change_types: z.number().int().nonnegative(),
        evaluation_classes: z
          .object({
            TP: z.number().int().nonnegative(),
            FP: z.number().int().nonnegative(),
            FN: z.number().int().nonnegative(),
            TN: z.number().int().nonnegative(),
            NOT_EVALUATED: z.number().int().nonnegative(),
          })
          .strict(),
      })
      .strict(),
    spatial: z
      .object({
        source_crs: z.string(),
        output_crs: z.literal('EPSG:4326'),
        bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]),
        grid_definition: z.string(),
        approximate_ground_dimension_m: z.number().positive(),
      })
      .strict(),
    missing_value_policy: z.string(),
  })
  .strict();

export type EvaluationClass = z.infer<typeof evaluationClassSchema>;
export type ChangeType = z.infer<typeof changeTypeSchema>;
export type GroundTruth = z.infer<typeof groundTruthSchema>;
export type ReviewStatus = z.infer<typeof reviewStatusSchema>;
export type MeshProperties = z.infer<typeof meshPropertiesSchema>;
export type MeshFeature = z.infer<typeof meshFeatureSchema>;
export type MeshCollection = z.infer<typeof meshCollectionSchema>;
export type Experiment = z.infer<typeof experimentSchema>;
export type ExperimentsDocument = z.infer<typeof experimentsDocumentSchema>;
export type Metadata = z.infer<typeof metadataSchema>;

export interface AppData {
  meshes: MeshCollection;
  experiment: Experiment;
  metadata: Metadata;
}
