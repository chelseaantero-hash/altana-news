/**
 * Exa REST API — same EXA_API_KEY as @exa/mcp-server.
 * https://docs.exa.ai
 */
async function exaSearch({ query, numResults = 10, includeDomains, excludeDomains }) {
  const key = process.env.EXA_API_KEY || '';
  if (!key || !query) return { results: [] };

  const body = {
    query,
    numResults,
    contents: { text: true },
  };
  if (includeDomains && includeDomains.length) body.includeDomains = includeDomains;
  if (excludeDomains && excludeDomains.length) body.excludeDomains = excludeDomains;

  const res = await fetch('https://api.exa.ai/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(`Exa search HTTP ${res.status}`);
    err.detail = data;
    throw err;
  }
  return data;
}

module.exports = { exaSearch };
