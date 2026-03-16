import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import WalletButton from '../components/WalletButton';

// ── Bracket data — 2026 NCAA Tournament ──────────────────────────────────────
const FIRST_FOUR = [
  { region: 'EAST',    game: 'Howard vs UMBC',           teams: [{seed:16,name:'Howard'},{seed:16,name:'UMBC'}],           slug:'cbb-howrd-umbc-2026-03-17',  date:'Mar 17' },
  { region: 'WEST',    game: 'NC State vs Texas',         teams: [{seed:11,name:'NC State'},{seed:11,name:'Texas'}],         slug:'cbb-ncst-tx-2026-03-17',     date:'Mar 17' },
  { region: 'SOUTH',   game: 'Lehigh vs Prairie View A&M',teams: [{seed:16,name:'Lehigh'},{seed:16,name:'Prairie View'}],   slug:'cbb-lehi-pvam-2026-03-18',   date:'Mar 18' },
  { region: 'MIDWEST', game: 'SMU vs Miami (OH)',         teams: [{seed:11,name:'SMU'},{seed:11,name:'Miami OH'}],          slug:'cbb-smu-miaoh-2026-03-18',   date:'Mar 18' },
];

const REGIONS = {
  EAST: [
    { teams:[{seed:1,name:'Duke'},{seed:16,name:'Siena'}],             slug:'cbb-siena-duke-2026-03-19',   date:'Mar 19' },
    { teams:[{seed:8,name:'Ohio St'},{seed:9,name:'TCU'}],             slug:'cbb-tcu-ohiost-2026-03-19',   date:'Mar 19' },
    { teams:[{seed:5,name:"St. John's"},{seed:12,name:'Northern Iowa'}],slug:'cbb-niowa-stjohn-2026-03-20', date:'Mar 20' },
    { teams:[{seed:4,name:'Kansas'},{seed:13,name:'Cal Baptist'}],      slug:'cbb-cabap-kan-2026-03-20',    date:'Mar 20' },
    { teams:[{seed:6,name:'Louisville'},{seed:11,name:'South Florida'}],slug:'cbb-sfl-lou-2026-03-19',      date:'Mar 19' },
    { teams:[{seed:3,name:'Michigan St'},{seed:14,name:'N. Dakota St'}],slug:'cbb-ndkst-mst-2026-03-19',    date:'Mar 19' },
    { teams:[{seed:7,name:'UCLA'},{seed:10,name:'UCF'}],               slug:'cbb-ucf-ucla-2026-03-20',     date:'Mar 20' },
    { teams:[{seed:2,name:'UConn'},{seed:15,name:'Furman'}],           slug:'cbb-furman-uconn-2026-03-20', date:'Mar 20' },
  ],
  SOUTH: [
    { teams:[{seed:1,name:'Florida'},{seed:16,name:'Lehigh/PVAMU'}],   slug:'cbb-lehi-pvam-2026-03-18',    date:'Mar 19', note:'First Four winner' },
    { teams:[{seed:8,name:'Clemson'},{seed:9,name:'Iowa'}],            slug:'cbb-iowa-clmsn-2026-03-20',   date:'Mar 20' },
    { teams:[{seed:5,name:'Vanderbilt'},{seed:12,name:'McNeese'}],     slug:'cbb-mcnst-vand-2026-03-19',   date:'Mar 19' },
    { teams:[{seed:4,name:'Nebraska'},{seed:13,name:'Troy'}],          slug:'cbb-troy-nebr-2026-03-19',    date:'Mar 19' },
    { teams:[{seed:6,name:'N. Carolina'},{seed:11,name:'VCU'}],        slug:'cbb-vcu-ncar-2026-03-19',     date:'Mar 19' },
    { teams:[{seed:3,name:'Illinois'},{seed:14,name:'Penn'}],          slug:'cbb-penn-ill-2026-03-19',     date:'Mar 19' },
    { teams:[{seed:7,name:"Saint Mary's"},{seed:10,name:'Texas A&M'}], slug:'cbb-txam-stmry-2026-03-19',   date:'Mar 19' },
    { teams:[{seed:2,name:'Houston'},{seed:15,name:'Idaho'}],          slug:'cbb-idaho-hou-2026-03-19',    date:'Mar 19' },
  ],
  WEST: [
    { teams:[{seed:1,name:'Arizona'},{seed:16,name:'Long Island'}],    slug:'cbb-liub-arz-2026-03-20',     date:'Mar 20' },
    { teams:[{seed:8,name:'Villanova'},{seed:9,name:'Utah St'}],       slug:'cbb-utahst-vill-2026-03-20',  date:'Mar 20' },
    { teams:[{seed:5,name:'Wisconsin'},{seed:12,name:'High Point'}],   slug:'cbb-hpnt-wisc-2026-03-19',    date:'Mar 19' },
    { teams:[{seed:4,name:'Arkansas'},{seed:13,name:'Hawaii'}],        slug:'cbb-hawaii-ark-2026-03-19',   date:'Mar 19' },
    { teams:[{seed:6,name:'BYU'},{seed:11,name:'NC St/Texas'}],        slug:'cbb-ncst-tx-2026-03-17',      date:'Mar 19', note:'First Four winner' },
    { teams:[{seed:3,name:'Gonzaga'},{seed:14,name:'Kennesaw St'}],    slug:'cbb-kenest-gnzg-2026-03-19',  date:'Mar 19' },
    { teams:[{seed:7,name:'Miami FL'},{seed:10,name:'Missouri'}],      slug:'cbb-missr-mia-2026-03-20',    date:'Mar 20' },
    { teams:[{seed:2,name:'Purdue'},{seed:15,name:'Queens NC'}],       slug:'cbb-queen-pur-2026-03-20',    date:'Mar 20' },
  ],
  MIDWEST: [
    { teams:[{seed:1,name:'Michigan'},{seed:16,name:'HOW/UMBC'}],      slug:'cbb-howrd-umbc-2026-03-17',   date:'Mar 20', note:'First Four winner' },
    { teams:[{seed:8,name:'Georgia'},{seed:9,name:'Saint Louis'}],     slug:'cbb-stlou-ga-2026-03-19',     date:'Mar 19' },
    { teams:[{seed:5,name:'Texas Tech'},{seed:12,name:'Akron'}],       slug:'cbb-akron-txtech-2026-03-20', date:'Mar 20' },
    { teams:[{seed:4,name:'Alabama'},{seed:13,name:'Hofstra'}],        slug:'cbb-hofst-ala-2026-03-20',    date:'Mar 20' },
    { teams:[{seed:6,name:'Tennessee'},{seed:11,name:'SMU/MIA OH'}],   slug:'cbb-smu-miaoh-2026-03-18',    date:'Mar 20', note:'First Four winner' },
    { teams:[{seed:3,name:'Virginia'},{seed:14,name:'Wright St'}],     slug:'cbb-wrght-vir-2026-03-20',    date:'Mar 20' },
    { teams:[{seed:7,name:'Kentucky'},{seed:10,name:'Santa Clara'}],   slug:'cbb-sanclr-uk-2026-03-20',    date:'Mar 20' },
    { teams:[{seed:2,name:'Iowa St'},{seed:15,name:'Tennessee St'}],   slug:'cbb-tenst-iowast-2026-03-20', date:'Mar 20' },
  ],
};

const REGION_COLORS = {
  EAST:'#1d4ed8', SOUTH:'#15803d', WEST:'#b91c1c', MIDWEST:'#7c3aed',
};

const poly = slug => `https://polymarket.com/event/${slug}`;

// ── Odds cache ───────────────────────────────────────────────────────────────
function useOdds() {
  const [odds, setOdds] = useState({});
  useEffect(() => {
    fetch('/api/events?tag=ncaa-basketball&offset=0&limit=100')
      .then(r => r.json())
      .then(data => {
        const parseJson = (s,fb) => { try{return JSON.parse(s||'null')??fb;}catch{return fb;} };
        const map = {};
        data.forEach(e => {
          if (e.slug && e.markets?.[0]) {
            const m = e.markets[0];
            const prices = parseJson(m.outcomePrices, []);
            const names  = parseJson(m.outcomes, []);
            if (prices.length >= 2) {
              map[e.slug] = {
                t1: Math.round(parseFloat(prices[0])*100),
                t2: Math.round(parseFloat(prices[1])*100),
                n1: names[0], n2: names[1],
              };
            }
          }
        });
        setOdds(map);
      })
      .catch(() => {});
  }, []);
  return odds;
}

// ── Components ───────────────────────────────────────────────────────────────
function GameCard({ game, odds, compact }) {
  const o = odds[game.slug];
  const [t1, t2] = game.teams;
  const fav = o ? (o.t1 >= o.t2 ? 0 : 1) : -1;

  return (
    <a href={poly(game.slug)} target="_blank" rel="noopener noreferrer"
      style={{ display:'block', textDecoration:'none',
        background:'rgba(255,255,255,0.05)',
        border:'1px solid rgba(255,255,255,0.1)',
        borderRadius:10, padding: compact ? '0.6rem 0.75rem' : '0.8rem 1rem',
        transition:'all .15s', cursor:'pointer',
      }}
      onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.1)'}
      onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.05)'}
    >
      {game.note && (
        <div style={{ fontSize:'0.6rem', color:'rgba(255,200,0,0.8)', fontWeight:700,
          letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:4 }}>
          ⚡ {game.note}
        </div>
      )}
      {/* Team rows */}
      {[t1, t2].map((team, i) => (
        <div key={i} style={{ display:'flex', alignItems:'center', gap:'0.5rem',
          padding:'0.25rem 0',
          borderBottom: i === 0 ? '1px solid rgba(255,255,255,0.08)' : 'none',
        }}>
          <span style={{ width:20, height:20, borderRadius:4, flexShrink:0,
            background: fav === i ? 'rgba(255,200,0,0.25)' : 'rgba(255,255,255,0.08)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:'0.6rem', fontWeight:800, color: fav === i ? '#fbbf24' : 'rgba(255,255,255,0.5)',
          }}>{team.seed}</span>
          <span style={{ flex:1, fontSize: compact ? '0.8rem' : '0.85rem',
            fontWeight: fav === i ? 700 : 400,
            color: fav === i ? 'white' : 'rgba(255,255,255,0.75)' }}>
            {team.name}
          </span>
          {o && (
            <span style={{ fontSize:'0.75rem', fontWeight:800,
              color: fav === i ? '#4ade80' : 'rgba(255,255,255,0.4)' }}>
              {i === 0 ? o.t1 : o.t2}%
            </span>
          )}
        </div>
      ))}

      {/* Bet button */}
      <div style={{ marginTop:'0.5rem', display:'flex', alignItems:'center',
        justifyContent:'space-between' }}>
        <span style={{ fontSize:'0.62rem', color:'rgba(255,255,255,0.35)' }}>{game.date}</span>
        <span style={{ fontSize:'0.68rem', fontWeight:700, color:'#f97316',
          background:'rgba(249,115,22,0.15)', padding:'0.2rem 0.6rem',
          borderRadius:99, border:'1px solid rgba(249,115,22,0.3)' }}>
          Bet on Polymarket ↗
        </span>
      </div>
    </a>
  );
}

function RegionSection({ name, games, odds }) {
  const color = REGION_COLORS[name];
  return (
    <div style={{ marginBottom:'2rem' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'0.6rem', marginBottom:'0.85rem' }}>
        <div style={{ width:4, height:24, borderRadius:2, background:color }} />
        <h2 style={{ fontSize:'1rem', fontWeight:900, margin:0, color:'white',
          letterSpacing:'0.08em', textTransform:'uppercase' }}>
          {name} Region
        </h2>
        <span style={{ fontSize:'0.65rem', color:'rgba(255,255,255,0.4)',
          fontWeight:600, marginLeft:4 }}>Round of 64</span>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'0.6rem' }}>
        {games.map((g, i) => <GameCard key={i} game={g} odds={odds} />)}
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function MadnessPage() {
  const [tab, setTab] = useState('ALL');
  const odds = useOdds();
  const tabs = ['ALL','EAST','SOUTH','WEST','MIDWEST'];

  return (
    <>
      <Head>
        <title>March Madness — PolyPocket</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="shortcut icon" href="/logo.png" />
      </Head>

      <nav style={navStyle}>
        <Link href="/" style={logoStyle}>
          <img src="/logo.png" alt="PolyPocket" style={{ width:32, height:32, borderRadius:8, objectFit:'cover' }} />
          PolyPocket
        </Link>
        <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
          <Link href="/" style={{ fontSize:'0.78rem', fontWeight:600, color:'rgba(255,255,255,0.5)', textDecoration:'none' }}>← Markets</Link>
          <WalletButton />
        </div>
      </nav>

      <div style={{ minHeight:'100vh', background:'linear-gradient(160deg,#0c0a00 0%,#1a0f00 50%,#0c0800 100%)' }}>

        {/* Hero */}
        <div style={{ textAlign:'center', padding:'2rem 1rem 1.5rem',
          background:'linear-gradient(180deg,rgba(249,115,22,0.15) 0%,transparent 100%)' }}>
          <div style={{ fontSize:'2.5rem', marginBottom:'0.25rem' }}>🏀</div>
          <h1 style={{ fontSize:'clamp(1.6rem,5vw,2.4rem)', fontWeight:900, margin:'0 0 0.25rem',
            background:'linear-gradient(90deg,#f97316,#fbbf24,#f97316)',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
            backgroundSize:'200% auto', animation:'shimmer 3s linear infinite' }}>
            March Madness 2026
          </h1>
          <p style={{ fontSize:'0.85rem', color:'rgba(255,255,255,0.5)', margin:'0 0 1.25rem' }}>
            Fill your bracket. Bet on every game. Live odds from Polymarket.
          </p>

          {/* Bracket image */}
          <div style={{ maxWidth:760, margin:'0 auto 1.5rem',
            borderRadius:12, overflow:'hidden',
            boxShadow:'0 8px 40px rgba(249,115,22,0.2)',
            border:'1px solid rgba(249,115,22,0.2)' }}>
            <img src="/bracket-2026.jpg" alt="2026 NCAA Bracket"
              style={{ width:'100%', display:'block' }} />
          </div>

          {/* Champion market */}
          <a href="https://polymarket.com/event/2026-ncaa-tournament-winner"
            target="_blank" rel="noopener noreferrer"
            style={{ display:'inline-flex', alignItems:'center', gap:'0.5rem',
              background:'linear-gradient(135deg,#f97316,#fbbf24)',
              color:'#1a0f00', fontWeight:800, fontSize:'0.9rem',
              padding:'0.75rem 1.5rem', borderRadius:99, textDecoration:'none',
              boxShadow:'0 4px 20px rgba(249,115,22,0.4)' }}>
            🏆 Bet on the National Champion ↗
          </a>
        </div>

        <main style={{ maxWidth:1100, margin:'0 auto', padding:'0 1rem 4rem' }}>

          {/* First Four */}
          <div style={{ marginBottom:'2rem' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'0.6rem', marginBottom:'0.85rem' }}>
              <div style={{ width:4, height:24, borderRadius:2, background:'#fbbf24' }} />
              <h2 style={{ fontSize:'1rem', fontWeight:900, margin:0, color:'white',
                letterSpacing:'0.08em', textTransform:'uppercase' }}>First Four</h2>
              <span style={{ fontSize:'0.65rem', color:'rgba(255,255,255,0.4)',
                fontWeight:600, marginLeft:4 }}>Dayton, OH · Mar 17–18</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:'0.6rem' }}>
              {FIRST_FOUR.map((g, i) => (
                <div key={i}>
                  <div style={{ fontSize:'0.62rem', color:'rgba(255,255,255,0.4)',
                    fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase',
                    marginBottom:4 }}>{g.region}</div>
                  <GameCard game={g} odds={odds} compact />
                </div>
              ))}
            </div>
          </div>

          {/* Region tabs */}
          <div style={{ display:'flex', gap:'0.5rem', marginBottom:'1.25rem',
            overflowX:'auto', paddingBottom:4 }}>
            {tabs.map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{ padding:'0.45rem 1rem', borderRadius:99, border:'none',
                  fontWeight:700, fontSize:'0.8rem', cursor:'pointer', fontFamily:'inherit',
                  whiteSpace:'nowrap',
                  background: tab === t ? (REGION_COLORS[t] || '#f97316') : 'rgba(255,255,255,0.08)',
                  color: tab === t ? 'white' : 'rgba(255,255,255,0.6)',
                  boxShadow: tab === t ? `0 0 12px ${REGION_COLORS[t] || '#f97316'}55` : 'none',
                }}>
                {t === 'ALL' ? 'All Regions' : t}
              </button>
            ))}
          </div>

          {/* Regions */}
          {Object.entries(REGIONS).map(([name, games]) =>
            (tab === 'ALL' || tab === name) && (
              <RegionSection key={name} name={name} games={games} odds={odds} />
            )
          )}
        </main>
      </div>

      <style>{`
        @keyframes shimmer {
          0%   { background-position: 0% center; }
          100% { background-position: 200% center; }
        }
      `}</style>
    </>
  );
}

const navStyle = {
  position:'sticky', top:0, zIndex:200,
  display:'flex', justifyContent:'space-between', alignItems:'center',
  padding:'0.6rem 1rem',
  background:'rgba(12,10,0,0.9)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)',
  borderBottom:'1px solid rgba(249,115,22,0.15)',
  paddingLeft:'max(1rem,env(safe-area-inset-left))',
  paddingRight:'max(1rem,env(safe-area-inset-right))',
};
const logoStyle = {
  display:'inline-flex', alignItems:'center', gap:'0.45rem',
  textDecoration:'none', fontWeight:800, fontSize:'0.95rem', color:'white',
};
