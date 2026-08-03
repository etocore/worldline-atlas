import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const reconstructionRoot = path.join(root, 'reconstructions');
const failures = [];

function fail(message) {
  failures.push(message);
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    fail(`${path.relative(root, filePath)} could not be parsed: ${error.message}`);
    return null;
  }
}

function validatePackage(packageDirectory) {
  const manifestPath = path.join(packageDirectory, 'manifest.json');
  if (!fs.existsSync(manifestPath)) return;

  const manifest = readJson(manifestPath);
  if (!manifest) return;
  const relativeManifest = path.relative(root, manifestPath);

  for (const field of ['schemaVersion', 'id', 'title', 'place', 'targetYear', 'status', 'camera', 'layers', 'sources', 'guardrails']) {
    if (manifest[field] === undefined || manifest[field] === null) {
      fail(`${relativeManifest} is missing required field: ${field}`);
    }
  }

  if (!Array.isArray(manifest.place?.names) || manifest.place.names.length === 0) {
    fail(`${relativeManifest} must include at least one place name`);
  }

  if (!Array.isArray(manifest.place?.center) || manifest.place.center.length !== 2) {
    fail(`${relativeManifest} must include a [longitude, latitude] center`);
  }

  if (
    manifest.validWindow
    && (manifest.targetYear < manifest.validWindow.start || manifest.targetYear > manifest.validWindow.end)
  ) {
    fail(`${relativeManifest} targetYear falls outside validWindow`);
  }

  const sourceIds = new Set();
  for (const source of manifest.sources || []) {
    if (!source.id || !source.url || !source.licenseStatus || !source.useStatus) {
      fail(`${relativeManifest} has a source without id, url, licenseStatus, or useStatus`);
      continue;
    }
    if (sourceIds.has(source.id)) fail(`${relativeManifest} repeats source id: ${source.id}`);
    sourceIds.add(source.id);
  }

  if ((manifest.sources || []).length === 0) {
    fail(`${relativeManifest} must include at least one source record`);
  }

  for (const [layerName, layer] of Object.entries(manifest.layers || {})) {
    if (!layer.status) fail(`${relativeManifest} layer ${layerName} has no status`);
    if (layer.status === 'published' && !layer.path) {
      fail(`${relativeManifest} layer ${layerName} is published without a data path`);
    }
    if (layer.path) {
      const layerPath = path.join(root, layer.path);
      if (!fs.existsSync(layerPath)) {
        fail(`${relativeManifest} layer ${layerName} references missing file ${layer.path}`);
      }
    }
  }

  const studyAreaPath = manifest.layers?.studyArea?.path;
  if (studyAreaPath && fs.existsSync(path.join(root, studyAreaPath))) {
    const studyArea = readJson(path.join(root, studyAreaPath));
    for (const feature of studyArea?.features || []) {
      if (feature.properties?.evidenceClass === 'placeholder' && feature.properties?.historicalBoundary !== false) {
        fail(`${studyAreaPath} placeholder feature ${feature.id || '(no id)'} must explicitly set historicalBoundary to false`);
      }
    }
  }

  if (!Array.isArray(manifest.guardrails) || manifest.guardrails.length === 0) {
    fail(`${relativeManifest} must include reconstruction guardrails`);
  }
}

for (const entry of fs.readdirSync(reconstructionRoot, { withFileTypes: true })) {
  if (!entry.isDirectory() || entry.name === 'schema') continue;
  validatePackage(path.join(reconstructionRoot, entry.name));
}

if (failures.length) {
  console.error('Reconstruction validation failed:\n');
  failures.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}

console.log('Reconstruction packages passed structural and guardrail validation.');
