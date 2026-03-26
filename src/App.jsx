import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { CategoryNav } from './components/CategoryNav';
import { Feed } from './components/Feed';
import { SummarizeModal } from './components/SummarizeModal';

function normalizeArticle(a) {
  const url = a.url || a.link || '';
  const pub = a.pubDate || a.published_date || null;
  return {
    ...a,
    url,
    source_url: a.source_url || url,
    pubDate: pub,
    published_date: a.published_date || pub,
    raw_content: a.raw_content != null ? a.raw_content : a.summary || '',
  };
}

export default function App() {
  const [articles, setArticles] = useState([]);
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);
  const [harvestMeta, setHarvestMeta] = useState(null);
  const [summarizeArticle, setSummarizeArticle] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const apiUrl = `${window.location.origin}/api/news`;
      const res = await fetch(apiUrl, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const raw = data.articles || [];
      const next = raw.map(normalizeArticle);
      setArticles(next);
      setUpdatedAt(data.updatedAt || null);
      setHarvestMeta(data.harvestMeta || null);
      if (!next.length) {
        setError(
          'No articles returned. If you opened the static file directly, run the API: npm run dev'
        );
      }
    } catch (e) {
      setError(e.message || 'Failed to load');
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (category === 'all') return articles;
    return articles.filter((a) => a.category === category);
  }, [articles, category]);

  const onSummarize = (a) => {
    setSummarizeArticle(a);
    setModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-onyx">
      <div className="grid h-1 grid-cols-5">
        <div className="bg-[#E8401C]" />
        <div className="bg-[#C49A2A]" />
        <div className="bg-[#2563EB]" />
        <div className="bg-[#94A3B8]" />
        <div className="bg-[#16A34A]" />
      </div>

      <header className="sticky top-0 z-[100] border-b border-white/[0.06] bg-onyx/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 px-4 py-5 md:px-10">
          <div className="flex items-center gap-4">
            <svg viewBox="0 0 36 36" fill="none" width="36" height="36" aria-hidden>
              <circle cx="18" cy="18" r="17" fill="#E5E5E5" />
              <rect x="2" y="2" width="15" height="15" fill="#050505" />
              <rect x="19" y="2" width="15" height="15" fill="#050505" />
              <rect x="2" y="19" width="15" height="15" fill="#050505" />
              <rect x="10" y="10" width="7" height="7" fill="#E5E5E5" />
            </svg>
            <div>
              <p className="font-sans text-[15px] font-medium uppercase tracking-[0.12em] text-editorial">Altana</p>
              <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-editorialMuted">News Intelligence</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-sans text-xs text-editorialMuted">
              {updatedAt
                ? `Updated ${new Date(updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : '—'}
            </span>
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-2 border border-white/15 px-4 py-2 font-sans text-[11px] uppercase tracking-[0.14em] text-editorial transition hover:border-editorial/40 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.25} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex min-h-0 max-w-[1600px]">
        <aside
          className="scrollbar-minimal hidden md:sticky md:top-[81px] md:flex md:max-h-[calc(100vh-81px)] md:w-[15rem] md:shrink-0 md:flex-col md:overflow-y-auto md:border-r md:border-white/[0.06] md:px-4 md:pb-8 md:pt-8 lg:pl-10"
          aria-label="Channel navigation"
        >
          <CategoryNav variant="sidebar" active={category} onSelect={setCategory} />
        </aside>

        <div className="min-w-0 flex-1">
          <div className="border-b border-white/[0.06] px-4 py-3 md:hidden">
            <CategoryNav variant="mobile" active={category} onSelect={setCategory} />
          </div>

          <main className="px-4 py-10 md:px-10 md:py-14">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-10 flex flex-wrap items-baseline gap-4 border-b border-white/[0.06] pb-6"
            >
              <h1 className="font-serif text-3xl md:text-4xl text-editorial tracking-tight">Today&apos;s file</h1>
              <span className="h-px flex-1 min-w-[48px] bg-gradient-to-r from-white/20 to-transparent" />
              <time className="font-sans text-xs text-editorialMuted tracking-wide">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </time>
            </motion.div>

            {loading && (
              <p className="font-sans text-sm text-editorialMuted">Loading feeds…</p>
            )}
            {!loading && error && (
              <p className="font-sans text-sm text-red-400/90 mb-6">{error}</p>
            )}
            {!loading && harvestMeta && (
              <p className="font-sans text-[11px] text-editorialMuted mb-8 leading-relaxed">
                {harvestMeta.articleCount != null && (
                  <>
                    <span className="text-editorial/80">{harvestMeta.articleCount}</span> stories ·{' '}
                  </>
                )}
                {harvestMeta.successfulFeeds != null && harvestMeta.failedFeeds && (
                  <>
                    <span className="text-editorial/80">{harvestMeta.successfulFeeds}</span> feeds ok
                    {harvestMeta.failedFeeds.length > 0 && (
                      <>
                        {' '}
                        · <span className="text-amber-500/90">{harvestMeta.failedFeeds.length}</span> feeds needed retries or
                        failed (see server logs)
                      </>
                    )}
                    {harvestMeta.durationMs != null && (
                      <>
                        {' '}
                        · {Math.round(harvestMeta.durationMs / 100) / 10}s
                      </>
                    )}
                  </>
                )}
              </p>
            )}

            {!loading && filtered.length > 0 && (
              <Feed articles={filtered} onSummarize={onSummarize} />
            )}

            {!loading && !filtered.length && !error && (
              <p className="font-sans text-sm text-editorialMuted">No stories in this channel.</p>
            )}
          </main>

          <SummarizeModal
            article={summarizeArticle}
            open={modalOpen}
            onClose={() => {
              setModalOpen(false);
              setSummarizeArticle(null);
            }}
          />
        </div>
      </div>
    </div>
  );
}
