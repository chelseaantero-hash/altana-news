import { motion } from 'framer-motion';
import { ExternalLink, Sparkles } from 'lucide-react';
import { timeAgo } from '../utils/time';
import { CAT_META } from '../constants';

export function ArticleCard({ article, onSummarize, className = '', index = 0 }) {
  const label = CAT_META[article.category]?.label || article.categoryLabel || article.category;
  const link = article.source_url || article.url;
  const img = article.imageUrl;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      className={`group flex flex-col border border-white/[0.06] bg-[#080808] transition-colors hover:border-white/[0.12] hover:bg-[#0c0c0c] ${className}`}
    >
      {img ? (
        <div className="relative aspect-[16/10] overflow-hidden">
          <img
            src={img}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            loading="lazy"
            onError={(e) => {
              e.target.closest('.relative')?.classList.add('hidden');
            }}
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent opacity-80" />
        </div>
      ) : null}
      <div className="flex flex-1 flex-col p-5 md:p-6">
        <p className="font-sans text-[9px] uppercase tracking-[0.18em] text-editorialMuted mb-2">{label}</p>
        <h3 className="font-serif text-lg md:text-xl leading-snug text-editorial mb-3 line-clamp-3">{article.title}</h3>
        <p className="font-sans text-sm font-light leading-relaxed text-editorialMuted line-clamp-3 flex-1">{article.summary}</p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
          <span className="font-sans text-[10px] text-editorialMuted">{article.source} · {timeAgo(article.pubDate)}</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onSummarize(article)}
              className="inline-flex items-center gap-1.5 font-sans text-[10px] uppercase tracking-[0.12em] text-editorial/90 hover:text-editorial"
            >
              <Sparkles className="h-3 w-3" strokeWidth={1.25} />
              Summarize
            </button>
            {link ? (
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-sans text-[10px] uppercase tracking-[0.12em] text-editorial/90 hover:text-editorial"
              >
                Original
                <ExternalLink className="h-3 w-3" strokeWidth={1.25} />
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </motion.article>
  );
}
