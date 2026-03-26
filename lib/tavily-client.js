/**
 * Tavily REST API — same TAVILY_API_KEY as the @tavily/mcp-server Cursor integration.
 */
const BASE = 'https://api.tavily.com';

async function postJson(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const err = new Error(`Tavily ${path} HTTP ${res.status}`);
    err.detail = data;
    throw err;
  }
  return data;
}

function getKey() {
  return process.env.TAVILY_API_KEY || '';
}

/**
 * @param {object} opts
 * @returns {Promise<object>}
 */
async function tavilySearch(opts) {
  const api_key = getKey();
  if (!api_key) return { results: [] };

  const {
    query,
    max_results = 10,
    search_depth = 'advanced',
    include_raw_content = true,
    topic = 'general',
  } = opts;

  return postJson('/search', {
    api_key,
    query,
    max_results,
    search_depth,
    include_raw_content,
    include_answer: false,
    topic,
  });
}

/**
 * @param {string[]} urls
 * @returns {Promise<{ results: Array, failed_results?: Array }>}
 */
async function tavilyExtract(urls) {
  const api_key = getKey();
  if (!api_key || !urls || !urls.length) return { results: [], failed_results: [] };

  return postJson('/extract', {
    api_key,
    urls: urls.slice(0, 20),
    extract_depth: 'basic',
    format: 'text',
  });
}

module.exports = {
  tavilySearch,
  tavilyExtract,
  getKey,
};
