const { harvestAllFeeds } = require('../lib/harvest');

/**
 * GET /api/news
 * Aggregates public RSS feeds on the server (no API keys, no database).
 * Responses are CDN-cached ~30m so repeat visits stay fast.
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { articles, updatedAt, harvestMeta } = await harvestAllFeeds();

    res.setHeader(
      'Cache-Control',
      'public, s-maxage=1800, stale-while-revalidate=3600'
    );

    return res.status(200).json({
      articles,
      updatedAt,
      harvestMeta,
    });
  } catch (err) {
    console.error('[api/news]', err);
    return res.status(500).json({ error: 'Failed to load feeds' });
  }
};

/** Hobby plan max is 60s — harvest needs ~25–40s for all feeds. Values above 60 are ignored on Hobby. */
module.exports.config = {
  maxDuration: 60,
};
