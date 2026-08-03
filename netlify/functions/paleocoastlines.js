const MODEL = 'CAO2024';
const MAX_MODEL_AGE_MA = 1800;
const EMPTY_COLLECTION = { type: 'FeatureCollection', features: [] };

function json(statusCode, body, cacheControl = 'public, max-age=0, must-revalidate') {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': cacheControl,
      'access-control-allow-origin': '*'
    },
    body: JSON.stringify(body)
  };
}

function resolutionForAge(ageMa) {
  if (ageMa <= 100) return 0.5;
  if (ageMa <= 540) return 1;
  if (ageMa <= 1000) return 5;
  return 10;
}

function snapAge(ageMa) {
  const step = resolutionForAge(ageMa);
  return Math.round(ageMa / step) * step;
}

exports.handler = async function handler(event) {
  if (event.httpMethod !== 'GET') {
    return json(405, { error: 'Method not allowed' });
  }

  const requested = Number(event.queryStringParameters?.time);
  if (!Number.isFinite(requested) || requested < 0 || requested > MAX_MODEL_AGE_MA) {
    return json(400, {
      error: `time must be between 0 and ${MAX_MODEL_AGE_MA} Ma`,
      model: MODEL,
      supported: false,
      collection: EMPTY_COLLECTION
    });
  }

  const time = snapAge(requested);
  const endpoint = new URL('https://gws.gplates.org/reconstruct/coastlines/');
  endpoint.searchParams.set('time', String(time));
  endpoint.searchParams.set('model', MODEL);
  endpoint.searchParams.set('wrap', 'true');

  try {
    const response = await fetch(endpoint, {
      headers: { accept: 'application/geo+json, application/json' },
      signal: AbortSignal.timeout(12000)
    });

    if (!response.ok) {
      return json(502, {
        error: `GPlates returned ${response.status}`,
        model: MODEL,
        time,
        supported: true,
        collection: EMPTY_COLLECTION
      });
    }

    const collection = await response.json();
    if (!collection || collection.type !== 'FeatureCollection' || !Array.isArray(collection.features)) {
      return json(502, {
        error: 'GPlates returned an unexpected payload',
        model: MODEL,
        time,
        supported: true,
        collection: EMPTY_COLLECTION
      });
    }

    return json(200, {
      model: MODEL,
      requestedTime: requested,
      time,
      temporalResolutionMa: resolutionForAge(time),
      supported: true,
      collection
    }, 'public, max-age=86400, s-maxage=2592000, stale-while-revalidate=604800');
  } catch (error) {
    console.error('Paleocoastline request failed:', error);
    return json(502, {
      error: 'The plate reconstruction service is temporarily unavailable',
      model: MODEL,
      time,
      supported: true,
      collection: EMPTY_COLLECTION
    });
  }
};
