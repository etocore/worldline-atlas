const ENDPOINT = 'https://query.wikidata.org/sparql';
const MAX_RESULTS = 700;

function response(statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
      ...extraHeaders
    },
    body: JSON.stringify(body)
  };
}

function numberParam(params, name, min, max) {
  const value = Number(params.get(name));
  if (!Number.isFinite(value) || value < min || value > max) throw new Error(`Invalid ${name}`);
  return value;
}

function yearFromWikidata(value) {
  if (!value) return null;
  const match = String(value).match(/^([+-]?\d{1,})-/);
  return match ? Number(match[1]) : null;
}

function coordinatesFromWkt(value) {
  const match = String(value || '').match(/Point\(([-\d.]+)\s+([-\d.]+)\)/i);
  if (!match) return null;
  return [Number(match[1]), Number(match[2])];
}

function activeForYear(start, end, year, mode) {
  if (start !== null) return start <= year && (end === null || end >= year);
  return mode === 'broad' && year >= 1900 && (end === null || end >= year);
}

exports.handler = async (event) => {
  try {
    const params = new URLSearchParams(event.rawQuery || event.rawQueryString || event.queryStringParameters || {});
    const west = numberParam(params, 'west', -180, 180);
    const east = numberParam(params, 'east', -180, 180);
    const south = numberParam(params, 'south', -85, 85);
    const north = numberParam(params, 'north', -85, 85);
    const year = numberParam(params, 'year', -15000, 2026);
    const mode = ['strict', 'balanced', 'broad'].includes(params.get('mode')) ? params.get('mode') : 'balanced';

    if (east <= west || north <= south || east - west > 90 || north - south > 65) {
      return response(400, { error: 'Bounding box is too large or invalid.' });
    }

    const query = `
      SELECT DISTINCT ?place ?placeLabel ?location ?class ?classLabel ?inception ?startTime ?dissolved WHERE {
        VALUES ?class {
          wd:Q515
          wd:Q3957
          wd:Q532
          wd:Q486972
          wd:Q839954
          wd:Q15661340
        }
        SERVICE wikibase:box {
          ?place wdt:P625 ?location.
          bd:serviceParam wikibase:cornerWest "Point(${west} ${south})"^^geo:wktLiteral.
          bd:serviceParam wikibase:cornerEast "Point(${east} ${north})"^^geo:wktLiteral.
        }
        ?place wdt:P31 ?class.
        OPTIONAL { ?place wdt:P571 ?inception. }
        OPTIONAL { ?place wdt:P580 ?startTime. }
        OPTIONAL { ?place wdt:P576 ?dissolved. }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
      }
      LIMIT ${MAX_RESULTS}
    `;

    const url = `${ENDPOINT}?query=${encodeURIComponent(query)}&format=json`;
    const upstream = await fetch(url, {
      headers: {
        accept: 'application/sparql-results+json',
        'user-agent': 'WorldlineAtlas/0.2 (https://github.com/etocore/worldline-atlas)'
      }
    });

    if (!upstream.ok) {
      return response(502, { error: `Wikidata returned ${upstream.status}.` }, { 'cache-control': 'no-store' });
    }

    const payload = await upstream.json();
    const unique = new Map();

    for (const row of payload.results?.bindings || []) {
      const coordinates = coordinatesFromWkt(row.location?.value);
      if (!coordinates) continue;
      const inception = yearFromWikidata(row.inception?.value);
      const startTime = yearFromWikidata(row.startTime?.value);
      const start = inception ?? startTime;
      const end = yearFromWikidata(row.dissolved?.value);
      if (!activeForYear(start, end, year, mode)) continue;

      const item = row.place?.value;
      if (!item || unique.has(item)) continue;
      const hasFullRange = start !== null && end !== null;
      const confidence = hasFullRange ? 0.9 : start !== null ? 0.76 : 0.44;
      if (mode === 'strict' && confidence < 0.84) continue;
      if (mode === 'balanced' && confidence < 0.62) continue;

      unique.set(item, {
        type: 'Feature',
        geometry: { type: 'Point', coordinates },
        properties: {
          name: row.placeLabel?.value || item.split('/').pop(),
          classLabel: row.classLabel?.value || 'Human settlement',
          start: start ?? undefined,
          end: end ?? undefined,
          startLabel: start === null ? 'Unknown start' : undefined,
          endLabel: end === null ? 'Present or unknown end' : undefined,
          confidence,
          evidence: start !== null ? 'catalogued-date' : 'undated-catalog',
          item,
          source: item
        }
      });
    }

    return response(200, {
      collection: { type: 'FeatureCollection', features: [...unique.values()] },
      meta: {
        year,
        mode,
        returned: unique.size,
        limit: MAX_RESULTS,
        source: 'Wikidata Query Service'
      }
    });
  } catch (error) {
    return response(400, { error: error.message || 'Invalid request.' }, { 'cache-control': 'no-store' });
  }
};
