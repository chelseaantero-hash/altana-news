import { motion } from 'framer-motion';
import { HeroFeature } from './HeroFeature';
import { ArticleCard } from './ArticleCard';

export function Feed({ articles, onSummarize }) {
  const sorted = [...articles].sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
  const hero = sorted[0];
  const secondary = sorted.slice(1);

  const a = secondary[0];
  const b = secondary[1];
  const c = secondary[2];
  const rest = secondary.slice(3);

  return (
    <div className="space-y-6 md:space-y-10">
      <HeroFeature article={hero} onSummarize={onSummarize} />

      {secondary.length > 0 && (
        <>
          <motion.div
            className="flex flex-col gap-4 md:flex-row md:gap-5 md:items-stretch"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35 }}
          >
            {a ? (
              <div className="md:flex-[7] md:min-w-0">
                <ArticleCard article={a} onSummarize={onSummarize} index={0} className="h-full min-h-[320px]" />
              </div>
            ) : null}
            <div className="flex flex-col gap-4 md:flex-[5] md:min-w-0">
              {b ? <ArticleCard article={b} onSummarize={onSummarize} index={1} className="flex-1" /> : null}
              {c ? <ArticleCard article={c} onSummarize={onSummarize} index={2} className="flex-1" /> : null}
            </div>
          </motion.div>

          {rest.length > 0 && (
            <motion.div
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 md:gap-5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35, delay: 0.05 }}
            >
              {rest.map((art, i) => (
                <ArticleCard
                  key={art.id || art.url + i}
                  article={art}
                  onSummarize={onSummarize}
                  index={3 + i}
                />
              ))}
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
