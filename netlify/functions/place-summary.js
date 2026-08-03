const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'public, max-age=3600, s-maxage=604800, stale-while-revalidate=86400',
  'access-control-allow-origin': '*'
};

function response(statusCode, body) {
  return {
    statusCode,
    headers: JSON_HEADERS,
    body: JSON.stringify(body)
  };
}

function cleanText(value, maxLength = 180) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function validWikidataId(value) {
  const match = String(value || '').toUpperCase().match(/^Q\d+$/);
  return match ? match[0] : '';
}

async function fetchJson(url) {
  const result = await fetch(url, {
    headers: {
      accept: 'application/json',
      'user-agent': 'WorldlineAtlas/0.1 (historical map prototype; contact via GitHub etocore/worldline-atlas)'
    }
  });
  if (!result.ok) throw new Error(`Upstream returned ${result.status}`);
  return result.json();
}

async function titleFromWikidata(id) {
  if (!id) return { title: '', description: '' };
  const params = new URLSearchParams({
    action: 'wbgetentities',
    ids: id,
    props: 'sitelinks|descriptions|labels',
    sitefilter: 'enwiki',
    languages: 'en',
    format: 'json'
  });
  const data = await fetchJson(`https://www.wikidata.org/w/api.php?${params}`);
  const entity = data.entities?.[id];
  return {
    title: entity?.sitelinks?.enwiki?.title || '',
    description: entity?.descriptions?.en?.value || entity?.labels?.en?.value || ''
  };
}

async function searchWikipediaTitle(name) {
  if (!name) return '';
  const params = new URLSearchParams({
    action: 'query',
    list: 'search',
    srsearch: name,
    srnamespace: '0',
    srlimit: '1',
    format: 'json'
  });
  const data = await fetchJson(`https://en.wikipedia.org/w/api.php?${params}`);
  return data.query?.search?.[0]?.title || '';
}

async function fetchSummary(title) {
  if (!title) return null;
  const endpoint = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replaceAll(' ', '_'))}`;
  return fetchJson(endpoint);
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return response(204, {});
  if (event.httpMethod !== 'GET') return response(405, { error: 'Method not allowed' });

  const name = cleanText(event.queryStringParameters?.name, 120);
  let title = cleanText(event.queryStringParameters?.title, 160);
  const wikidata = validWikidataId(event.queryStringParameters?.wikidata);
  let wikidataDescription = '';

  if (!name && !title && !wikidata) {
    return response(400, { error: 'A name, title, or Wikidata identifier is required.' });
  }

  try {
    if (wikidata) {
      const resolved = await titleFromWikidata(wikidata);
      title = title || resolved.title;
      wikidataDescription = resolved.description;
    }

    title = title || await searchWikipediaTitle(name);
    let summary = null;

    if (title) {
      try {
        summary = await fetchSummary(title);
      } catch (_) {
        const fallbackTitle = await searchWikipediaTitle(name || title);
        if (fallbackTitle && fallbackTitle !== title) summary = await fetchSummary(fallbackTitle);
      }
    }

    if (!summary) {
      return response(200, {
        title: title || name,
        description: wikidataDescription,
        extract: wikidataDescription,
        thumbnail: null,
        pageUrl: null,
        wikidata: wikidata || null
      });
    }

    return response(200, {
      title: summary.title || title || name,
      description: summary.description || wikidataDescription || '',
      extract: summary.extract || summary.description || wikidataDescription || '',
      thumbnail: summary.thumbnail?.source || summary.originalimage?.source || null,
      pageUrl: summary.content_urls?.desktop?.page || summary.content_urls?.mobile?.page || null,
      wikidata: wikidata || summary.wikibase_item || null
    });
  } catch (error) {
    console.error('Place summary error:', error);
    return response(502, {
      error: 'Historical synopsis service unavailable',
      title: title || name,
      description: wikidataDescription || ''
    });
  }
};
