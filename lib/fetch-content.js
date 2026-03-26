const fs = require('fs');
const path = require('path');
const { tavilyExtract, tavilySearch } = require('./tavily-client');

const LOG_PATH = path.join(__dirname, '..', 'logs', 'crawler_errors.json');

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

function ensureLogsDir() {
  const dir = path.dirname(LOG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function logCrawlerError(entry) {
  try {
    ensureLogsDir();
    let arr = [];
    if (fs.existsSync(LOG_PATH)) {
      try {
        arr = JSON.parse(fs.readFileSync(LOG_PATH, 'utf8'));
      } catch {
        arr = [];
      }
    }
    if (!Array.isArray(arr)) arr = [];
    arr.push({ ts: new Date().toISOString(), ...entry });
    fs.writeFileSync(LOG_PATH, JSON.stringify(arr.slice(-500), null, 2));
  } catch (e) {
    console.warn('[fetch-content log]', e.message);
  }
}

/**
 * Direct GET; returns { ok, status, text }.
 */
async function fetchUrlDirect(url, ms = 12000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text };
  } catch (e) {
    return { ok: false, status: 0, text: '', error: e && e.message ? String(e.message) : 'fetch_error' };
  } finally {
    clearTimeout(t);
  }
}

/**
 * If direct fetch fails with 403/404 (or network), try Tavily extract, then a targeted search for a mirror/cached page.
 */
async function fetchUrlWithFallback(url) {
  const u = String(url || '').trim();
  if (!u) return '';

  const direct = await fetchUrlDirect(u);
  if (direct.ok && direct.text) return direct.text;

  const status = direct.status;
  const shouldFallback = status === 403 || status === 404 || !direct.ok;

  if (!shouldFallback) {
    logCrawlerError({ url: u, step: 'direct', status: direct.status || 'fail', detail: direct.error });
    return '';
  }

  if (!process.env.TAVILY_API_KEY) {
    logCrawlerError({ url: u, step: 'direct', status, detail: direct.error || 'no_tavily_key' });
    return '';
  }

  const extracted = await tavilyExtract([u]);
  const first = extracted.results && extracted.results[0];
  if (first && first.raw_content) {
    return first.raw_content;
  }

  let host = '';
  try {
    host = new URL(u).hostname.replace(/^www\./, '');
  } catch {
    host = '';
  }
  const tail = u.split('/').filter(Boolean).pop() || host;
  const searchQ = host ? `${tail} site:${host}` : tail;
  const search = await tavilySearch({
    query: searchQ,
    max_results: 4,
    search_depth: 'basic',
    include_raw_content: true,
  });
  const results = search.results || [];
  for (const r of results) {
    if (r.raw_content && String(r.raw_content).length > 80) return r.raw_content;
    if (r.content && String(r.content).length > 80) return r.content;
  }

  logCrawlerError({
    url: u,
    step: 'tavily_fallback',
    status,
    detail: 'extract_and_search_empty',
    failed_results: extracted.failed_results,
  });
  return '';
}

module.exports = {
  fetchUrlDirect,
  fetchUrlWithFallback,
  logCrawlerError,
};
