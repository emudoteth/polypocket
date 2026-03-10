// Parses outcomes from a Polymarket event + its child markets
// Returns [{ name, price, tokenId }] for display + trading
export function parseOutcomes(event) {
  const markets = event.markets || [];
  if (!markets.length) return [];

  const parseJson = (s, fallback) => {
    if (Array.isArray(s)) return s;
    try { return JSON.parse(s || 'null') ?? fallback; } catch { return fallback; }
  };

  // Single binary market → show YES + NO as two buttons
  if (markets.length === 1) {
    const m = markets[0];
    const names  = parseJson(m.outcomes, ['Yes', 'No']);
    const prices = parseJson(m.outcomePrices, [0.5, 0.5]);
    const tokens = parseJson(m.clobTokenIds, []);
    return names.map((name, i) => ({
      name,
      price:   parseFloat(prices[i]) || 0,
      tokenId: tokens[i] || '',
    }));
  }

  // Multi-outcome event → each child market is one outcome
  return markets.slice(0, 4).map((m) => {
    const names  = parseJson(m.outcomes, ['Yes']);
    const prices = parseJson(m.outcomePrices, [0.5]);
    const tokens = parseJson(m.clobTokenIds, []);
    return {
      name:    m.question || names[0] || 'Yes',
      price:   parseFloat(prices[0]) || 0,
      tokenId: tokens[0] || '',
    };
  }).concat(
    markets.length > 4
      ? [{ name: `+${markets.length - 4} more`, price: null, tokenId: '' }]
      : []
  );
}

const fmtVol = n => {
  if (!n || isNaN(n)) return '—';
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};

const tagEmoji = slug => ({
  politics:'🗳️', sports:'🏆', crypto:'🔮', finance:'📈', geopolitics:'🌐',
  tech:'💻', culture:'🎭', economy:'💰', iran:'🌍', elections:'🗳️',
  entertainment:'🎬', nfl:'🏈', nba:'🏀', 'climate-science':'🌦️',
}[slug] || '🫧');

export default function MarketCard({ event, onTrade, onDetails }) {
  const markets = event.markets || [];
  const title   = event.title || event.slug || 'Unknown';
  const vol     = parseFloat(event.volume24hr) || 0;
  const tag     = (event.tags || [])[0];
  const tagLabel = tag ? (tag.label || tag.slug) : 'General';
  const img     = event.image || event.icon;
  const emoji   = (() => {
    for (const t of (event.tags || [])) {
      const e = tagEmoji((t.slug || '').toLowerCase());
      if (e !== '🫧') return e;
    }
    return '🫧';
  })();

  const outcomes = parseOutcomes(event);
  const tradeable = outcomes.filter(o => o.tokenId && o.price !== null);

  return (
    <div
      style={cardStyle}
      onClick={() => onDetails(event)}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onDetails(event)}
    >
      {/* Header */}
      <div style={{ display:'flex', gap:'0.65rem', alignItems:'flex-start', marginBottom:'0.75rem' }}>
        {img && (
          <img
            src={img} alt="" style={imgStyle}
            onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }}
          />
        )}
        <div style={{ ...emojiStyle, display: img ? 'none' : 'flex' }}>{emoji}</div>
        <div style={titleStyle}>{title}</div>
      </div>

      {/* Outcomes */}
      <div style={{ display:'flex', flexDirection:'column', gap:'0.4rem', marginBottom:'0.75rem' }}>
        {outcomes.slice(0, 3).map((o, i) => {
          if (o.price === null) return (
            <div key={i} style={{ fontSize:'0.7rem', color:'var(--muted)' }}>{o.name}</div>
          );
          const p = Math.round(o.price * 100);
          const color = o.price > 0.65 ? 'var(--green)' : o.price < 0.35 ? 'var(--red)' : 'var(--purple)';
          return (
            <div key={i}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.78rem', marginBottom:'0.2rem' }}>
                <span style={{ color:'var(--muted)', fontWeight:500 }}>{o.name}</span>
                <span style={{ fontWeight:800, color }}>{p}%</span>
              </div>
              <div style={{ height:5, background:'var(--border)', borderRadius:99, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${p}%`, borderRadius:99,
                  background:'linear-gradient(90deg,var(--pink),var(--purple))',
                  transition:'width .4s ease' }} />
              </div>
            </div>
          );
        })}
        {markets.length > 4 && (
          <div style={{ fontSize:'0.7rem', color:'var(--muted)' }}>
            +{markets.length - 4} more outcomes
          </div>
        )}
      </div>

      {/* Footer row */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
        fontSize:'0.72rem', color:'var(--muted)', marginBottom: tradeable.length ? '0.75rem' : 0 }}>
        <span style={{ fontWeight:600 }}>Vol: {fmtVol(vol)}</span>
        <span style={{ background:'var(--lilac)', color:'var(--purple)', fontSize:'0.65rem', fontWeight:700,
          padding:'0.18rem 0.5rem', borderRadius:6, textTransform:'uppercase', letterSpacing:'0.04em' }}>
          {tagLabel}
        </span>
        <span style={{ display:'flex', alignItems:'center', gap:4, fontWeight:600, color:'var(--green)' }}>
          <span style={{ width:5, height:5, borderRadius:'50%', background:'var(--green)',
            display:'inline-block', animation:'pulse 2s infinite' }} />
          Live
        </span>
      </div>

      {/* Buy buttons — stop propagation so they don't open the detail modal */}
      {tradeable.length > 0 && (
        <div style={{ display:'flex', gap:'0.5rem' }} onClick={e => e.stopPropagation()}>
          {tradeable.slice(0, 2).map((o, i) => (
            <button
              key={i}
              style={{
                flex:1, padding:'0.45rem 0.5rem', borderRadius:99,
                fontSize:'0.78rem', fontWeight:700, border:'1.5px solid',
                cursor:'pointer', transition:'all .18s',
                background: i === 0 ? '#dcfce7' : '#fef2f2',
                color:       i === 0 ? 'var(--green)' : 'var(--red)',
                borderColor: i === 0 ? '#86efac' : '#fca5a5',
              }}
              onClick={() => onTrade({ event, tokenID: o.tokenId, outcomeName: o.name, initialPrice: o.price })}
            >
              {i === 0 ? '🟢' : '🔴'} {o.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const cardStyle = {
  background:'white', border:'1.5px solid var(--border)',
  borderRadius:14, padding:'1rem', cursor:'pointer',
  transition:'transform .18s, box-shadow .18s, border-color .18s',
  outline:'none',
};
const imgStyle = { width:40, height:40, borderRadius:10, objectFit:'cover', flexShrink:0, background:'var(--lilac)' };
const emojiStyle = {
  width:40, height:40, borderRadius:10, flexShrink:0,
  background:'linear-gradient(135deg,var(--lilac),#fce7f3)',
  alignItems:'center', justifyContent:'center', fontSize:'1.1rem',
};
const titleStyle = {
  fontSize:'0.875rem', fontWeight:700, lineHeight:1.4,
  display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical', overflow:'hidden',
};
