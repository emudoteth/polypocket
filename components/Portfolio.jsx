import { useState, useEffect } from 'react';

const fmtUSD  = n => n == null ? '—' : `$${Math.abs(parseFloat(n)).toFixed(2)}`;
const fmtPct  = n => n == null ? '—' : `${parseFloat(n) >= 0 ? '+' : ''}${parseFloat(n).toFixed(1)}%`;
const fmtSize = n => n == null ? '—' : parseFloat(n).toFixed(0);
const fmtDate = d => { try { return new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric'}); } catch { return '—'; } };

export default function Portfolio({ address, onTrade }) {
  const [positions, setPositions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('positions'); // positions | leaderboard

  const [leaderboard, setLeaderboard] = useState(null);
  const [lbLoading, setLbLoading] = useState(false);

  useEffect(() => {
    if (!address) return;
    loadPositions();
  }, [address]);

  async function loadPositions() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/positions?user=${address}&limit=50`);
      const data = await r.json();
      setPositions(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  async function loadLeaderboard() {
    if (leaderboard) return;
    setLbLoading(true);
    try {
      const r = await fetch('/api/leaderboard?category=OVERALL&limit=20');
      setLeaderboard(await r.json());
    } catch {}
    setLbLoading(false);
  }

  const handleTab = (t) => {
    setTab(t);
    if (t === 'leaderboard') loadLeaderboard();
  };

  // Filter out dust / $0 positions
  const activePositions = positions?.filter(p => parseFloat(p.currentValue) >= 0.01 && parseFloat(p.size) >= 0.01) || [];

  // Summary stats
  const totalValue     = activePositions.reduce((s, p) => s + (parseFloat(p.currentValue) || 0), 0) || 0;
  const totalPnl       = activePositions.reduce((s, p) => s + (parseFloat(p.cashPnl) || 0), 0) || 0;
  const totalRealized  = activePositions.reduce((s, p) => s + (parseFloat(p.realizedPnl) || 0), 0) || 0;
  const openCount      = activePositions.filter(p => !p.redeemable).length || 0;

  if (!address) return null;

  return (
    <div style={wrap}>
      {/* Header */}
      <div style={header}>
        <div style={{ fontWeight:800, fontSize:'0.9rem' }}>My Portfolio</div>
        <button onClick={loadPositions} style={refreshBtn} title="Refresh">↻</button>
      </div>

      {/* Summary strip */}
      {!loading && positions && positions.length > 0 && (
        <div style={summaryStrip}>
          <div style={summaryItem}>
            <div style={summaryVal}>${totalValue.toFixed(2)}</div>
            <div style={summaryLbl}>Portfolio Value</div>
          </div>
          <div style={summaryItem}>
            <div style={{ ...summaryVal, color: totalPnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
              {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
            </div>
            <div style={summaryLbl}>Unrealized P&L</div>
          </div>
          <div style={summaryItem}>
            <div style={{ ...summaryVal, color: totalRealized >= 0 ? 'var(--green)' : 'var(--red)' }}>
              {totalRealized >= 0 ? '+' : ''}${totalRealized.toFixed(2)}
            </div>
            <div style={summaryLbl}>Realized P&L</div>
          </div>
          <div style={summaryItem}>
            <div style={summaryVal}>{openCount}</div>
            <div style={summaryLbl}>Open Positions</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={tabBar}>
        {[['positions','Positions'], ['leaderboard','Leaderboard']].map(([t, label]) => (
          <button key={t}
            style={{ ...tabBtn, ...(tab === t ? tabActive : {}) }}
            onClick={() => handleTab(t)}
          >{label}</button>
        ))}
      </div>

      {/* Content */}
      <div style={content}>
        {tab === 'positions' && (
          loading ? (
            <div style={skels}>
              {Array(3).fill(0).map((_,i) => (
                <div key={i} style={skelRow}>
                  <div style={skelLine('32px','32px','8px')} />
                  <div style={{ flex:1 }}>
                    <div style={skelLine('11px','80%')} />
                    <div style={skelLine('10px','50%', '4px', '4px')} />
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={skelLine('13px','60px')} />
                    <div style={skelLine('10px','40px','4px','4px')} />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div style={emptyState}>Failed to load positions</div>
          ) : !activePositions.length ? (
            <div style={emptyState}>
              <div style={{ fontSize:'1.5rem', marginBottom:'0.5rem' }}>🫧</div>
              <div style={{ fontWeight:700, marginBottom:'0.25rem' }}>No open positions</div>
              <div style={{ fontSize:'0.78rem', color:'var(--muted)' }}>
                Your positions will appear here after trading.
              </div>
            </div>
          ) : (
            <div>
              {activePositions.map((p, i) => {
                const pnl      = parseFloat(p.cashPnl) || 0;
                const pnlPct   = parseFloat(p.percentPnl) || 0;
                const curVal   = parseFloat(p.currentValue) || 0;
                const curPrc   = parseFloat(p.curPrice) || 0;
                const avgPrc   = parseFloat(p.avgPrice) || 0;
                const isGreen  = pnl >= 0;
                const isYes    = p.outcome?.toLowerCase() === 'yes';
                // implied probability bar: curPrc 0→1
                const barPct   = Math.min(100, Math.max(0, curPrc * 100));

                return (
                  <div key={i} style={posRow}>
                    {/* Icon */}
                    {p.icon && (
                      <img src={p.icon} alt="" style={{ width:36, height:36, borderRadius:8, objectFit:'cover', flexShrink:0, marginTop:2 }}
                        onError={e => e.target.style.display='none'} />
                    )}

                    <div style={{ flex:1, minWidth:0 }}>
                      {/* Title + link */}
                      <div style={{ display:'flex', alignItems:'center', gap:'0.35rem', marginBottom:'0.2rem' }}>
                        <div style={{ fontSize:'0.8rem', fontWeight:700, overflow:'hidden',
                          textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>
                          {p.title}
                        </div>
                        <a href={`https://polymarket.com/event/${p.eventSlug}`}
                          target="_blank" rel="noreferrer"
                          style={{ fontSize:'0.65rem', color:'var(--purple)', textDecoration:'none',
                            border:'1px solid var(--purple)', borderRadius:4, padding:'0.1rem 0.3rem',
                            flexShrink:0, whiteSpace:'nowrap' }}>
                          ↗ Market
                        </a>
                      </div>

                      {/* Chips */}
                      <div style={{ display:'flex', gap:'0.35rem', flexWrap:'wrap', marginBottom:'0.4rem' }}>
                        <span style={outcomeBadge(p.outcome)}>{p.outcome}</span>
                        <span style={metaChip}>{fmtSize(p.size)} shares</span>
                        <span style={metaChip}>avg {(avgPrc*100).toFixed(1)}¢</span>
                        {p.endDate && <span style={metaChip}>⏱ {fmtDate(p.endDate)}</span>}
                        {p.negativeRisk && <span style={{ ...metaChip, color:'var(--purple)', borderColor:'var(--purple)' }}>neg-risk</span>}
                      </div>

                      {/* Market price bar */}
                      <div style={{ marginBottom:'0.3rem' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'0.18rem' }}>
                          <span style={{ fontSize:'0.65rem', color:'var(--muted)' }}>
                            Current market: <strong style={{ color: isYes ? 'var(--green)' : 'var(--red)' }}>{barPct.toFixed(1)}¢</strong>
                          </span>
                          <span style={{ fontSize:'0.65rem', color:'var(--muted)' }}>
                            entry {(avgPrc*100).toFixed(1)}¢
                            {' '}<span style={{ color: isGreen ? 'var(--green)' : 'var(--red)', fontWeight:700 }}>
                              {isGreen ? '▲' : '▼'} {Math.abs(curPrc - avgPrc < 0 ? (avgPrc - curPrc)*100 : (curPrc - avgPrc)*100).toFixed(1)}¢
                            </span>
                          </span>
                        </div>
                        <div style={{ height:5, borderRadius:3, background:'var(--bg)', overflow:'hidden', position:'relative' }}>
                          {/* Entry marker */}
                          <div style={{ position:'absolute', top:0, bottom:0, left:`${(avgPrc*100)}%`,
                            width:2, background:'var(--muted)', zIndex:2, transform:'translateX(-50%)' }} />
                          {/* Current price fill */}
                          <div style={{ height:'100%', width:`${barPct}%`,
                            background: isYes ? 'var(--green)' : 'var(--red)',
                            borderRadius:3, transition:'width .4s ease' }} />
                        </div>
                      </div>
                    </div>

                    {/* Right col: value + P&L */}
                    <div style={{ textAlign:'right', flexShrink:0, minWidth:72 }}>
                      <div style={{ fontSize:'0.9rem', fontWeight:800 }}>${curVal.toFixed(2)}</div>
                      <div style={{ fontSize:'0.72rem', fontWeight:700,
                        color: isGreen ? 'var(--green)' : 'var(--red)' }}>
                        {isGreen ? '+' : ''}{fmtUSD(pnl)}
                      </div>
                      <div style={{ fontSize:'0.68rem', color: isGreen ? 'var(--green)' : 'var(--red)' }}>
                        ({fmtPct(pnlPct)})
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {tab === 'leaderboard' && (
          lbLoading ? (
            <div style={emptyState}>Loading leaderboard…</div>
          ) : !leaderboard?.length ? (
            <div style={emptyState}>No leaderboard data</div>
          ) : (
            <div>
              {leaderboard.map((trader, i) => (
                <div key={i} style={posRow}>
                  <div style={{ fontSize:'0.9rem', fontWeight:800, color:'var(--muted)',
                    minWidth:28, flexShrink:0 }}>
                    #{trader.rank}
                  </div>
                  <div style={{ display:'flex', gap:'0.5rem', alignItems:'center', flex:1, minWidth:0 }}>
                    {trader.profileImage ? (
                      <img src={trader.profileImage} alt="" style={{ width:32, height:32, borderRadius:'50%', objectFit:'cover', flexShrink:0 }}
                        onError={e => e.target.style.display='none'} />
                    ) : (
                      <div style={{ width:32, height:32, borderRadius:'50%', background:'var(--lilac)',
                        display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.9rem', flexShrink:0 }}>
                        🫧
                      </div>
                    )}
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:'0.82rem', fontWeight:700,
                        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {trader.userName || trader.proxyWallet?.slice(0,10)+'…'}
                      </div>
                      <div style={{ fontSize:'0.68rem', color:'var(--muted)' }}>
                        Vol: ${(parseFloat(trader.vol)/1000).toFixed(0)}K
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontSize:'0.88rem', fontWeight:800,
                      color: parseFloat(trader.pnl) >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {parseFloat(trader.pnl) >= 0 ? '+' : ''}${(parseFloat(trader.pnl)/1000).toFixed(1)}K
                    </div>
                    <div style={{ fontSize:'0.68rem', color:'var(--muted)' }}>P&L</div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}

// ── Styles ──────────────────────────────────────────────────────────
const wrap = {
  background:'white', borderRadius:14, border:'1.5px solid var(--border)',
  overflow:'hidden', marginBottom:'0.75rem',
};
const header = {
  display:'flex', justifyContent:'space-between', alignItems:'center',
  padding:'0.75rem 1rem', borderBottom:'1px solid var(--border)',
};
const refreshBtn = {
  background:'none', border:'none', cursor:'pointer',
  fontSize:'1rem', color:'var(--muted)', padding:'0.2rem',
};
const summaryStrip = {
  display:'flex', overflowX:'auto', scrollbarWidth:'none',
  borderBottom:'1px solid var(--border)',
};
const summaryItem = {
  flex:'0 0 auto', padding:'0.65rem 1rem', textAlign:'center',
  borderRight:'1px solid var(--border)',
};
const summaryVal = { fontSize:'1rem', fontWeight:800, whiteSpace:'nowrap' };
const summaryLbl = { fontSize:'0.62rem', color:'var(--muted)', fontWeight:500, whiteSpace:'nowrap', marginTop:1 };
const tabBar = {
  display:'flex', borderBottom:'1px solid var(--border)',
};
const tabBtn = {
  flex:1, padding:'0.55rem', fontSize:'0.8rem', fontWeight:600,
  border:'none', cursor:'pointer', background:'white',
  color:'var(--muted)', borderBottom:'2px solid transparent',
  transition:'all .18s', fontFamily:'inherit',
};
const tabActive = {
  color:'var(--purple)', borderBottomColor:'var(--purple)',
};
const content = { maxHeight:360, overflowY:'auto' };
const posRow = {
  display:'flex', gap:'0.75rem', alignItems:'flex-start',
  padding:'0.75rem 1rem', borderBottom:'1px solid #fafafa',
};
const skels = { padding:'0.5rem 0' };
const skelRow = { display:'flex', gap:'0.6rem', padding:'0.6rem 1rem', alignItems:'flex-start' };
const skelLine = (h, w, br='6px', mt='4px') => ({
  height:h, width:w, borderRadius:br, marginTop:mt,
  background:'linear-gradient(90deg,#f0e8ff 25%,#e8d8ff 50%,#f0e8ff 75%)',
  backgroundSize:'200% 100%', animation:'shimmer 1.4s infinite',
});
const emptyState = {
  padding:'2rem 1rem', textAlign:'center', color:'var(--muted)', fontSize:'0.85rem',
};
const outcomeBadge = (outcome) => ({
  display:'inline-flex', alignItems:'center',
  fontSize:'0.65rem', fontWeight:700, padding:'0.12rem 0.4rem', borderRadius:4,
  background: outcome?.toLowerCase() === 'yes' ? '#dcfce7' : outcome?.toLowerCase() === 'no' ? '#fef2f2' : 'var(--lilac)',
  color: outcome?.toLowerCase() === 'yes' ? 'var(--green)' : outcome?.toLowerCase() === 'no' ? 'var(--red)' : 'var(--purple)',
});
const metaChip = {
  display:'inline-flex', alignItems:'center',
  fontSize:'0.65rem', color:'var(--muted)', background:'var(--bg)',
  padding:'0.1rem 0.35rem', borderRadius:4, border:'1px solid var(--border)',
};
