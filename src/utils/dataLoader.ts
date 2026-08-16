import {
  experimentsDocumentSchema,
  meshCollectionSchema,
  metadataSchema,
  type AppData,
} from '../types/research';

async function fetchJson(path: string): Promise<unknown> {
  const response = await fetch(`${import.meta.env.BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`Could not load ${path} (${response.status} ${response.statusText})`);
  }
  return response.json() as Promise<unknown>;
}

export function parseAppData(
  meshesValue: unknown,
  experimentsValue: unknown,
  metadataValue: unknown,
): AppData {
  const meshes = meshCollectionSchema.parse(meshesValue);
  const experiments = experimentsDocumentSchema.parse(experimentsValue);
  const metadata = metadataSchema.parse(metadataValue);
  const experiment = experiments.experiments[0];

  if (!experiment) throw new Error('No experiment definition was found.');
  if (meshes.features.length !== metadata.counts.meshes) {
    throw new Error(
      `Mesh count mismatch: GeoJSON has ${meshes.features.length}, metadata declares ${metadata.counts.meshes}.`,
    );
  }
  return { meshes, experiment, metadata };
}

export async function loadAppData(): Promise<AppData> {
  const [meshes, experiments, metadata] = await Promise.all([
    fetchJson('data/meshes.geojson'),
    fetchJson('data/experiments.json'),
    fetchJson('data/metadata.json'),
  ]);
  return parseAppData(meshes, experiments, metadata);
}
