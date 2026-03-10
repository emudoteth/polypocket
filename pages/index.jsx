// cache-bust: 1773157374
import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useWallet } from '../hooks/useWallet';
import WalletButton from '../components/WalletButton';
import TradeModal from '../components/TradeModal';
import Portfolio from '../components/Portfolio';
import MarketCard from '../components/MarketCard';
import MarketDetail from '../components/MarketDetail';

const PAGE = 48;

// ── Helpers ──
const fmtVol = n => {
  if (!n || isNaN(n)) return '—';
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};
const pct = v => { const n = parseFloat(v); return isNaN(n) ? '—' : `${Math.round(n * 100)}%`; };
const tagEmoji = slug => ({
  politics:'🗳️', sports:'🏆', crypto:'🔮', finance:'📈', geopolitics:'🌐',
  tech:'💻', culture:'🎭', economy:'💰', iran:'🌍', elections:'🗳️',
  entertainment:'🎬', nfl:'🏈', nba:'🏀', 'climate-science':'🌦️',
}[slug] || '🦁');

const CATEGORIES = [
  { tag:'all', label:'🌐 All' }, { tag:'politics', label:'🗳️ Politics' },
  { tag:'sports', label:'🏆 Sports' }, { tag:'crypto', label:'🔮 Crypto' },
  { tag:'iran', label:'🌍 Iran' }, { tag:'finance', label:'📈 Finance' },
  { tag:'geopolitics', label:'🌐 Geopolitics' }, { tag:'tech', label:'💻 Tech' },
  { tag:'culture', label:'🎭 Culture' }, { tag:'economy', label:'💰 Economy' },
  { tag:'climate-science', label:'🌦️ Climate' }, { tag:'elections', label:'🗳️ Elections' },
  { tag:'entertainment', label:'🎬 Entertainment' }, { tag:'nfl', label:'🏈 NFL' },
  { tag:'nba', label:'🏀 NBA' },
];

// ── Main Page ──
export default function Home() {
  const { isConnected, address } = useWallet();
  const [events, setEvents] = useState([]);
  const [tag, setTag] = useState('all');
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [exhausted, setExhausted] = useState(false);
  const [search, setSearch] = useState('');
  const [tradeTarget, setTradeTarget] = useState(null);
  const [detailEvent, setDetailEvent] = useState(null);
  const [stats, setStats] = useState({ loaded: 0, vol: '—', apiMs: null });

  const loadEvents = useCallback(async (reset = false) => {
    setLoading(true);
    const off = reset ? 0 : offset;
    try {
      const params = new URLSearchParams({ tag, offset: off, limit: PAGE });
      const t0 = performance.now();
      const res = await fetch(`/api/events?${params}`);
      const data = await res.json();
      const next = reset ? data : [...events, ...data];
      setEvents(next);
      setOffset(off + data.length);
      setExhausted(data.length < PAGE);
      const vol = next.reduce((s, e) => s + (parseFloat(e.volume24hr) || 0), 0);
      setStats({ loaded: next.length, vol: fmtVol(vol), apiMs: Math.round(performance.now() - t0) });
    } catch {}
    setLoading(false);
  }, [tag, offset, events]);

  useEffect(() => { loadEvents(true); }, [tag]); // eslint-disable-line

  // Auto-refresh every 60s
  useEffect(() => {
    const id = setInterval(() => loadEvents(true), 60_000);
    return () => clearInterval(id);
  }, [tag]); // eslint-disable-line

  const filtered = search
    ? events.filter(e => (e.title || '').toLowerCase().includes(search.toLowerCase()) ||
        (e.tags || []).some(t => (t.label || '').toLowerCase().includes(search.toLowerCase())))
    : events;

  return (
    <>
      <Head>
        <title>PolyPocket — The whole prediction market, in your pocket</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#7c3aed" />
        <link rel="shortcut icon" href="/logo.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/logo.png" />
        <link rel="apple-touch-icon" href="/logo.png" />
      </Head>

      {/* NAV */}
      <nav style={navStyle}>
        <a href="#" style={logoStyle}>
            <span style={{ fontSize:'1.5rem', lineHeight:1, flexShrink:0 }}>🦁</span>
            PolyPocket
          </a>
        <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
          <span style={{ fontSize:'0.72rem', fontWeight:600, color:'var(--green)',
            display:'flex', alignItems:'center', gap:4 }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--green)',
              display:'inline-block', animation:'pulse 2s infinite' }} />
            Live
          </span>
          <WalletButton />
        </div>
      </nav>

      {/* HERO */}
      <section style={heroStyle}>
        <div style={heroBadge}>✨ Live · No Paid Key · Powered by Polymarket</div>
        <h1 style={h1Style}>
          <span style={{ fontSize:'3.2rem', verticalAlign:'middle', marginRight:'0.35rem', display:'inline-block', lineHeight:1 }}>🦁</span>
          PolyPocket
        </h1>
        <p style={heroSub}>
          The whole prediction market, <strong style={{ color:'var(--purple)' }}>in your pocket.</strong>
          {' '}Live markets, real-time prices, and order book depth — with wallet-native trading.
        </p>
        <div style={{ display:'flex', gap:'0.75rem', justifyContent:'center', flexWrap:'wrap' }}>
          <a href="#markets" style={btnPrimary}>Browse Live Markets →</a>
          <a href="https://github.com/emudoteth/polypocket" target="_blank" rel="noopener" style={btnGhost}>View Source</a>
        </div>
      </section>

      {/* STATS */}
      <div style={statsBar}>
        {[
          [stats.loaded, 'Markets Loaded'],
          [stats.apiMs != null ? `${stats.apiMs}ms` : '—', 'API Latency'],
          ['14', 'Categories'],
          ['Polygon', 'Network'],
        ].map(([n, l]) => (
          <div key={l} style={{ textAlign:'center', padding:'0.85rem 1rem', borderRight:'1px solid var(--border)' }}>
            <div style={{ fontSize:'1.1rem', fontWeight:800, background:'linear-gradient(135deg,var(--pink),var(--purple))',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', whiteSpace:'nowrap' }}>{n}</div>
            <div style={{ fontSize:'0.68rem', color:'var(--muted)', fontWeight:500, whiteSpace:'nowrap' }}>{l}</div>
          </div>
        ))}
      </div>

      {/* CATEGORY RAIL */}
      <div id="markets" style={{ position:'sticky', top:52, zIndex:100, background:'white', borderBottom:'1px solid var(--border)' }}>
        <div style={{ display:'flex', gap:'0.4rem', overflowX:'auto', scrollbarWidth:'none',
          padding:'0.6rem 1rem', paddingLeft:'max(1rem, env(safe-area-inset-left))',
          paddingRight:'max(1rem, env(safe-area-inset-right))' }}>
          {CATEGORIES.map(({ tag: t, label }) => (
            <button key={t}
              style={{
                flexShrink:0, padding:'0.38rem 0.9rem', borderRadius:99,
                fontSize:'0.8rem', fontWeight:600, whiteSpace:'nowrap', cursor:'pointer',
                border:'1.5px solid', transition:'all .18s',
                background: tag === t ? 'var(--purple)' : 'white',
                borderColor: tag === t ? 'var(--purple)' : 'var(--border)',
                color: tag === t ? 'white' : 'var(--muted)',
              }}
              onClick={() => setTag(t)}
            >{label}</button>
          ))}
        </div>
      </div>

      {/* SEARCH */}
      <div style={{ padding:'0.75rem 1rem', paddingLeft:'max(1rem,env(safe-area-inset-left))', paddingRight:'max(1rem,env(safe-area-inset-right))' }}>
        <input
          style={searchStyle}
          type="search" placeholder="Search markets…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* PORTFOLIO — only when wallet connected */}
      {isConnected && address && (
        <div style={{ padding:'0 0.75rem', paddingLeft:'max(0.75rem,env(safe-area-inset-left))', paddingRight:'max(0.75rem,env(safe-area-inset-right))' }}>
          <Portfolio address={address} onTrade={setTradeTarget} />
        </div>
      )}

      {/* GRID */}
      <div style={{ padding:'0 0.75rem 1.5rem', paddingLeft:'max(0.75rem,env(safe-area-inset-left))',
        paddingRight:'max(0.75rem,env(safe-area-inset-right))' }}>
        {loading && events.length === 0 ? (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:'0.75rem' }}>
            {Array(6).fill(0).map((_, i) => (
              <div key={i} style={{ background:'white', border:'1.5px solid var(--border)', borderRadius:14, padding:'1rem', display:'flex', flexDirection:'column', gap:'0.75rem' }}>
                {[['40px','40px','10px'], ['13px','90%'], ['13px','65%'], ['6px','100%']].map(([h, w, r], j) => (
                  <div key={j} style={{ height:h, width:w, borderRadius:r||6,
                    background:'linear-gradient(90deg,#f0e8ff 25%,#e8d8ff 50%,#f0e8ff 75%)',
                    backgroundSize:'200% 100%', animation:'shimmer 1.4s infinite' }} />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:'0.75rem' }}>
              {filtered.map(ev => (
                <MarketCard key={ev.id} event={ev} onTrade={setTradeTarget} onDetails={setDetailEvent} />
              ))}
              {filtered.length === 0 && !loading && (
                <div style={{ gridColumn:'1/-1', textAlign:'center', padding:'2rem', color:'var(--muted)', fontSize:'.88rem' }}>
                  No markets found.
                </div>
              )}
            </div>
            {!exhausted && !search && (
              <div style={{ textAlign:'center', padding:'1.25rem' }}>
                <button
                  style={{ background:'white', color:'var(--purple)', fontWeight:700, fontSize:'0.88rem',
                    padding:'0.65rem 2rem', borderRadius:99, border:'1.5px solid var(--lavender)', cursor:'pointer' }}
                  disabled={loading}
                  onClick={() => loadEvents(false)}
                >{loading ? 'Loading…' : 'Load More Markets'}</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* API STRIP */}
      <div style={{ margin:'0 0.75rem', background:'linear-gradient(135deg,#1e1b4b,#312e81)',
        borderRadius:14, padding:'1.5rem', marginBottom:'0.75rem' }}>
        <div style={{ fontSize:'0.95rem', fontWeight:800, color:'white', marginBottom:'0.25rem' }}>
          Built on the Polymarket CLOB API
        </div>
        <p style={{ fontSize:'0.78rem', color:'var(--lavender)', marginBottom:'1rem' }}>
          Every number is live. Wallet-native signing via RainbowKit — your keys never leave your device.
        </p>
        <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
          {[
            ['gamma-api.polymarket.com/events', 'Active events with tags, prices, volumes. Paginated with offset + tag_slug.', 'https://docs.polymarket.com/api-reference/events/list-events'],
            ['clob.polymarket.com/book?token_id=…', 'Real-time order book depth (bids + asks) for any outcome token.', 'https://docs.polymarket.com/api-reference/market-data/get-order-book'],
            ['clob.polymarket.com → createAndPostOrder()', 'EIP-712 signed orders — user signs locally, never shared.', 'https://docs.polymarket.com/api-reference/clients-sdks'],
          ].map(([path, desc, link]) => (
            <div key={path} style={{ display:'flex', gap:'0.6rem', alignItems:'flex-start',
              background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)',
              borderRadius:10, padding:'0.6rem 0.8rem' }}>
              <span style={{ fontSize:'0.62rem', fontWeight:800, letterSpacing:'0.07em',
                color:'#a5b4fc', background:'rgba(165,180,252,0.15)', padding:'0.12rem 0.45rem',
                borderRadius:4, whiteSpace:'nowrap', marginTop:1 }}>GET</span>
              <div>
                <div style={{ fontSize:'0.75rem', fontFamily:'monospace', color:'white', fontWeight:600 }}>{path}</div>
                <div style={{ fontSize:'0.7rem', color:'var(--lavender)', marginTop:'0.15rem' }}>{desc}</div>
                <a href={link} target="_blank" rel="noopener" style={{ fontSize:'0.65rem', color:'#c4b5fd', textDecoration:'none' }}>→ docs</a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FOOTER */}
      <footer style={{ textAlign:'center', padding:'2rem 1rem 1.5rem',
        borderTop:'1px solid var(--border)', background:'white',
        paddingBottom:'max(1.5rem,env(safe-area-inset-bottom))' }}>
        <div style={{ fontSize:'1rem', fontWeight:900, marginBottom:'0.4rem',
          background:'linear-gradient(135deg,var(--pink),var(--purple))',
          WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
          🦁 PolyPocket
        </div>
        <p style={{ fontSize:'0.75rem', color:'var(--muted)', maxWidth:420, margin:'0 auto 0.75rem', lineHeight:1.6 }}>
          A proof-of-concept integration built on the Polymarket CLOB API. All trading uses your connected wallet — non-custodial, on Polygon.
        </p>
        <div style={{ display:'flex', gap:'1.25rem', justifyContent:'center', flexWrap:'wrap' }}>
          {[['GitHub', 'https://github.com/emudoteth/polypocket'],
            ['Docs', 'https://docs.polymarket.com'],
            ['Polymarket', 'https://polymarket.com']].map(([label, href]) => (
            <a key={label} href={href} target="_blank" rel="noopener"
              style={{ fontSize:'0.75rem', color:'var(--muted)', textDecoration:'none', fontWeight:500 }}>
              {label}
            </a>
          ))}
        </div>
      </footer>

      {/* DETAIL MODAL */}
      {detailEvent && (
        <MarketDetail event={detailEvent} onClose={() => setDetailEvent(null)} onTrade={t => { setDetailEvent(null); setTradeTarget(t); }} />
      )}

      {/* TRADE MODAL */}
      {tradeTarget && (
        <TradeModal {...tradeTarget} onClose={() => setTradeTarget(null)} />
      )}
    </>
  );
}

// ── Styles ──
const navStyle = {
  position:'sticky', top:0, zIndex:200,
  background:'rgba(255,255,255,0.92)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)',
  borderBottom:'1px solid var(--border)',
  padding:'0 1rem', height:52,
  display:'flex', alignItems:'center', justifyContent:'space-between',
  paddingLeft:'max(1rem,env(safe-area-inset-left))',
  paddingRight:'max(1rem,env(safe-area-inset-right))',
};
const logoStyle = {
  fontSize:'1.15rem', fontWeight:900, letterSpacing:'-0.02em',
  background:'linear-gradient(135deg,var(--pink),var(--purple))',
  WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
  backgroundClip:'text', textDecoration:'none',
};
const heroStyle = {
  background:'linear-gradient(160deg,#fdf4ff 0%,#ede9fe 55%,#fce7f3 100%)',
  padding:'2.5rem 1rem 2rem', textAlign:'center',
  borderBottom:'1px solid var(--border)',
};
const heroBadge = {
  display:'inline-flex', alignItems:'center', gap:'0.35rem',
  background:'white', border:'1.5px solid var(--lavender)',
  color:'var(--purple)', fontSize:'0.72rem', fontWeight:700,
  letterSpacing:'0.07em', textTransform:'uppercase',
  padding:'0.28rem 0.8rem', borderRadius:99, marginBottom:'1rem',
};
const h1Style = {
  fontSize:'clamp(2.2rem, 8vw, 4rem)', fontWeight:900,
  lineHeight:1.05, letterSpacing:'-0.03em',
  background:'linear-gradient(135deg,var(--pink) 0%,var(--purple) 65%)',
  WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
  backgroundClip:'text', marginBottom:'0.6rem',
};
const heroSub = {
  fontSize:'clamp(0.9rem,2.5vw,1.05rem)',
  color:'var(--muted)', maxWidth:520, margin:'0 auto 1.5rem', lineHeight:1.6,
};
const btnPrimary = {
  background:'linear-gradient(135deg,var(--pink),var(--purple))',
  color:'white', fontWeight:700, fontSize:'0.88rem',
  padding:'0.65rem 1.5rem', borderRadius:99, textDecoration:'none',
};
const btnGhost = {
  background:'white', color:'var(--purple)', fontWeight:700,
  fontSize:'0.88rem', padding:'0.65rem 1.5rem', borderRadius:99,
  textDecoration:'none', border:'1.5px solid var(--lavender)',
};
const statsBar = {
  background:'white', borderBottom:'1px solid var(--border)',
  display:'flex', overflowX:'auto', scrollbarWidth:'none',
  padding:'0 0.75rem',
};
const searchStyle = {
  width:'100%', padding:'0.7rem 1rem 0.7rem 2.4rem',
  border:'1.5px solid var(--border)', borderRadius:12,
  fontSize:'0.9rem', background:'white', color:'var(--text)',
  outline:'none',
  backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%236b7280' viewBox='0 0 16 16'%3E%3Cpath d='M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.099zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z'/%3E%3C/svg%3E")`,
  backgroundRepeat:'no-repeat', backgroundPosition:'0.75rem center',
};
const cardStyle = {
  background:'white', border:'1.5px solid var(--border)',
  borderRadius:14, padding:'1rem', cursor:'pointer',
};
const imgStyle = { width:40, height:40, borderRadius:10, objectFit:'cover', flexShrink:0, background:'var(--lilac)' };
const emojiStyle = {
  width:40, height:40, borderRadius:10, flexShrink:0,
  background:'linear-gradient(135deg,var(--lilac),#fce7f3)',
  alignItems:'center', justifyContent:'center', fontSize:'1.1rem',
};
