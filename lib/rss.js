const { XMLParser } = require('fast-xml-parser');

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  trimValues: true,
  isArray: (name) => ['item', 'entry', 'link'].includes(name),
});

function stripHtml(s) {
  return String(s)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function firstImgSrcFromHtml(html) {
  if (!html || typeof html !== 'string') return '';
  const m = html.match(/<img[^>]+src\s*=\s*["']([^"']+)["']/i);
  return m ? m[1].trim() : '';
}

/** Pick a usable image URL from RSS/Atom fields (many feeds omit this). */
function imageFromRaw(raw) {
  const enc = raw.enclosure;
  if (enc) {
    const arr = Array.isArray(enc) ? enc : [enc];
    for (let i = 0; i < arr.length; i++) {
      const e = arr[i];
      if (!e || typeof e !== 'object') continue;
      const url = e['@_url'] || e['@_href'] || '';
      const typ = String(e['@_type'] || '').toLowerCase();
      if (
        url &&
        (typ.startsWith('image/') || /\.(jpe?g|png|gif|webp|avif)(\?|$)/i.test(url))
      ) {
        return url;
      }
    }
  }
  const thumb = raw['media:thumbnail'];
  if (thumb) {
    const t = Array.isArray(thumb) ? thumb[0] : thumb;
    const u = t && (t['@_url'] || t['@_href']);
    if (u) return String(u);
  }
  const mc = raw['media:content'];
  if (mc) {
    const arr = Array.isArray(mc) ? mc : [mc];
    for (let i = 0; i < arr.length; i++) {
      const m = arr[i];
      if (!m || typeof m !== 'object') continue;
      const url = m['@_url'] || m['@_href'] || '';
      const medium = String(m['@_medium'] || '').toLowerCase();
      const typ = String(m['@_type'] || '').toLowerCase();
      if (
        url &&
        (medium === 'image' || typ.startsWith('image/') || /\.(jpe?g|png|gif|webp)(\?|$)/i.test(url))
      ) {
        return url;
      }
    }
  }
  const itunes = raw['itunes:image'] || raw.image;
  if (itunes && typeof itunes === 'object' && itunes['@_href']) return String(itunes['@_href']);

  const htmlBlob =
    raw['content:encoded'] || raw.description || raw.summary || raw.content || '';
  const fromHtml = firstImgSrcFromHtml(String(htmlBlob));
  if (fromHtml) return fromHtml;

  return '';
}

function textOf(v) {
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'object') {
    if (v['#text'] != null) return String(v['#text']).trim();
    if (v.text != null) return String(v.text).trim();
  }
  return String(v).trim();
}

function linkFromRaw(raw) {
  const link = raw.link;
  if (!link) return textOf(raw.guid) || '';
  if (typeof link === 'string') return link.trim();
  if (Array.isArray(link)) {
    const alt = link.find((x) => x && (x['@_rel'] === 'alternate' || !x['@_rel'])) || link[0];
    if (alt && alt['@_href']) return String(alt['@_href']);
    return textOf(alt);
  }
  if (link['@_href']) return String(link['@_href']);
  return textOf(link);
}

function pubFromRaw(raw) {
  const d =
    textOf(raw.pubDate) ||
    textOf(raw.published) ||
    textOf(raw.updated) ||
    textOf(raw.date) ||
    textOf(raw['dc:date']);
  if (!d) return new Date().toISOString();
  const t = Date.parse(d);
  if (Number.isNaN(t)) return new Date().toISOString();
  return new Date(t).toISOString();
}

function descFromRaw(raw) {
  const d =
    raw.description ||
    raw['content:encoded'] ||
    raw.summary ||
    raw.content ||
    '';
  return stripHtml(textOf(d));
}

function normalizeRssItem(raw) {
  const title = textOf(raw.title).slice(0, 500);
  const url = linkFromRaw(raw);
  const pubDate = pubFromRaw(raw);
  let summary = descFromRaw(raw);
  if (summary.length > 380) summary = summary.slice(0, 377) + '...';
  if (!summary) summary = title;
  const imageUrl = imageFromRaw(raw) || '';
  return { title, link: url, pubDate, summary, imageUrl };
}

function extractItems(parsed) {
  let rawItems = [];
  if (parsed.rss?.channel?.item) {
    const it = parsed.rss.channel.item;
    rawItems = Array.isArray(it) ? it : [it];
  } else if (parsed.feed?.entry) {
    const it = parsed.feed.entry;
    rawItems = Array.isArray(it) ? it : [it];
  } else if (parsed['rdf:RDF']?.item) {
    const it = parsed['rdf:RDF'].item;
    rawItems = Array.isArray(it) ? it : [it];
  }
  return rawItems.map(normalizeRssItem).filter((x) => x.title);
}

/**
 * Parse RSS or Atom XML; return up to `limit` normalized story objects.
 */
function parseFeedXml(xml, limit = 15) {
  if (!xml || typeof xml !== 'string') return [];
  let parsed;
  try {
    parsed = parser.parse(xml);
  } catch {
    return [];
  }
  return extractItems(parsed).slice(0, limit);
}

module.exports = { parseFeedXml };
