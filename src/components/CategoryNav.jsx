import { CAT_GROUPS, CAT_META, CAT_ORDER } from '../constants';

function channelLabel(id) {
  if (id === 'all') return 'All';
  return CAT_META[id]?.label || id;
}

export function CategoryNav({ active, onSelect, variant = 'sidebar' }) {
  if (variant === 'mobile') {
    return (
      <div className="relative">
        <label htmlFor="channel-select" className="sr-only">
          Channel
        </label>
        <select
          id="channel-select"
          value={active}
          onChange={(e) => onSelect(e.target.value)}
          className="w-full appearance-none rounded-sm border border-white/[0.12] bg-[#0a0a0a] px-3 py-2.5 pr-10 font-sans text-[12px] text-editorial focus:border-white/25 focus:outline-none focus:ring-1 focus:ring-white/15"
        >
          {CAT_ORDER.map((id) => (
            <option key={id} value={id}>
              {id === 'all' ? 'All channels' : channelLabel(id)}
            </option>
          ))}
        </select>
        <span
          className="pointer-events-none absolute right-3 top-1/2 h-2 w-2 -translate-y-1/2 border-b border-r border-editorialMuted rotate-45 opacity-60"
          aria-hidden
        />
      </div>
    );
  }

  return (
    <nav className="flex flex-col gap-6" aria-label="Channels">
      {CAT_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="mb-2 px-3 font-sans text-[10px] font-medium uppercase tracking-[0.14em] text-editorialMuted">
            {group.label}
          </p>
          <ul className="flex flex-col gap-0.5">
            {group.ids.map((id) => {
              const label = channelLabel(id);
              const isActive = active === id;
              const accent = id !== 'all' ? CAT_META[id]?.color : null;
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => onSelect(id)}
                    className={[
                      'w-full rounded-sm border-l-2 border-transparent py-2 pl-3 pr-2 text-left font-sans text-[11px] uppercase tracking-[0.1em] transition-colors',
                      isActive
                        ? 'bg-white/[0.06] text-editorial'
                        : 'text-editorialMuted hover:bg-white/[0.04] hover:text-editorial/90',
                    ].join(' ')}
                    style={
                      isActive && accent
                        ? { borderLeftColor: accent }
                        : isActive
                          ? { borderLeftColor: 'rgba(229, 229, 229, 0.5)' }
                          : undefined
                    }
                  >
                    {label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
