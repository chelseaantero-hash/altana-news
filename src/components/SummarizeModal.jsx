import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { bulletsFromArticle } from '../utils/summary';

export function SummarizeModal({ article, open, onClose }) {
  const bullets = article ? bulletsFromArticle(article) : [];

  return (
    <AnimatePresence>
      {open && article && (
        <motion.div
          className="fixed inset-0 z-[300] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            aria-label="Close"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="summarize-title"
            className="relative z-[301] w-full max-w-lg border border-white/[0.08] bg-[#0a0a0a]/95 p-8 shadow-2xl shadow-black/60"
            style={{
              transform: 'perspective(1200px) rotateX(2deg)',
              backdropFilter: 'blur(20px)',
            }}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 text-editorialMuted hover:text-editorial transition-colors"
              aria-label="Close dialog"
            >
              <X className="h-5 w-5" strokeWidth={1.25} />
            </button>
            <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-accent mb-3">Brief</p>
            <h2 id="summarize-title" className="font-serif text-xl text-editorial leading-snug mb-6 pr-8">
              {article.title}
            </h2>
            <ul className="space-y-3 font-sans text-sm text-editorial/90 leading-relaxed">
              {bullets.map((b, i) => (
                <li key={i} className="flex gap-3">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent/80" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-[11px] text-editorialMuted leading-relaxed">
              Summaries are extractive (from RSS text). For the full story, use View original.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
