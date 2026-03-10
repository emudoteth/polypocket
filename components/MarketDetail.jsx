import { useState, useEffect, useCallback } from 'react';
import { parseOutcomes } from './MarketCard';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, Legend, CartesianGrid,
} from 'recharts';

const INTERVALS = ['1H','6H','1D','1W','1M','ALL'];
const intervalParam = { '1H':'1h','6H':'6h','1D':'1d','1W':'1w','1M':'1m','ALL':'max' };
const COLORS = ['#2563eb','#7c3aed','#e91e8c','#059669','#d97706','#dc2626'];

const fmtVol = n => {
  if (!n || isNaN(n)) return '—';
  if (n >= 1e6) return `$${(n/1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n/1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};
const fmtCents = p => {
  if (p === null || p === undefined || isNaN(p)) return '—';
  const c = parseFloat(p) * 100;
  return c < 1 ? `${c.toFixed(1)}¢` : `${c.toFixed(1)}¢`;
};
const fmtPct = p => {
  const n = parseFloat(p);
  if (isNaN(n)) return '—';
  if (n < 0.01) return '<1%';
  if (n > 0.99) return '>99%';
  return `${Math.round(n * 100)}%`;
};
const fmtDate = d => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
};
const fmtChartTs = t => {
  const d = new Date(t * 1000);
  return d.toLocaleDateString('en-US', { month:'short', day:'numeric' });
};

export default function MarketDetail({ event, onClose, onTrade }) {
  const [interval, setInterval] = useState('1W');
  const [chartData, setChartData] = useState(null);
  const [chartLoading, setChartLoading] = useState(false);

  const markets  = event.markets || [];
  const outcomes = parseOutcomes(event);
  const tradeable = outcomes.filter(o => o.tokenId && o.price !== null);

  // Fetch price history for ALL tradeable outcomes
  const loadChart = useCallback(async (iv) => {
    if (!tradeable.length) return;
    setChartLoading(true);
    setChartData(null);
    try {
      const results = await Promise.all(
        tradeable.slice(0, 4).map(o =>
          fetch(`/api/prices-history?market=${o.tokenId}&interval=${intervalParam[iv]}&fidelity=100`)
            .then(r => r.json())
            .then(d => ({ name: o.name, history: d.history || [] }))
        )
      );

      // Merge all histories onto a common time axis
      const allTs = new Set();
      results.forEach(({ history }) => history.forEach(pt => allTs.add(pt.t)));
      const sorted = Array.from(allTs).sort((a, b) => a - b);

      // Build merged rows
      const merged = sorted.map(t => {
        const row = { t, label: fmtChartTs(t) };
        results.forEach(({ name, history }) => {
          const pt = history.find(h => h.t === t);
          if (pt) row[name] = parseFloat((pt.p * 100).toFixed(1));
        });
        return row;
      });

      // Forward-fill gaps
      const names = results.map(r => r.name);
      const filled = merged.map((row, i) => {
        const out = { ...row };
        names.forEach(name => {
          if (out[name] === undefined && i > 0) out[name] = merged[i-1][name];
        });
        return out;
      });

      setChartData({ rows: filled, names, results });
    } catch {}
    setChartLoading(false);
  }, [event.id, tradeable.length]); // eslint-disable-line

  useEffect(() => { loadChart('1W'); }, [event.id]); // eslint-disable-line

  const handleInterval = (iv) => { setInterval(iv); loadChart(iv); };

  // Close on Escape
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const img = event.image || event.icon;

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background:'white', border:'1px solid var(--border)', borderRadius:8,
        padding:'0.5rem 0.75rem', fontSize:'0.75rem', boxShadow:'0 4px 12px rgba(0,0,0,0.1)' }}>
        <div style={{ color:'var(--muted)', marginBottom:'0.25rem' }}>{label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ display:'flex', gap:'0.5rem', alignItems:'center' }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background:p.color, display:'inline-block' }} />
            <span style={{ color:'var(--text)' }}>{p.name}: <strong>{p.value}%</strong></span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <div style={overlay} onClick={onClose} />
      <div style={sheet}>
        <div style={handle} />

        {/* Header */}
        <div style={{ display:'flex', gap:'0.75rem', alignItems:'flex-start', marginBottom:'1rem',
          paddingRight:'2rem', position:'relative' }}>
          {img && (
            <img src={img} alt="" style={{ width:44, height:44, borderRadius:10, objectFit:'cover', flexShrink:0 }}
              onError={e => e.target.style.display='none'} />
          )}
          <div>
            <div style={{ fontWeight:800, fontSize:'0.95rem', lineHeight:1.4 }}>{event.title}</div>
            {event.description && (
              <div style={{ fontSize:'0.75rem', color:'var(--muted)', marginTop:'0.2rem',
                display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                {event.description}
              </div>
            )}
          </div>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>

        {/* Chart */}
        <div style={{ background:'white', borderRadius:12, marginBottom:'0.75rem',
          border:'1px solid var(--border)', overflow:'hidden' }}>
          <div style={{ padding:'0.75rem 1rem 0', height: chartLoading ? 180 : 200 }}>
            {chartLoading ? (
              <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center',
                color:'var(--muted)', fontSize:'0.82rem' }}>Loading chart…</div>
            ) : chartData?.rows?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData.rows} margin={{ top:4, right:8, left:-20, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize:10, fill:'#9ca3af' }} tickLine={false} axisLine={false}
                    interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize:10, fill:'#9ca3af' }} tickLine={false} axisLine={false}
                    domain={[0, 100]} tickFormatter={v => `${v}%`} width={36} />
                  <Tooltip content={<CustomTooltip />} />
                  {chartData.names.map((name, i) => (
                    <Line key={name} type="monotone" dataKey={name} stroke={COLORS[i % COLORS.length]}
                      dot={false} strokeWidth={2} connectNulls />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center',
                color:'var(--muted)', fontSize:'0.82rem' }}>No price history available</div>
            )}
          </div>

          {/* Time range + meta */}
          <div style={{ padding:'0.6rem 1rem', borderTop:'1px solid var(--border)',
            display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'0.5rem' }}>
            <div style={{ fontSize:'0.72rem', color:'var(--muted)', display:'flex', gap:'0.75rem' }}>
              <span>🏆 {fmtVol(event.volume)}</span>
              {event.endDate && <span>⏱ {fmtDate(event.endDate)}</span>}
            </div>
            <div style={{ display:'flex', gap:'0.25rem' }}>
              {INTERVALS.map(iv => (
                <button key={iv}
                  style={{
                    padding:'0.2rem 0.45rem', borderRadius:6, fontSize:'0.72rem', fontWeight:600,
                    border:'none', cursor:'pointer', transition:'all .15s',
                    background: interval === iv ? 'var(--purple)' : 'transparent',
                    color: interval === iv ? 'white' : 'var(--muted)',
                  }}
                  onClick={() => handleInterval(iv)}
                >{iv}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Outcome rows */}
        <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem', marginBottom:'1rem' }}>
          {tradeable.map((o, i) => {
            const market = markets.length === 1 ? markets[0] : markets[i];
            const marketVol = market ? (parseFloat(market.volume) || 0) : 0;
            const yesPrice = o.price;
            const noPrice  = 1 - yesPrice;
            const tokens   = (() => {
              if (!market) return [o.tokenId, ''];
              const arr = Array.isArray(market.clobTokenIds)
                ? market.clobTokenIds
                : (() => { try { return JSON.parse(market.clobTokenIds || '[]'); } catch { return []; } })();
              return [arr[0] || o.tokenId, arr[1] || ''];
            })();

            return (
              <div key={i} style={outcomeRow}>
                <div style={{ display:'flex', alignItems:'center', gap:'0.6rem', flex:1, minWidth:0 }}>
                  {(market?.image || market?.icon) && (
                    <img src={market.image || market.icon} alt="" style={{ width:32, height:32, borderRadius:8, objectFit:'cover', flexShrink:0 }}
                      onError={e => e.target.style.display='none'} />
                  )}
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:'0.85rem',
                      whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {o.name}
                    </div>
                    {marketVol > 0 && (
                      <div style={{ fontSize:'0.7rem', color:'var(--muted)' }}>{fmtVol(marketVol)} Vol</div>
                    )}
                  </div>
                </div>

                <div style={{ fontSize:'1.5rem', fontWeight:900, color: yesPrice > 0.5 ? 'var(--text)' : 'var(--muted)',
                  minWidth:64, textAlign:'center', flexShrink:0 }}>
                  {fmtPct(yesPrice)}
                </div>

                <div style={{ display:'flex', gap:'0.4rem', flexShrink:0 }}>
                  <button
                    style={{ ...tradeBtnBase, background:'#dcfce7', color:'var(--green)', borderColor:'#86efac' }}
                    onClick={() => onTrade({ event, tokenID: tokens[0], outcomeName: `${o.name} YES`, initialPrice: yesPrice })}
                  >
                    Buy Yes <span style={{ fontWeight:400, fontSize:'0.72rem' }}>{fmtCents(yesPrice)}</span>
                  </button>
                  {tokens[1] && (
                    <button
                      style={{ ...tradeBtnBase, background:'#fef2f2', color:'var(--red)', borderColor:'#fca5a5' }}
                      onClick={() => onTrade({ event, tokenID: tokens[1], outcomeName: `${o.name} NO`, initialPrice: noPrice })}
                    >
                      Buy No <span style={{ fontWeight:400, fontSize:'0.72rem' }}>{fmtCents(noPrice)}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ── Styles ──
const overlay = {
  position:'fixed', inset:0, zIndex:300,
  background:'rgba(0,0,0,0.5)', backdropFilter:'blur(4px)', WebkitBackdropFilter:'blur(4px)',
  animation:'fadeIn .2s ease',
};
const sheet = {
  position:'fixed', bottom:0, left:0, right:0, zIndex:301,
  background:'var(--bg)', borderRadius:'20px 20px 0 0',
  padding:'0 1rem 1.5rem',
  paddingBottom:'max(1.5rem,env(safe-area-inset-bottom))',
  maxHeight:'92dvh', overflowY:'auto',
  animation:'slideUp .3s cubic-bezier(.33,1,.68,1)',
};
const handle = {
  width:36, height:4, borderRadius:2,
  background:'var(--border)', margin:'0.75rem auto 1rem',
};
const closeBtn = {
  position:'absolute', top:0, right:0,
  width:28, height:28, borderRadius:'50%',
  background:'white', border:'1px solid var(--border)',
  cursor:'pointer', fontSize:'0.8rem', color:'var(--muted)',
  display:'flex', alignItems:'center', justifyContent:'center',
};
const outcomeRow = {
  background:'white', borderRadius:12, padding:'0.75rem',
  border:'1px solid var(--border)',
  display:'flex', alignItems:'center', gap:'0.75rem', flexWrap:'wrap',
};
const tradeBtnBase = {
  padding:'0.45rem 0.65rem', borderRadius:8,
  fontSize:'0.8rem', fontWeight:700, border:'1.5px solid',
  cursor:'pointer', whiteSpace:'nowrap', lineHeight:1.3,
  display:'flex', flexDirection:'column', alignItems:'center',
};
