import { motion } from 'framer-motion';
import { ExternalLink, Sparkles } from 'lucide-react';
import { timeAgo } from '../utils/time';
import { CAT_META } from '../constants';

export function HeroFeature({ article, onSummarize }) {
  if (!article) {
    return (
      <div className="relative min-h-[320px] flex items-center justify-center border border-white/[0.06] bg-[#080808]">
        <p className="font-sans text-sm uppercase tracking-[0.12em] text-editorialMuted">No stories yet — refresh to load feeds</p>
      </div>
    );
  }

  const label = CAT_META[article.category]?.label || article.categoryLabel || article.category;
  const img = article.imageUrl;
  const link = article.source_url || article.url;

  return (
    <motion.article
      className="group relative overflow-hidden border border-white/[0.08]"
      style={{
        transform: 'perspective(1400px) rotateX(1.5deg)',
        transformStyle: 'preserve-3d',
      }}
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="absolute inset-0 z-0">
        {img ? (
          <img
            src={img}
            alt=""
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            loading="eager"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-[#121212] via-[#0a0a0a] to-[#050505]" />
        )}
        <div className="absolute inset-0 bg-hero-fade" />
      </div>

      <div
        className="relative z-10 flex min-h-[420px] flex-col justify-end p-8 md:p-12 md:pb-14"
        style={{
          backdropFilter: 'blur(0px)',
        }}
      >
        <div
          className="absolute bottom-0 left-0 right-0 top-[35%] border-t border-white/[0.06] bg-[rgba(8,8,8,0.45)] px-8 py-10 md:px-12"
          style={{
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.06)',
          }}
        >
          <p className="font-sans text-[10px] uppercase tracking-[0.22em] text-accent mb-3">{label}</p>
          <h1 className="font-serif text-3xl md:text-5xl font-medium leading-[1.12] text-editorial max-w-4xl tracking-tight">
            {article.title}
          </h1>
          <p className="mt-5 max-w-3xl font-sans text-base md:text-lg font-light leading-relaxed text-editorial/85 line-clamp-3">
            {article.summary}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <span className="font-sans text-xs text-editorialMuted tracking-wide">
              {article.source} · {timeAgo(article.pubDate)}
            </span>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => onSummarize(article)}
                className="inline-flex items-center gap-2 border border-white/15 bg-white/[0.04] px-4 py-2 font-sans text-[11px] uppercase tracking-[0.14em] text-editorial transition hover:border-accent/50 hover:bg-white/[0.07]"
              >
                <Sparkles className="h-3.5 w-3.5" strokeWidth={1.25} />
                Summarize
              </button>
              {link ? (
                <a
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 border border-white/15 px-4 py-2 font-sans text-[11px] uppercase tracking-[0.14em] text-editorial transition hover:border-editorial/40"
                >
                  View original
                  <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.25} />
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
