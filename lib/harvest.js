const pLimit = require('p-limit');
const { FEEDS, CAT_META, PRIORITY_KEYWORDS } = require('./feeds-config');
const { parseFeedXml } = require('./rss');
const { fetchLivePriorityNews } = require('./live-engine');

/** Stories kept per feed URL — lower = faster serverless harvest (Vercel time limit). */
const ITEMS_PER_FEED = 12;

/** Higher concurrency for faster full scans (was 24). */
const FETCH_CONCURRENCY = 56;

const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:124.0) Gecko/20100101 Firefox/124.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
];

const REQUEST_TIMEOUT_MS = 11000;

function normalizeFeedUrl(u) {
  return String(u || '').trim();
}

function firstFeedIndexByUrl() {
  const m = new Map();
  FEEDS.forEach((f, i) => {
    const key = normalizeFeedUrl(f.url);
    if (!m.has(key)) m.set(key, i);
  });
  return m;
}

function normalizeStoryUrl(u) {
  const s = String(u || '').trim();
  if (!s) return '';
  try {
    const x = new URL(s);
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'mc_cid', 'mc_eid'].forEach((k) =>
      x.searchParams.delete(k)
    );
    return x.href.toLowerCase();
  } catch {
    return s.toLowerCase();
  }
}

function dedupeArticlesByUrl(articles) {
  const seen = new Set();
  const out = [];
  for (const a of articles) {
    const k = normalizeStoryUrl(a.url) || `t:${String(a.title).toLowerCase()}|${a.source}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(a);
  }
  return out;
}

function isPriority(title) {
  const t = String(title).toLowerCase();
  return PRIORITY_KEYWORDS.some((k) => t.includes(k));
}

function stripBom(s) {
  if (!s || typeof s !== 'string') return s;
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

function looksLikeFeedXml(s) {
  if (!s || typeof s !== 'string' || s.length < 80) return false;
  const head = stripBom(s).slice(0, 1500).toLowerCase();
  return (
    head.includes('<rss') ||
    head.includes('<feed') ||
    head.includes('<rdf:rdf') ||
    (head.includes('<?xml') && head.includes('<channel'))
  );
}

function buildHeaders(userAgent, feedUrl) {
  let referer = '';
  try {
    referer = new URL(feedUrl).origin + '/';
  } catch {
    referer = '';
  }
  return {
    'User-Agent': userAgent,
    Accept: 'application/rss+xml, application/xml, text/xml, application/atom+xml, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    ...(referer ? { Referer: referer } : {}),
  };
}

async function fetchWithTimeout(reqUrl, options, parseBody, ms = REQUEST_TIMEOUT_MS) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(reqUrl, { ...options, signal: ctrl.signal });
    const text = await parseBody(res);
    if (!res.ok) return { ok: false, text: null, status: res.status };
    return { ok: true, text, status: res.status };
  } catch (e) {
    return { ok: false, text: null, error: e && e.message ? String(e.message) : 'fetch_error' };
  } finally {
    clearTimeout(t);
  }
}

/**
 * Direct RSS fetch with rotated User-Agents (feedback loop: log each attempt).
 */
async function fetchFeedXmlDirect(url, attemptLog) {
  for (let i = 0; i < USER_AGENTS.length; i++) {
    const ua = USER_AGENTS[i];
    const r = await fetchWithTimeout(
      url,
      { headers: buildHeaders(ua, url), redirect: 'follow' },
      async (res) => res.text()
    );
    if (r.ok && r.text && looksLikeFeedXml(r.text)) {
      attemptLog.push({ step: 'direct', uaIndex: i, status: r.status });
      return stripBom(r.text);
    }
    attemptLog.push({
      step: 'direct',
      uaIndex: i,
      status: r.status || 'fail',
      detail: r.error || (r.text && !looksLikeFeedXml(r.text) ? 'not_xml' : 'empty'),
    });
  }
  return null;
}

async function fetchAlloriginsJson(url, attemptLog) {
  const proxyUrl = 'https://api.allorigins.win/get?url=' + encodeURIComponent(url);
  const r = await fetchWithTimeout(
    proxyUrl,
    { headers: { 'User-Agent': USER_AGENTS[0] } },
    async (res) => {
      try {
        return await res.json();
      } catch {
        return null;
      }
    }
  );
  if (!r.ok || !r.text) {
    attemptLog.push({ step: 'allorigins_get', detail: r.error || r.status });
    return null;
  }
  const c = r.text && r.text.contents;
  if (c && typeof c === 'string' && looksLikeFeedXml(c)) {
    attemptLog.push({ step: 'allorigins_get', ok: true });
    return stripBom(c);
  }
  attemptLog.push({ step: 'allorigins_get', detail: 'bad_contents' });
  return null;
}

async function fetchAlloriginsRaw(url, attemptLog) {
  const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url);
  const r = await fetchWithTimeout(
    proxyUrl,
    { headers: { 'User-Agent': USER_AGENTS[1] } },
    async (res) => res.text()
  );
  if (r.ok && r.text && looksLikeFeedXml(r.text)) {
    attemptLog.push({ step: 'allorigins_raw', ok: true });
    return stripBom(r.text);
  }
  attemptLog.push({ step: 'allorigins_raw', detail: r.error || r.status || 'not_xml' });
  return null;
}

async function fetchCorsproxy(url, attemptLog) {
  if (process.env.VERCEL) return null;
  const proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(url);
  const r = await fetchWithTimeout(
    proxyUrl,
    { headers: { 'User-Agent': USER_AGENTS[2] } },
    async (res) => res.text()
  );
  if (r.ok && r.text && looksLikeFeedXml(r.text)) {
    attemptLog.push({ step: 'corsproxy', ok: true });
    return stripBom(r.text);
  }
  attemptLog.push({ step: 'corsproxy', detail: r.error || r.status || 'not_xml' });
  return null;
}

async function fetchCodetabs(url, attemptLog) {
  const proxyUrl = 'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(url);
  const r = await fetchWithTimeout(
    proxyUrl,
    { headers: { 'User-Agent': USER_AGENTS[3] } },
    async (res) => res.text()
  );
  if (r.ok && r.text && looksLikeFeedXml(r.text)) {
    attemptLog.push({ step: 'codetabs', ok: true });
    return stripBom(r.text);
  }
  attemptLog.push({ step: 'codetabs', detail: r.error || r.status || 'not_xml' });
  return null;
}

/**
 * Full feedback loop: direct (multi-UA) → proxy chain with retries.
 */
async function fetchFeedXmlViaProxies(url) {
  const attemptLog = [];
  let xml = await fetchFeedXmlDirect(url, attemptLog);
  if (xml) return { xml, attemptLog };

  xml = await fetchAlloriginsJson(url, attemptLog);
  if (xml) return { xml, attemptLog };

  xml = await fetchAlloriginsRaw(url, attemptLog);
  if (xml) return { xml, attemptLog };

  xml = await fetchCorsproxy(url, attemptLog);
  if (xml) return { xml, attemptLog };

  xml = await fetchCodetabs(url, attemptLog);
  if (xml) return { xml, attemptLog };

  return { xml: null, attemptLog };
}

function bulletsFromSummary(summary, title) {
  const s = String(summary || '').trim() || String(title || '');
  const parts = s
    .split(/(?<=[.!?])\s+/)
    .map((x) => x.trim())
    .filter(Boolean);
  if (parts.length >= 3) return parts.slice(0, 3);
  const chunks = s.split(/[,;]\s+/).filter((x) => x.length > 12);
  if (chunks.length >= 3) return chunks.slice(0, 3);
  const words = s.split(/\s+/).filter(Boolean);
  const out = [];
  let cur = [];
  let len = 0;
  for (const w of words) {
    cur.push(w);
    len += w.length + 1;
    if (len >= 55 && cur.length >= 4) {
      out.push(cur.join(' '));
      cur = [];
      len = 0;
      if (out.length >= 3) break;
    }
  }
  if (cur.length && out.length < 3) out.push(cur.join(' '));
  while (out.length < 3) {
    if (out.length === 0) out.push(title || s.slice(0, 120));
    else if (out.length === 1) out.push('Context: ' + (title || 'See original article'));
    else out.push('Follow the source link for full coverage.');
  }
  return out.slice(0, 3);
}

async function fetchOneFeed(feedIndex, firstByUrl, harvestState) {
  const feed = FEEDS[feedIndex];
  const key = normalizeFeedUrl(feed.url);
  if (firstByUrl.get(key) !== feedIndex) return [];

  const attemptLog = [];
  try {
    const { xml, attemptLog: fetchLog } = await fetchFeedXmlViaProxies(feed.url);
    attemptLog.push(...fetchLog);
    if (!xml) {
      harvestState.failedFeeds.push({
        url: feed.url,
        source: feed.source,
        category: feed.cat,
        attempts: attemptLog,
        reason: 'no_valid_xml',
      });
      return [];
    }
    const items = parseFeedXml(xml, ITEMS_PER_FEED);
    harvestState.successfulFeeds += 1;
    return items.map((item, i) => {
      const link = item.link || '';
      const raw = String(item.summary || '').trim();
      return {
        id: `${feed.cat}_${feed.source}_${i}_${item.pubDate}`,
        category: feed.cat,
        categoryLabel: CAT_META[feed.cat]?.label || feed.cat,
        title: item.title,
        summary: item.summary,
        summaryBullets: bulletsFromSummary(item.summary, item.title),
        source: feed.source,
        url: link,
        source_url: link,
        pubDate: item.pubDate,
        published_date: item.pubDate,
        raw_content: raw,
        tags: feed.tags,
        priority: isPriority(item.title),
        imageUrl: item.imageUrl || '',
      };
    });
  } catch (e) {
    harvestState.failedFeeds.push({
      url: feed.url,
      source: feed.source,
      category: feed.cat,
      attempts: attemptLog,
      reason: e && e.message ? String(e.message) : 'fetchOneFeed_error',
    });
    return [];
  }
}

/**
 * Fetches all configured RSS feeds and returns merged articles + timestamp + harvest diagnostics.
 */
async function harvestAllFeeds() {
  const started = Date.now();
  const harvestState = {
    successfulFeeds: 0,
    failedFeeds: [],
    totalFeeds: FEEDS.length,
    uniqueUrls: firstFeedIndexByUrl().size,
  };

  const limit = pLimit(FETCH_CONCURRENCY);
  const firstByUrl = firstFeedIndexByUrl();
  const tasks = FEEDS.map((_, i) => limit(() => fetchOneFeed(i, firstByUrl, harvestState)));
  const [liveArticles, chunks] = await Promise.all([
    fetchLivePriorityNews(),
    Promise.all(tasks),
  ]);

  const merged = [];
  chunks.forEach((arr) => merged.push(...arr));
  const allArticles = dedupeArticlesByUrl([...liveArticles, ...merged]);
  allArticles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

  const durationMs = Date.now() - started;

  if (harvestState.failedFeeds.length) {
    const sample = harvestState.failedFeeds.slice(0, 8).map((f) => f.url);
    console.warn(
      `[harvest] ${harvestState.failedFeeds.length} feed(s) empty after retries (sample):`,
      sample.join(' | ')
    );
  }

  return {
    articles: allArticles,
    updatedAt: new Date().toISOString(),
    harvestMeta: {
      ...harvestState,
      articleCount: allArticles.length,
      durationMs,
      concurrency: FETCH_CONCURRENCY,
    },
  };
}

module.exports = { harvestAllFeeds };
