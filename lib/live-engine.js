const { FEEDS, CAT_META, PRIORITY_KEYWORDS } = require('./feeds-config');
const { parseFeedXml } = require('./rss');
const { tavilySearch } = require('./tavily-client');
const { exaSearch } = require('./exa-client');
const { fetchUrlWithFallback } = require('./fetch-content');

const TREASURY_FEEDBURNER = 'https://feeds.feedburner.com/TreasuryNews';
const FR_API = 'https://www.federalregister.gov/api/v1/documents.json';

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

function isPriority(title) {
  const t = String(title).toLowerCase();
  return PRIORITY_KEYWORDS.some((k) => t.includes(k));
}

function bulletsFromText(summary, title) {
  const s = String(summary || '').trim() || String(title || '');
  const parts = s
    .split(/(?<=[.!?])\s+/)
    .map((x) => x.trim())
    .filter(Boolean);
  if (parts.length >= 3) return parts.slice(0, 3);
  const chunks = s.split(/[,;]\s+/).filter((x) => x.length > 12);
  if (chunks.length >= 3) return chunks.slice(0, 3);
  return [s.slice(0, 160) || title, 'See original source.', ''];
}

function stripHtml(s) {
  return String(s)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Federal Register JSON API — works without RSS proxies or API keys.
 */
async function fetchFrDocumentDetail(documentNumber) {
  if (!documentNumber) return null;
  try {
    const u = `https://www.federalregister.gov/api/v1/documents/${encodeURIComponent(documentNumber)}.json`;
    const res = await fetch(u, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function fetchFederalRegisterFromApi(perPage = 8) {
  const url = `${FR_API}?per_page=${perPage}&order=newest`;
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (!res.ok) return [];
  const data = await res.json();
  const results = data.results || [];
  const details = await Promise.all(results.map((d) => fetchFrDocumentDetail(d.document_number)));

  const out = [];
  for (let i = 0; i < results.length; i++) {
    const doc = results[i];
    const detail = details[i] || {};
    const merged = { ...doc, ...detail };
    const link = merged.html_url || '';
    const pub = merged.publication_date ? `${merged.publication_date}T12:00:00.000Z` : new Date().toISOString();
    let raw_content = stripHtml(merged.abstract || '') || '';

    if (merged.body_html_url && raw_content.length < 400) {
      const body = await fetchUrlWithFallback(merged.body_html_url);
      if (body) raw_content = stripHtml(body).slice(0, 12000) || raw_content;
    }

    const summary = raw_content.slice(0, 420) || merged.title;

    out.push({
      id: `fr_live_${merged.document_number || i}`,
      category: 'federal-register',
      categoryLabel: CAT_META['federal-register']?.label || 'Federal Register',
      title: merged.title || 'Federal Register document',
      summary,
      summaryBullets: bulletsFromText(summary, merged.title),
      source: 'Federal Register',
      url: link,
      source_url: link,
      pubDate: pub,
      published_date: pub,
      raw_content,
      tags: ['rulemaking', 'regulations', 'live-api'],
      priority: isPriority(merged.title),
      imageUrl: '',
    });
  }
  return out;
}

async function fetchTreasuryFeedburner(limit = 6) {
  try {
    const res = await fetch(TREASURY_FEEDBURNER, {
      headers: { 'User-Agent': UA, Accept: 'application/rss+xml, application/xml, */*' },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const items = parseFeedXml(xml, limit);
    return items.map((item, i) => {
      const link = item.link || '';
      const pub = item.pubDate || new Date().toISOString();
      const raw = stripHtml(item.summary || '') || '';
      return {
        id: `treasury_fb_${i}_${pub}`,
        category: 'sanctions',
        categoryLabel: CAT_META.sanctions?.label || 'Sanctions & Compliance',
        title: item.title || 'Treasury',
        summary: raw.slice(0, 400) || item.title,
        summaryBullets: bulletsFromText(item.summary, item.title),
        source: 'U.S. Treasury (RSS)',
        url: link,
        source_url: link,
        pubDate: pub,
        published_date: pub,
        raw_content: raw,
        tags: ['sanctions', 'treasury', 'live-rss'],
        priority: isPriority(item.title),
        imageUrl: item.imageUrl || '',
      };
    });
  } catch {
    return [];
  }
}

/**
 * Tavily: targeted searches for FR / WH / Treasury (same behavior as MCP news search).
 */
async function fetchTavilyTriangle() {
  if (!process.env.TAVILY_API_KEY) return [];

  const blocks = [
    {
      query:
        'latest notices and rules site:federalregister.gov OR site:www.federalregister.gov',
      category: 'federal-register',
      source: 'Federal Register',
      max_results: 7,
    },
    {
      query: 'press briefing OR statement OR remarks site:whitehouse.gov',
      category: 'white-house',
      source: 'White House',
      max_results: 7,
    },
    {
      query: 'OFAC sanctions OR SDN OR Treasury press release site:home.treasury.gov OR site:ofac.treasury.gov',
      category: 'sanctions',
      source: 'Treasury / OFAC',
      max_results: 6,
    },
  ];

  const out = [];
  for (const b of blocks) {
    try {
      const data = await tavilySearch({
        query: b.query,
        max_results: b.max_results,
        search_depth: process.env.TAVILY_SEARCH_DEPTH || 'advanced',
        include_raw_content: true,
      });
      const rows = data.results || [];
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const link = r.url || '';
        if (!link) continue;
        const raw_content =
          r.raw_content ||
          r.content ||
          stripHtml(r.description || '') ||
          '';
        const summary = raw_content.slice(0, 420) || r.title || '';
        const pub = new Date().toISOString();

        out.push({
          id: `tavily_${b.category}_${i}_${link.slice(-24)}`,
          category: b.category,
          categoryLabel: CAT_META[b.category]?.label || b.category,
          title: r.title || 'Article',
          summary,
          summaryBullets: bulletsFromText(summary, r.title),
          source: b.source,
          url: link,
          source_url: link,
          pubDate: pub,
          published_date: pub,
          raw_content,
          tags: ['live-tavily', b.category],
          priority: isPriority(r.title),
          imageUrl: (() => {
            const im = r.images && r.images[0];
            if (!im) return '';
            return typeof im === 'string' ? im : im.url || '';
          })(),
        });
      }
    } catch (e) {
      console.warn('[live-engine tavily]', b.category, e.message || e);
    }
  }
  return out;
}

/**
 * Exa fallback when Tavily is not configured.
 */
async function fetchExaTriangle() {
  if (process.env.TAVILY_API_KEY || !process.env.EXA_API_KEY) return [];

  const queries = [
    { q: 'Federal Register latest documents', domains: ['federalregister.gov'], category: 'federal-register', source: 'Federal Register' },
    { q: 'White House press briefing news', domains: ['whitehouse.gov'], category: 'white-house', source: 'White House' },
    { q: 'Treasury OFAC sanctions', domains: ['treasury.gov', 'ofac.treasury.gov', 'home.treasury.gov'], category: 'sanctions', source: 'Treasury / OFAC' },
  ];

  const out = [];
  for (const block of queries) {
    try {
      const data = await exaSearch({
        query: block.q,
        numResults: 7,
        includeDomains: block.domains,
      });
      const rows = data.results || [];
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const link = r.url || '';
        if (!link) continue;
        let raw_content = '';
        if (typeof r.text === 'string') raw_content = r.text;
        else if (r.text && typeof r.text === 'object' && r.text.text) raw_content = String(r.text.text);
        else if (typeof r.content === 'string') raw_content = r.content;
        const summary = String(raw_content).slice(0, 420) || r.title || '';
        const pub = r.publishedDate || r.published_date || new Date().toISOString();

        out.push({
          id: `exa_${block.category}_${i}`,
          category: block.category,
          categoryLabel: CAT_META[block.category]?.label || block.category,
          title: r.title || 'Article',
          summary,
          summaryBullets: bulletsFromText(summary, r.title),
          source: block.source,
          url: link,
          source_url: link,
          pubDate: pub,
          published_date: pub,
          raw_content: String(raw_content),
          tags: ['live-exa', block.category],
          priority: isPriority(r.title),
          imageUrl: '',
        });
      }
    } catch (e) {
      console.warn('[live-engine exa]', block.category, e.message || e);
    }
  }
  return out;
}

/**
 * White House RSS proxy feeds (official .gov feeds often block server-side fetch).
 */
async function fetchWhiteHouseProxyFeeds(limitPerFeed = 4) {
  const feeds = FEEDS.filter((f) => f.cat === 'white-house').slice(0, 4);
  const out = [];
  for (const feed of feeds) {
    try {
      const res = await fetch(feed.url, {
        headers: { 'User-Agent': UA, Accept: 'application/rss+xml, application/xml, */*' },
      });
      if (!res.ok) continue;
      const xml = await res.text();
      const items = parseFeedXml(xml, limitPerFeed);
      items.forEach((item, i) => {
        const link = item.link || '';
        const pub = item.pubDate || new Date().toISOString();
        const raw = stripHtml(item.summary || '') || '';
        out.push({
          id: `wh_proxy_${feed.source}_${i}`,
          category: 'white-house',
          categoryLabel: CAT_META['white-house']?.label || 'White House',
          title: item.title || feed.source,
          summary: raw.slice(0, 400) || item.title,
          summaryBullets: bulletsFromText(item.summary, item.title),
          source: feed.source,
          url: link,
          source_url: link,
          pubDate: pub,
          published_date: pub,
          raw_content: raw,
          tags: [...(feed.tags || []), 'proxy-feed'],
          priority: isPriority(item.title),
          imageUrl: item.imageUrl || '',
        });
      });
    } catch {
      /* skip */
    }
  }
  return out;
}

/**
 * Priority live slice: Federal Register API + Treasury RSS + Tavily/Exa triangle + WH proxies.
 */
async function fetchLivePriorityNews() {
  const [fr, treasury, tavily, exa, whProxy] = await Promise.all([
    fetchFederalRegisterFromApi(8),
    fetchTreasuryFeedburner(6),
    fetchTavilyTriangle(),
    fetchExaTriangle(),
    fetchWhiteHouseProxyFeeds(4),
  ]);

  const merged = [...fr, ...treasury, ...tavily, ...exa, ...whProxy];
  return merged;
}

module.exports = {
  fetchLivePriorityNews,
  fetchFederalRegisterFromApi,
  fetchTreasuryFeedburner,
  fetchTavilyTriangle,
  fetchExaTriangle,
};
