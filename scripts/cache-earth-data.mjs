import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const MODEL = 'CAO2024';
const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'data', 'earth', 'cache');
const MANIFEST_PATH = path.join(OUT_DIR, 'manifest.json');
const COASTLINE_AGES = [
  0, 0.021, 2.58, 23, 66, 100, 145, 200, 233, 250, 252, 300,
  335, 359, 419, 470, 538.8, 720, 1000, 1800
];
const LIFE_AGES = [66, 100, 145, 200, 233, 250, 252, 335, 359, 419, 470, 538.8];
const EMPTY_COLLECTION = { type: 'FeatureCollection', features: [] };
const USER_AGENT = 'WorldlineAtlas/0.11 (+https://github.com/etocore/worldline-atlas)';

await mkdir(OUT_DIR, { recursive: true });

function fileToken(age) {
  return String(age).replace('.', 'p');
}

function roundNumber(value, precision = 3) {
  const scale = 10 ** precision;
  return Math.round(Number(value) * scale) / scale;
}

function distanceToSegment(point, start, end) {
  const [x, y] = point;
  const [x1, y1] = start;
  const [x2, y2] = end;
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) return Math.hypot(x - x1, y - y1);
  const t = Math.max(0, Math.min(1, (((x - x1) * dx) + ((y - y1) * dy)) / ((dx * dx) + (dy * dy))));
  return Math.hypot(x - (x1 + (t * dx)), y - (y1 + (t * dy)));
}

function simplifyLine(points, tolerance) {
  if (!Array.isArray(points) || points.length <= 2) return points || [];
  let maxDistance = 0;
  let splitIndex = 0;
  for (let index = 1; index < points.length - 1; index += 1) {
    const distance = distanceToSegment(points[index], points[0], points.at(-1));
    if (distance > maxDistance) {
      maxDistance = distance;
      splitIndex = index;
    }
  }
  if (maxDistance <= tolerance) return [points[0], points.at(-1)];
  const left = simplifyLine(points.slice(0, splitIndex + 1), tolerance);
  const right = simplifyLine(points.slice(splitIndex), tolerance);
  return [...left.slice(0, -1), ...right];
}

function simplifyRing(ring, tolerance) {
  if (!Array.isArray(ring) || ring.length < 4) return ring || [];
  const closed = ring[0][0] === ring.at(-1)[0] && ring[0][1] === ring.at(-1)[1];
  const open = closed ? ring.slice(0, -1) : [...ring];
  const simplified = simplifyLine(open, tolerance);
  if (simplified.length < 3) return ring;
  const result = simplified.map(([lng, lat]) => [roundNumber(lng), roundNumber(lat)]);
  result.push([...result[0]]);
  return result;
}

function simplifyGeometry(geometry, tolerance) {
  if (!geometry) return null;
  if (geometry.type === 'Polygon') {
    return {
      type: 'Polygon',
      coordinates: geometry.coordinates
        .map((ring) => simplifyRing(ring, tolerance))
        .filter((ring) => ring.length >= 4)
    };
  }
  if (geometry.type === 'MultiPolygon') {
    return {
      type: 'MultiPolygon',
      coordinates: geometry.coordinates
        .map((polygon) => polygon
          .map((ring) => simplifyRing(ring, tolerance))
          .filter((ring) => ring.length >= 4))
        .filter((polygon) => polygon.length)
    };
  }
  if (geometry.type === 'LineString') {
    return {
      type: 'LineString',
      coordinates: simplifyLine(geometry.coordinates, tolerance)
        .map(([lng, lat]) => [roundNumber(lng), roundNumber(lat)])
    };
  }
  if (geometry.type === 'MultiLineString') {
    return {
      type: 'MultiLineString',
      coordinates: geometry.coordinates.map((line) => simplifyLine(line, tolerance)
        .map(([lng, lat]) => [roundNumber(lng), roundNumber(lat)]))
    };
  }
  return geometry;
}

function compactCollection(collection, tolerance = 0.12) {
  if (!collection || collection.type !== 'FeatureCollection') return EMPTY_COLLECTION;
  return {
    type: 'FeatureCollection',
    features: collection.features
      .map((feature) => ({
        type: 'Feature',
        properties: {},
        geometry: simplifyGeometry(feature.geometry, tolerance)
      }))
      .filter((feature) => feature.geometry)
  };
}

function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      accept: 'application/json, application/geo+json',
      'user-agent': USER_AGENT,
      ...(options.headers || {})
    },
    signal: AbortSignal.timeout(options.timeout || 90000)
  });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.json();
}

async function writeJson(relativePath, value) {
  const absolutePath = path.join(ROOT, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  const content = `${JSON.stringify(value)}\n`;
  await writeFile(absolutePath, content, 'utf8');
  return {
    path: relativePath.replaceAll(path.sep, '/'),
    bytes: Buffer.byteLength(content),
    sha256: sha256(content)
  };
}

async function cacheCoastline(ageMa) {
  const endpoint = new URL('https://gws.gplates.org/reconstruct/coastlines/');
  endpoint.searchParams.set('time', String(ageMa));
  endpoint.searchParams.set('model', MODEL);
  endpoint.searchParams.set('wrap', 'true');
  const raw = await fetchJson(endpoint);
  const tolerance = ageMa <= 100 ? 0.08 : ageMa <= 540 ? 0.12 : 0.18;
  const collection = compactCollection(raw, tolerance);
  const file = await writeJson(`data/earth/cache/coastlines-${fileToken(ageMa)}.json`, collection);
  return {
    ageMa,
    model: MODEL,
    toleranceDegrees: tolerance,
    featureCount: collection.features.length,
    ...file
  };
}

function recordsFromPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.records)) return payload.records;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function value(record, ...names) {
  for (const name of names) {
    if (record[name] !== undefined && record[name] !== null && record[name] !== '') return record[name];
  }
  return null;
}

function lifeCategory(record, requestedCategory) {
  if (requestedCategory) return requestedCategory;
  const classification = [
    value(record, 'kingdom', 'kgl'),
    value(record, 'phylum', 'phl'),
    value(record, 'class', 'cll'),
    value(record, 'order', 'odl'),
    value(record, 'accepted_name', 'tna')
  ].filter(Boolean).join(' ');
  return /(plantae|plant|tracheophy|magnoliophy|gymnosperm|angiosperm|conifer|cycad|ginkgo|fern|lycopod|glossopter)/i.test(classification)
    ? 'flora'
    : 'fauna';
}

function normalizeOccurrence(record, category) {
  const longitude = Number(value(record, 'lng', 'longitude'));
  const latitude = Number(value(record, 'lat', 'latitude'));
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return null;
  const occurrenceId = String(value(record, 'occurrence_no', 'oid') || '');
  const name = String(value(record, 'accepted_name', 'identified_name', 'taxon_name', 'tna') || 'Unidentified fossil');
  const earlyAge = Number(value(record, 'early_age', 'eag'));
  const lateAge = Number(value(record, 'late_age', 'lag'));
  return {
    occurrenceId,
    name,
    category: lifeCategory(record, category),
    longitude,
    latitude,
    earlyAge: Number.isFinite(earlyAge) ? earlyAge : null,
    lateAge: Number.isFinite(lateAge) ? lateAge : null,
    phylum: String(value(record, 'phylum', 'phl') || ''),
    className: String(value(record, 'class', 'cll') || ''),
    orderName: String(value(record, 'order', 'odl') || ''),
    family: String(value(record, 'family', 'fml') || ''),
    collection: String(value(record, 'collection_name', 'formation', 'geology') || ''),
    country: String(value(record, 'cc', 'country') || ''),
    sourceUrl: occurrenceId
      ? `https://paleobiodb.org/classic/basicCollectionSearch?occurrence_no=${encodeURIComponent(occurrenceId)}`
      : 'https://paleobiodb.org/'
  };
}

async function fetchOccurrences(ageMa, baseName, category) {
  const windowMa = ageMa <= 100 ? 2.5 : ageMa <= 300 ? 5 : 10;
  const endpoint = new URL('https://paleobiodb.org/data1.2/occs/list.json');
  endpoint.searchParams.set('base_name', baseName);
  endpoint.searchParams.set('min_ma', String(Math.max(0, ageMa - windowMa)));
  endpoint.searchParams.set('max_ma', String(ageMa + windowMa));
  endpoint.searchParams.set('show', 'coords,phylo,class,ident,time,loc');
  endpoint.searchParams.set('vocab', 'pbdb');
  endpoint.searchParams.set('limit', '600');
  const payload = await fetchJson(endpoint);
  return recordsFromPayload(payload)
    .map((record) => normalizeOccurrence(record, category))
    .filter(Boolean);
}

async function reconstructBatch(records, ageMa) {
  if (!records.length) return [];
  const endpoint = new URL('https://gws.gplates.org/reconstruct/reconstruct_points/');
  endpoint.searchParams.set('lons', records.map((record) => record.longitude).join(','));
  endpoint.searchParams.set('lats', records.map((record) => record.latitude).join(','));
  endpoint.searchParams.set('time', String(ageMa));
  endpoint.searchParams.set('model', MODEL);
  endpoint.searchParams.set('fc', 'true');
  endpoint.searchParams.set('return_null_points', 'true');

  try {
    const payload = await fetchJson(endpoint, { timeout: 120000 });
    const features = payload?.type === 'FeatureCollection' ? payload.features : [];
    return records.map((record, index) => {
      const coordinates = features[index]?.geometry?.coordinates;
      return {
        ...record,
        paleoCoordinates: Array.isArray(coordinates) && coordinates.length >= 2
          ? [roundNumber(coordinates[0], 3), roundNumber(coordinates[1], 3)]
          : null
      };
    });
  } catch (error) {
    console.warn(`Could not reconstruct ${records.length} fossil locations at ${ageMa} Ma:`, error.message);
    return records.map((record) => ({ ...record, paleoCoordinates: null }));
  }
}

function deterministicSample(records, limit) {
  if (records.length <= limit) return records;
  const sorted = [...records].sort((left, right) => {
    const a = sha256(`${left.occurrenceId}:${left.name}:${left.longitude}:${left.latitude}`);
    const b = sha256(`${right.occurrenceId}:${right.name}:${right.longitude}:${right.latitude}`);
    return a.localeCompare(b);
  });
  return sorted.slice(0, limit);
}

async function cacheLife(ageMa) {
  const [fauna, flora] = await Promise.all([
    fetchOccurrences(ageMa, 'Animalia', 'fauna'),
    fetchOccurrences(ageMa, 'Plantae', 'flora')
  ]);
  const sampled = deterministicSample([...fauna, ...flora], 900);
  const reconstructed = [];
  for (let start = 0; start < sampled.length; start += 75) {
    reconstructed.push(...await reconstructBatch(sampled.slice(start, start + 75), ageMa));
  }

  const features = reconstructed
    .filter((record) => record.paleoCoordinates)
    .map((record) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: record.paleoCoordinates },
      properties: {
        occurrenceId: record.occurrenceId,
        name: record.name,
        category: record.category,
        earlyAge: record.earlyAge,
        lateAge: record.lateAge,
        phylum: record.phylum,
        className: record.className,
        orderName: record.orderName,
        family: record.family,
        collection: record.collection,
        country: record.country,
        sourceUrl: record.sourceUrl,
        evidence: 'Paleobiology Database fossil occurrence',
        positionModel: MODEL
      }
    }));

  const collection = { type: 'FeatureCollection', features };
  const file = await writeJson(`data/earth/cache/life-${fileToken(ageMa)}.json`, collection);
  return {
    ageMa,
    model: MODEL,
    featureCount: features.length,
    floraCount: features.filter((feature) => feature.properties.category === 'flora').length,
    faunaCount: features.filter((feature) => feature.properties.category === 'fauna').length,
    ...file
  };
}

async function previousManifest() {
  try {
    return JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
  } catch {
    return { version: 1, model: MODEL, coastlines: [], life: [] };
  }
}

const previous = await previousManifest();
const coastlineResults = [];
for (const ageMa of COASTLINE_AGES) {
  try {
    console.log(`Caching coastline ${ageMa} Ma`);
    coastlineResults.push(await cacheCoastline(ageMa));
  } catch (error) {
    console.error(`Coastline ${ageMa} Ma failed:`, error.message);
    const existing = previous.coastlines?.find((entry) => Number(entry.ageMa) === ageMa);
    if (existing) coastlineResults.push(existing);
  }
}

const lifeResults = [];
for (const ageMa of LIFE_AGES) {
  try {
    console.log(`Caching life evidence ${ageMa} Ma`);
    lifeResults.push(await cacheLife(ageMa));
  } catch (error) {
    console.error(`Life evidence ${ageMa} Ma failed:`, error.message);
    const existing = previous.life?.find((entry) => Number(entry.ageMa) === ageMa);
    if (existing) lifeResults.push(existing);
  }
}

const manifest = {
  version: 2,
  model: MODEL,
  generatedAt: new Date().toISOString(),
  coastlines: coastlineResults.sort((a, b) => a.ageMa - b.ageMa),
  life: lifeResults.sort((a, b) => a.ageMa - b.ageMa),
  sources: {
    coastlines: 'https://gws.gplates.org/reconstruct/coastlines/',
    occurrences: 'https://paleobiodb.org/data1.2/occs/list.json',
    reconstructedPoints: 'https://gws.gplates.org/reconstruct/reconstruct_points/'
  },
  caveats: [
    'Coastlines are simplified render snapshots from the pinned CAO2024 model.',
    'Life points are fossil occurrences, not complete organism ranges or population maps.',
    'Fossil discovery coordinates are reconstructed to paleopositions with CAO2024.'
  ]
};

await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`Wrote ${coastlineResults.length} coastline snapshots and ${lifeResults.length} life snapshots.`);
