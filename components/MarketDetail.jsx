import { useState, useEffect, useRef } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid,
} from 'recharts';

// ── Helpers ──────────────────────────────────────────────────────────
const parseArr = (s, fallback = []) => {
  if (Array.isArray(s)) return s;
  try { const r = JSON.parse(s); return Array.isArray(r) ? r : fallback; }
  catch { return fallback; }
};

const fmtVol = n => {
  if (!n || isNaN(n)) return '—';
  if (n >= 1e6) return `$${(n/1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n/1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};
const fmtCents = p => {
  const c = parseFloat(p) * 100;
  if (isNaN(c)) return '—';
  return `${c < 10 ? c.toFixed(1) : Math.round(c)}¢`;
};
const fmtDate = d => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}); }
  catch { return '—'; }
};

const INTERVALS  = ['1H','6H','1D','1W','1M','ALL'];
const IV_PARAM   = { '1H':'1h','6H':'6h','1D':'1d','1W':'1w','1M':'1m','ALL':'max' };
const COLORS     = ['#2563eb','#7c3aed','#e91e8c','#059669','#d97706','#dc2626','#0891b2'];

// ── Build outcome list directly from event markets ────────────────────
function buildOutcomes(event) {
  const markets = event.markets || [];
  if (!markets.length) return [];

  const rows = [];

  markets.forEach((m) => {
    const names   = parseArr(m.outcomes, ['Yes', 'No']);
    const prices  = parseArr(m.outcomePrices, []);
    const tokens  = parseArr(m.clobTokenIds, []);
    const lastP   = parseFloat(m.lastTradePrice);

    if (markets.length === 1) {
      // Single binary market — one row per outcome
      names.forEach((name, i) => {
        rows.push({
          name,
          question: m.question,
          price:    parseFloat(prices[i] ?? 0.5),
          tokenId:  tokens[i] || '',
          market:   m,
          isNo:     i === 1,
        });
      });
    } else {
      // Multi-outcome — one row per child market, showing YES outcome
      const yesPrice = isNaN(lastP) ? parseFloat(prices[0] ?? 0.5) : lastP;
      rows.push({
        name:     m.question || names[0] || 'Yes',
        question: m.question,
        price:    yesPrice,
        yesToken: tokens[0] || '',
        noToken:  tokens[1] || '',
        tokenId:  tokens[0] || '',
        market:   m,
        isMulti:  true,
      });
    }
  });

  return rows;
}

// ── Chart fetch ───────────────────────────────────────────────────────
async function fetchHistory(tokenId, ivParam) {
  const r = await fetch(`/api/prices-history?market=${tokenId}&interval=${ivParam}&fidelity=100`);
  const d = await r.json();
  return d.history || [];
}

// ── Custom Tooltip ────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'white', border:'1px solid #e5e7eb', borderRadius:8,
      padding:'0.5rem 0.75rem', fontSize:'0.72rem', boxShadow:'0 4px 12px rgba(0,0,0,0.1)' }}>
      <div style={{ color:'#9ca3af', marginBottom:'0.2rem', fontSize:'0.68rem' }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display:'flex', alignItems:'center', gap:'0.35rem' }}>
          <span style={{ width:7, height:7, borderRadius:'50%', background:p.color, display:'inline-block' }} />
          <span style={{ color:'#1e1b4b', maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {p.name}: <strong>{p.value}%</strong>
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────
export default function MarketDetail({ event, onClose, onTrade }) {
  const [interval, setIntervalVal] = useState('1W');
  const [chartData, setChartData]   = useState(null);
  const [chartErr, setChartErr]     = useState(false);
  const [chartLoading, setLoading]  = useState(true);
  const abortRef = useRef(null);

  const outcomes  = buildOutcomes(event);
  // For chart: show first 4 outcomes that have token IDs
  const chartable = outcomes.filter(o => o.tokenId && !o.isNo).slice(0, 4);

  const loadChart = async (iv) => {
    if (!chartable.length) { setLoading(false); return; }
    if (abortRef.current) abortRef.current = false;
    const token = {};
    abortRef.current = token;

    setLoading(true);
    setChartErr(false);
    setChartData(null);

    try {
      const ivParam = IV_PARAM[iv];
      const results = await Promise.all(
        chartable.map(o =>
          fetchHistory(o.tokenId, ivParam)
            .then(h => ({ name: o.isMulti ? (o.market.question?.replace(/^Will /i,'').replace(/\?$/,'').slice(0,30) || o.name) : o.name, history: h }))
            .catch(() => ({ name: o.name, history: [] }))
        )
      );

      if (token !== abortRef.current) return; // stale

      // If all histories empty, try 'max' as fallback
      const allEmpty = results.every(r => !r.history.length);
      if (allEmpty && iv !== 'ALL') {
        const fallback = await Promise.all(
          chartable.map(o =>
            fetchHistory(o.tokenId, 'max')
              .then(h => ({ name: results.find(r => r.name)?.name || o.name, history: h }))
              .catch(() => ({ name: o.name, history: [] }))
          )
        );
        if (token !== abortRef.current) return;
        buildAndSet(fallback);
        return;
      }
      buildAndSet(results);
    } catch (e) {
      if (token === abortRef.current) setChartErr(true);
    } finally {
      if (token === abortRef.current) setLoading(false);
    }
  };

  function buildAndSet(results) {
    const allTs = new Set();
    results.forEach(({ history }) => history.forEach(pt => allTs.add(pt.t)));
    const sorted = Array.from(allTs).sort((a, b) => a - b);

    // Downsample to ~60 points for perf
    const step = Math.max(1, Math.floor(sorted.length / 60));
    const sampled = sorted.filter((_, i) => i % step === 0 || i === sorted.length - 1);

    const names = results.map(r => r.name);
    const merged = sampled.map(t => {
      const d = new Date(t * 1000);
      const label = d.toLocaleDateString('en-US',{ month:'short', day:'numeric' });
      const row = { t, label };
      results.forEach(({ name, history }) => {
        const pt = history.find(h => h.t === t) || history.reduce((best, h) =>
          Math.abs(h.t - t) < Math.abs(best.t - t) ? h : best
        , history[0] || { t: 0, p: null });
        if (pt?.p !== null && pt?.p !== undefined) row[name] = parseFloat((pt.p * 100).toFixed(1));
      });
      return row;
    });

    // Forward-fill nulls
    names.forEach(name => {
      let last = null;
      merged.forEach(row => {
        if (row[name] !== undefined) last = row[name];
        else if (last !== null) row[name] = last;
      });
    });

    setChartData({ rows: merged, names });
  }

  useEffect(() => {
    loadChart('1W');
    return () => { abortRef.current = null; };
  }, [event.id]); // eslint-disable-line

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const isBinary = (event.markets || []).length === 1;
  const img      = event.image || event.icon;
  const totalVol = (event.markets || []).reduce((s, m) => s + (parseFloat(m.volume) || 0), 0);

  return (
    <>
      <div style={overlay} onClick={onClose} />
      <div style={sheet}>
        <div style={handle} />

        {/* Header */}
        <div style={{ display:'flex', gap:'0.75rem', alignItems:'flex-start',
          marginBottom:'0.75rem', paddingRight:'2.5rem', position:'relative' }}>
          {img && (
            <img src={img} alt="" style={{ width:40, height:40, borderRadius:10, objectFit:'cover', flexShrink:0 }}
              onError={e => e.target.style.display='none'} />
          )}
          <div>
            <div style={{ fontWeight:800, fontSize:'0.95rem', lineHeight:1.4 }}>{event.title}</div>
            {event.description && (
              <div style={{ fontSize:'0.72rem', color:'#6b7280', marginTop:'0.2rem',
                display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                {event.description}
              </div>
            )}
          </div>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>

        {/* Chart card */}
        <div style={{ background:'white', borderRadius:12, border:'1px solid #e5e7eb',
          marginBottom:'0.75rem', overflow:'hidden' }}>
          <div style={{ height:180, padding:'0.75rem 0 0.25rem 0' }}>
            {chartLoading ? (
              <div style={centerMuted}>Loading chart…</div>
            ) : chartErr || !chartData?.rows?.length ? (
              <div style={centerMuted}>No price history available</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData.rows} margin={{ top:4, right:8, left:-22, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="label" tick={{ fontSize:10, fill:'#9ca3af' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize:10, fill:'#9ca3af' }} tickLine={false} axisLine={false}
                    domain={[0, 100]} tickFormatter={v => `${v}%`} width={36} />
                  <Tooltip content={<ChartTooltip />} />
                  {chartData.names.map((name, i) => (
                    <Line key={name} type="monotone" dataKey={name}
                      stroke={COLORS[i % COLORS.length]} dot={false} strokeWidth={2} connectNulls />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Chart footer: vol + date + interval buttons */}
          <div style={{ padding:'0.5rem 0.75rem', borderTop:'1px solid #f3f4f6',
            display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'0.4rem' }}>
            <div style={{ fontSize:'0.7rem', color:'#6b7280', display:'flex', gap:'0.75rem', flexWrap:'wrap' }}>
              {totalVol > 0 && <span>🏆 {fmtVol(totalVol)}</span>}
              {event.endDate && <span>⏱ {fmtDate(event.endDate)}</span>}
            </div>
            <div style={{ display:'flex', gap:'2px' }}>
              {INTERVALS.map(iv => (
                <button key={iv}
                  style={{
                    padding:'0.2rem 0.42rem', borderRadius:6, fontSize:'0.7rem', fontWeight:600,
                    border:'none', cursor:'pointer', transition:'all .15s',
                    background: interval === iv ? '#7c3aed' : 'transparent',
                    color: interval === iv ? 'white' : '#6b7280',
                  }}
                  onClick={() => { setIntervalVal(iv); loadChart(iv); }}
                >{iv}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Outcome rows */}
        {outcomes.length === 0 ? (
          <div style={centerMuted}>No outcomes available</div>
        ) : isBinary ? (
          // ── Binary: two big "YES / NO" buttons ──
          <div style={{ background:'white', borderRadius:12, border:'1px solid #e5e7eb', padding:'0.85rem', marginBottom:'0.75rem' }}>
            {outcomes.filter(o => !o.isNo).map((yes, i) => {
              const no = outcomes.find(o => o.isNo && o.market === yes.market) || { price: 1 - yes.price, tokenId: parseArr(yes.market?.clobTokenIds)[1] || '' };
              return (
                <div key={i}>
                  <div style={{ fontWeight:700, fontSize:'0.85rem', marginBottom:'0.6rem' }}>
                    {yes.market?.question || event.title}
                  </div>
                  <div style={{ height:6, background:'#e5e7eb', borderRadius:99, overflow:'hidden', marginBottom:'0.6rem' }}>
                    <div style={{ height:'100%', width:`${Math.round(yes.price*100)}%`, borderRadius:99,
                      background:'linear-gradient(90deg,#e91e8c,#7c3aed)' }} />
                  </div>
                  <div style={{ display:'flex', gap:'0.5rem' }}>
                    <button style={{ ...bigTradeBtn, background:'#dcfce7', color:'#059669', borderColor:'#86efac' }}
                      onClick={() => { onClose(); onTrade({ event, tokenID: yes.tokenId, outcomeName:'Yes', initialPrice: yes.price }); }}>
                      <span style={{ fontSize:'1.1rem', fontWeight:900 }}>{Math.round(yes.price*100)}%</span>
                      <span style={{ fontSize:'0.72rem', fontWeight:600 }}>Buy Yes · {fmtCents(yes.price)}</span>
                    </button>
                    {no.tokenId && (
                      <button style={{ ...bigTradeBtn, background:'#fef2f2', color:'#dc2626', borderColor:'#fca5a5' }}
                        onClick={() => { onClose(); onTrade({ event, tokenID: no.tokenId, outcomeName:'No', initialPrice: no.price }); }}>
                        <span style={{ fontSize:'1.1rem', fontWeight:900 }}>{Math.round(no.price*100)}%</span>
                        <span style={{ fontSize:'0.72rem', fontWeight:600 }}>Buy No · {fmtCents(no.price)}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // ── Multi-outcome rows ──
          <div style={{ display:'flex', flexDirection:'column', gap:'0.4rem' }}>
            {outcomes.map((o, i) => {
              const yesPrice = o.price;
              const noPrice  = Math.max(0, 1 - yesPrice);
              const noToken  = o.noToken || parseArr(o.market?.clobTokenIds)[1] || '';
              const p        = Math.round(yesPrice * 100);
              const color    = yesPrice > 0.5 ? '#059669' : yesPrice < 0.1 ? '#9ca3af' : '#1e1b4b';
              const mImg     = o.market?.image || o.market?.icon;

              return (
                <div key={i} style={outcomeRow}>
                  <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', flex:1, minWidth:0 }}>
                    {mImg && (
                      <img src={mImg} alt="" style={{ width:32, height:32, borderRadius:8, objectFit:'cover', flexShrink:0 }}
                        onError={e => e.target.style.display='none'} />
                    )}
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontWeight:600, fontSize:'0.8rem',
                        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {o.name.replace(/^Will /i,'').replace(/\?$/,'').slice(0,40)}
                      </div>
                      {o.market?.volume > 0 && (
                        <div style={{ fontSize:'0.65rem', color:'#6b7280' }}>{fmtVol(o.market.volume)}</div>
                      )}
                    </div>
                  </div>

                  <div style={{ fontSize:'1.3rem', fontWeight:900, color, flexShrink:0, minWidth:52, textAlign:'center' }}>
                    {p < 1 ? '<1%' : p > 99 ? '>99%' : `${p}%`}
                  </div>

                  <div style={{ display:'flex', gap:'0.35rem', flexShrink:0 }}>
                    {o.tokenId ? (
                      <button
                        style={{ ...smBtn, background:'#dcfce7', color:'#059669', borderColor:'#86efac' }}
                        onClick={() => { onClose(); onTrade({ event, tokenID: o.tokenId, outcomeName: `${o.name} Yes`, initialPrice: yesPrice }); }}
                      >
                        Yes <span style={{ fontSize:'0.65rem' }}>{fmtCents(yesPrice)}</span>
                      </button>
                    ) : null}
                    {noToken ? (
                      <button
                        style={{ ...smBtn, background:'#fef2f2', color:'#dc2626', borderColor:'#fca5a5' }}
                        onClick={() => { onClose(); onTrade({ event, tokenID: noToken, outcomeName: `${o.name} No`, initialPrice: noPrice }); }}
                      >
                        No <span style={{ fontSize:'0.65rem' }}>{fmtCents(noPrice)}</span>
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────
const overlay = {
  position:'fixed', inset:0, zIndex:300,
  background:'rgba(0,0,0,0.5)', backdropFilter:'blur(4px)', WebkitBackdropFilter:'blur(4px)',
  animation:'fadeIn .18s ease',
};
const sheet = {
  position:'fixed', bottom:0, left:0, right:0, zIndex:301,
  background:'#faf5ff', borderRadius:'20px 20px 0 0',
  padding:'0 1rem 1.5rem',
  paddingBottom:'max(1.5rem,env(safe-area-inset-bottom))',
  maxHeight:'92dvh', overflowY:'auto',
  animation:'slideUp .28s cubic-bezier(.33,1,.68,1)',
};
const handle = { width:36, height:4, borderRadius:2, background:'#e5e7eb', margin:'0.75rem auto 1rem' };
const closeBtn = {
  position:'absolute', top:0, right:0,
  width:28, height:28, borderRadius:'50%',
  background:'white', border:'1px solid #e5e7eb',
  cursor:'pointer', fontSize:'0.8rem', color:'#6b7280',
  display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
};
const centerMuted = {
  height:'100%', display:'flex', alignItems:'center', justifyContent:'center',
  color:'#9ca3af', fontSize:'0.82rem',
};
const outcomeRow = {
  background:'white', borderRadius:10, padding:'0.65rem 0.75rem',
  border:'1px solid #e5e7eb',
  display:'flex', alignItems:'center', gap:'0.6rem',
};
const bigTradeBtn = {
  flex:1, padding:'0.65rem 0.5rem', borderRadius:10,
  border:'1.5px solid', cursor:'pointer',
  display:'flex', flexDirection:'column', alignItems:'center', gap:'1px',
  fontFamily:'inherit',
};
const smBtn = {
  padding:'0.35rem 0.55rem', borderRadius:7,
  fontSize:'0.78rem', fontWeight:700, border:'1.5px solid',
  cursor:'pointer', whiteSpace:'nowrap',
  display:'flex', flexDirection:'column', alignItems:'center', gap:'1px',
  fontFamily:'inherit',
};
