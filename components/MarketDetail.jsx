import { useState, useEffect } from 'react';
import { parseOutcomes } from './MarketCard';

const fmtVol = n => {
  if (!n || isNaN(n)) return '—';
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};

export default function MarketDetail({ event, onClose, onTrade }) {
  const [book, setBook] = useState(null);
  const [activeToken, setActiveToken] = useState(null);
  const [bookLoading, setBookLoading] = useState(false);

  const outcomes = parseOutcomes(event);
  const tradeable = outcomes.filter(o => o.tokenId && o.price !== null);

  // Load order book for first outcome on open
  useEffect(() => {
    if (tradeable.length > 0) loadBook(tradeable[0].tokenId);
  }, [event.id]); // eslint-disable-line

  async function loadBook(tokenId) {
    setActiveToken(tokenId);
    setBookLoading(true);
    setBook(null);
    try {
      const r = await fetch(`/api/book?token_id=${tokenId}`);
      setBook(await r.json());
    } catch {}
    setBookLoading(false);
  }

  // Escape to close
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const asks = book?.asks?.slice(0, 6) || [];
  const bids = book?.bids?.slice(0, 6) || [];
  const maxA = asks.reduce((m, r) => Math.max(m, parseFloat(r.size || 0)), 0);
  const maxB = bids.reduce((m, r) => Math.max(m, parseFloat(r.size || 0)), 0);

  const activeOutcome = tradeable.find(o => o.tokenId === activeToken);

  return (
    <>
      <div style={overlay} onClick={onClose} />
      <div style={sheet}>
        <div style={handle} />

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1rem' }}>
          <div style={{ fontWeight:800, fontSize:'0.95rem', lineHeight:1.4, flex:1, paddingRight:'0.5rem' }}>
            {event.title}
          </div>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>

        {/* Stats row */}
        <div style={{ display:'flex', gap:'0.5rem', marginBottom:'1.25rem', flexWrap:'wrap' }}>
          <span style={statPill}>📊 Vol: {fmtVol(event.volume24hr)}</span>
          <span style={statPill}>🔴 Live</span>
          {event.endDate && (
            <span style={statPill}>
              ⏱ Ends {new Date(event.endDate).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })}
            </span>
          )}
        </div>

        {/* Outcomes */}
        <div style={{ marginBottom:'1.25rem' }}>
          <div style={sectionLabel}>Outcomes</div>
          <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
            {outcomes.filter(o => o.price !== null).map((o, i) => {
              const p = Math.round(o.price * 100);
              const color = o.price > 0.65 ? 'var(--green)' : o.price < 0.35 ? 'var(--red)' : 'var(--purple)';
              const isActive = activeToken === o.tokenId;
              return (
                <div
                  key={i}
                  style={{
                    background: isActive ? 'var(--lilac)' : 'var(--bg)',
                    border: `1.5px solid ${isActive ? 'var(--lavender)' : 'var(--border)'}`,
                    borderRadius:10, padding:'0.6rem 0.75rem', cursor:'pointer',
                    transition:'all .18s',
                  }}
                  onClick={() => o.tokenId && loadBook(o.tokenId)}
                >
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'0.3rem' }}>
                    <span style={{ fontSize:'0.82rem', fontWeight:600 }}>{o.name}</span>
                    <span style={{ fontSize:'0.88rem', fontWeight:800, color }}>{p}%</span>
                  </div>
                  <div style={{ height:5, background:'var(--border)', borderRadius:99, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${p}%`, borderRadius:99,
                      background:'linear-gradient(90deg,var(--pink),var(--purple))' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Order Book */}
        {tradeable.length > 0 && (
          <div style={{ marginBottom:'1.25rem' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.5rem' }}>
              <div style={sectionLabel}>
                Order Book — {activeOutcome?.name || ''}
              </div>
              <a
                href="https://docs.polymarket.com/api-reference/market-data/get-order-book"
                target="_blank" rel="noopener"
                style={{ fontSize:'0.68rem', color:'var(--purple)', textDecoration:'none', fontFamily:'monospace' }}
              >
                clob.polymarket.com/book ↗
              </a>
            </div>

            {bookLoading ? (
              <div style={{ textAlign:'center', padding:'1rem', color:'var(--muted)', fontSize:'0.82rem' }}>Loading…</div>
            ) : book ? (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
                {[['Asks', asks, 'ask', maxA], ['Bids', bids, 'bid', maxB]].map(([label, rows, side, max]) => (
                  <div key={label}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.68rem',
                      fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em',
                      color:'var(--muted)', marginBottom:'0.35rem' }}>
                      <span>{label}</span><span>Size</span>
                    </div>
                    {rows.length ? rows.map((r, i) => {
                      const w = max ? (parseFloat(r.size) / max * 100) : 0;
                      return (
                        <div key={i} style={{ display:'flex', justifyContent:'space-between',
                          fontSize:'0.78rem', padding:'0.2rem 0.3rem', borderRadius:4,
                          position:'relative', overflow:'hidden' }}>
                          <div style={{ position:'absolute', top:0, bottom:0, right:0, width:`${w}%`,
                            borderRadius:4, opacity:0.1,
                            background: side === 'ask' ? 'var(--red)' : 'var(--green)' }} />
                          <span style={{ fontWeight:700, position:'relative', zIndex:1,
                            color: side === 'ask' ? 'var(--red)' : 'var(--green)' }}>
                            {parseFloat(r.price).toFixed(3)}
                          </span>
                          <span style={{ color:'var(--muted)', position:'relative', zIndex:1, fontSize:'0.72rem' }}>
                            {parseFloat(r.size).toFixed(0)}
                          </span>
                        </div>
                      );
                    }) : <div style={{ fontSize:'0.78rem', color:'var(--muted)', textAlign:'center', padding:'0.5rem' }}>—</div>}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}

        {/* Trade buttons */}
        {tradeable.length > 0 && (
          <div style={{ display:'flex', gap:'0.5rem' }}>
            {tradeable.slice(0, 2).map((o, i) => (
              <button
                key={i}
                style={{
                  flex:1, padding:'0.7rem', borderRadius:99, fontSize:'0.85rem',
                  fontWeight:700, border:'1.5px solid', cursor:'pointer',
                  background: i === 0 ? '#dcfce7' : '#fef2f2',
                  color:       i === 0 ? 'var(--green)' : 'var(--red)',
                  borderColor: i === 0 ? '#86efac' : '#fca5a5',
                }}
                onClick={() => { onClose(); onTrade({ event, tokenID: o.tokenId, outcomeName: o.name, initialPrice: o.price }); }}
              >
                {i === 0 ? '🟢 Buy' : '🔴 Buy'} {o.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

const overlay = {
  position:'fixed', inset:0, zIndex:300,
  background:'rgba(0,0,0,0.45)', backdropFilter:'blur(4px)', WebkitBackdropFilter:'blur(4px)',
  animation:'fadeIn .2s ease',
};
const sheet = {
  position:'fixed', bottom:0, left:0, right:0, zIndex:301,
  background:'white', borderRadius:'20px 20px 0 0',
  padding:'0 1.25rem 2rem',
  paddingBottom:'max(2rem,env(safe-area-inset-bottom))',
  maxHeight:'90dvh', overflowY:'auto',
  animation:'slideUp .28s cubic-bezier(.33,1,.68,1)',
};
const handle = { width:36, height:4, borderRadius:2, background:'var(--border)', margin:'0.75rem auto 1rem' };
const closeBtn = {
  width:28, height:28, borderRadius:'50%', background:'var(--bg)',
  border:'none', cursor:'pointer', fontSize:'0.85rem', color:'var(--muted)',
  display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
};
const sectionLabel = { fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase',
  letterSpacing:'0.07em', color:'var(--muted)', marginBottom:'0.5rem' };
const statPill = {
  background:'var(--bg)', border:'1px solid var(--border)',
  borderRadius:99, padding:'0.2rem 0.6rem',
  fontSize:'0.72rem', fontWeight:600, color:'var(--muted)',
};
