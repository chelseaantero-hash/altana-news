/** Extractive 3-bullet summary when API omits summaryBullets. */
export function bulletsFromArticle(article) {
  if (article.summaryBullets && Array.isArray(article.summaryBullets) && article.summaryBullets.length >= 3) {
    return article.summaryBullets.slice(0, 3);
  }
  const s =
    String(article.summary || '').trim() ||
    String(article.raw_content || '').trim().slice(0, 1200) ||
    String(article.title || '');
  const parts = s
    .split(/(?<=[.!?])\s+/)
    .map((x) => x.trim())
    .filter(Boolean);
  if (parts.length >= 3) return parts.slice(0, 3);
  const chunks = s.split(/[,;]\s+/).filter((x) => x.length > 12);
  if (chunks.length >= 3) return chunks.slice(0, 3);
  const title = String(article.title || '');
  return [
    title || s.slice(0, 140),
    s.length > 40 ? s.slice(0, Math.min(200, s.length)) : 'See the original piece for context.',
    'Use “View original” for the full article.',
  ];
}
