import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import WalletButton from '../components/WalletButton';


// Match team probability by name + seed — never trust raw API index order
function getProbs(game, o) {
  if (!o) return [null, null];
  const [t1, t2] = game.teams;
  const n1 = (o.n1||'').toLowerCase();
  const n2 = (o.n2||'').toLowerCase();

  function hit(teamName, outcomeName) {
    if (!teamName || !outcomeName) return false;
    const t = teamName.toLowerCase();
    if (outcomeName.includes(t)) return true;
    return t.split(/\s+/).filter(w=>w.length>3).some(w=>outcomeName.includes(w));
  }

  // If both teams found in opposite slots → assign correctly
  if (hit(t1.name,n1) && hit(t2.name,n2)) return [o.t1, o.t2];
  if (hit(t1.name,n2) && hit(t2.name,n1)) return [o.t2, o.t1];

  // Partial match: one team found
  if (hit(t1.name,n2) && !hit(t1.name,n1)) return [o.t2, o.t1];
  if (hit(t2.name,n2) && !hit(t2.name,n1)) return [o.t1, o.t2];

  // Seed fallback: lower seed = stronger = higher probability
  const hi=Math.max(o.t1,o.t2), lo=Math.min(o.t1,o.t2);
  if (t1.seed < t2.seed) return [hi, lo];
  if (t1.seed > t2.seed) return [lo, hi];
  return [o.t1, o.t2]; // same seed (play-in), use raw
}

// ── Constants ────────────────────────────────────────────────────────────────
const CARD_H  = 68;   // px height of one matchup card
const CARD_G  = 6;    // px gap between adjacent R1 cards
const SLOT    = CARD_H + CARD_G;  // vertical unit
const COL_W   = [186, 158, 132, 116]; // column widths R1→R4
const COL_GAP = 14;   // horizontal gap between rounds

const REGION_COLOR = { EAST:'#3b82f6', SOUTH:'#22c55e', WEST:'#ef4444', MIDWEST:'#a855f7' };
const ROUND_LABEL  = ['Round of 64','Round of 32','Sweet 16','Elite 8'];

// ── Bracket data ─────────────────────────────────────────────────────────────
const FIRST_FOUR = [
  { region:'EAST',    teams:[{seed:16,name:'Howard'},{seed:16,name:'UMBC'}],           slug:'cbb-howrd-umbc-2026-03-17',  date:'Mar 17' },
  { region:'WEST',    teams:[{seed:11,name:'NC State'},{seed:11,name:'Texas'}],         slug:'cbb-ncst-tx-2026-03-17',     date:'Mar 17' },
  { region:'SOUTH',   teams:[{seed:16,name:'Lehigh'},{seed:16,name:'Prairie View'}],   slug:'cbb-lehi-pvam-2026-03-18',   date:'Mar 18' },
  { region:'MIDWEST', teams:[{seed:11,name:'SMU'},{seed:11,name:'Miami OH'}],          slug:'cbb-smu-miaoh-2026-03-18',   date:'Mar 18' },
];

const BRACKET = {
  EAST: [
    { teams:[{seed:1,name:'Duke'},{seed:16,name:'Siena'}],                slug:'cbb-siena-duke-2026-03-19' },
    { teams:[{seed:8,name:'Ohio St'},{seed:9,name:'TCU'}],                slug:'cbb-tcu-ohiost-2026-03-19' },
    { teams:[{seed:5,name:"St. John's"},{seed:12,name:'N. Iowa'}],        slug:'cbb-niowa-stjohn-2026-03-20' },
    { teams:[{seed:4,name:'Kansas'},{seed:13,name:'Cal Baptist'}],        slug:'cbb-cabap-kan-2026-03-20' },
    { teams:[{seed:6,name:'Louisville'},{seed:11,name:'S. Florida'}],     slug:'cbb-sfl-lou-2026-03-19' },
    { teams:[{seed:3,name:'Michigan St'},{seed:14,name:'ND State'}],      slug:'cbb-ndkst-mst-2026-03-19' },
    { teams:[{seed:7,name:'UCLA'},{seed:10,name:'UCF'}],                  slug:'cbb-ucf-ucla-2026-03-20' },
    { teams:[{seed:2,name:'UConn'},{seed:15,name:'Furman'}],              slug:'cbb-furman-uconn-2026-03-20' },
  ],
  SOUTH: [
    { teams:[{seed:1,name:'Florida'},{seed:16,name:'Lehigh/PV'}],         slug:'cbb-lehi-pvam-2026-03-18', note:'FF' },
    { teams:[{seed:8,name:'Clemson'},{seed:9,name:'Iowa'}],               slug:'cbb-iowa-clmsn-2026-03-20' },
    { teams:[{seed:5,name:'Vanderbilt'},{seed:12,name:'McNeese'}],        slug:'cbb-mcnst-vand-2026-03-19' },
    { teams:[{seed:4,name:'Nebraska'},{seed:13,name:'Troy'}],             slug:'cbb-troy-nebr-2026-03-19' },
    { teams:[{seed:6,name:'N. Carolina'},{seed:11,name:'VCU'}],           slug:'cbb-vcu-ncar-2026-03-19' },
    { teams:[{seed:3,name:'Illinois'},{seed:14,name:'Penn'}],             slug:'cbb-penn-ill-2026-03-19' },
    { teams:[{seed:7,name:"St. Mary's"},{seed:10,name:'Texas A&M'}],      slug:'cbb-txam-stmry-2026-03-19' },
    { teams:[{seed:2,name:'Houston'},{seed:15,name:'Idaho'}],             slug:'cbb-idaho-hou-2026-03-19' },
  ],
  WEST: [
    { teams:[{seed:1,name:'Arizona'},{seed:16,name:'Long Island'}],       slug:'cbb-liub-arz-2026-03-20' },
    { teams:[{seed:8,name:'Villanova'},{seed:9,name:'Utah St'}],          slug:'cbb-utahst-vill-2026-03-20' },
    { teams:[{seed:5,name:'Wisconsin'},{seed:12,name:'High Point'}],      slug:'cbb-hpnt-wisc-2026-03-19' },
    { teams:[{seed:4,name:'Arkansas'},{seed:13,name:'Hawaii'}],           slug:'cbb-hawaii-ark-2026-03-19' },
    { teams:[{seed:6,name:'BYU'},{seed:11,name:'NC St/TX'}],              slug:'cbb-ncst-tx-2026-03-17', note:'FF' },
    { teams:[{seed:3,name:'Gonzaga'},{seed:14,name:'Kennesaw St'}],       slug:'cbb-kenest-gnzg-2026-03-19' },
    { teams:[{seed:7,name:'Miami FL'},{seed:10,name:'Missouri'}],         slug:'cbb-missr-mia-2026-03-20' },
    { teams:[{seed:2,name:'Purdue'},{seed:15,name:'Queens NC'}],          slug:'cbb-queen-pur-2026-03-20' },
  ],
  MIDWEST: [
    { teams:[{seed:1,name:'Michigan'},{seed:16,name:'HOW/UMBC'}],         slug:'cbb-howrd-umbc-2026-03-17', note:'FF' },
    { teams:[{seed:8,name:'Georgia'},{seed:9,name:'Saint Louis'}],        slug:'cbb-stlou-ga-2026-03-19' },
    { teams:[{seed:5,name:'Texas Tech'},{seed:12,name:'Akron'}],          slug:'cbb-akron-txtech-2026-03-20' },
    { teams:[{seed:4,name:'Alabama'},{seed:13,name:'Hofstra'}],           slug:'cbb-hofst-ala-2026-03-20' },
    { teams:[{seed:6,name:'Tennessee'},{seed:11,name:'SMU/MIAOH'}],       slug:'cbb-smu-miaoh-2026-03-18', note:'FF' },
    { teams:[{seed:3,name:'Virginia'},{seed:14,name:'Wright St'}],        slug:'cbb-wrght-vir-2026-03-20' },
    { teams:[{seed:7,name:'Kentucky'},{seed:10,name:'Santa Clara'}],      slug:'cbb-sanclr-uk-2026-03-20' },
    { teams:[{seed:2,name:'Iowa St'},{seed:15,name:'Tennessee St'}],      slug:'cbb-tenst-iowast-2026-03-20' },
  ],
};

const poly = s => `https://polymarket.com/event/${s}`;

// ── Compute card top position in bracket ─────────────────────────────────────
function slotTop(round, idx) {
  const span = Math.pow(2, round);
  return (span * idx + (span - 1) / 2) * SLOT;
}

// ── Live odds hook ────────────────────────────────────────────────────────────
function useOdds() {
  const [odds, setOdds] = useState({});
  useEffect(() => {
    fetch('/api/events?tag=ncaa-basketball&offset=0&limit=100')
      .then(r => r.json())
      .then(data => {
        const pj = (s,fb) => { try{return JSON.parse(s||'null')??fb}catch{return fb} };
        const m = {};
        data.forEach(e => {
          const mk = e.markets?.find(mk2 => {
            const n2 = pj(mk2.outcomes, []);
            return n2.length === 2 && !n2.some(o => /^(over|under|yes|no)$/i.test((o||'').trim()));
          }) || e.markets?.[0];
          if (!mk || !e.slug) return;
          const p = pj(mk.outcomePrices,[]);
          const n = pj(mk.outcomes,[]);
          if (p.length >= 2) m[e.slug] = {
            t1:Math.round(parseFloat(p[0])*100), t2:Math.round(parseFloat(p[1])*100),
            n1:(n[0]||'').toLowerCase(), n2:(n[1]||'').toLowerCase(),
          };
        });
        setOdds(m);
      }).catch(()=>{});
  }, []);
  return odds;
}

// ── Components ────────────────────────────────────────────────────────────────
function MatchCard({ game, odds, color }) {
  const o = odds?.[game.slug];
  const [t1, t2] = game.teams;
  const [p1, p2] = getProbs(game, o);
  const fav = o ? (p1 >= p2 ? 0 : 1) : -1;
  const live = !!o;

  return (
    <a href={poly(game.slug)} target="_blank" rel="noopener noreferrer"
      style={{
        display:'block', textDecoration:'none', height:CARD_H,
        background: live ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.03)',
        border:`1px solid ${live ? color+'55' : 'rgba(255,255,255,0.08)'}`,
        borderRadius:8, overflow:'hidden', cursor: live ? 'pointer' : 'default',
        boxShadow: live ? `0 0 12px ${color}22` : 'none',
        transition:'all .15s',
        position:'relative',
      }}
      onMouseEnter={e=>{ if(live){ e.currentTarget.style.background='rgba(255,255,255,0.12)'; e.currentTarget.style.boxShadow=`0 0 20px ${color}44`; }}}
      onMouseLeave={e=>{ if(live){ e.currentTarget.style.background='rgba(255,255,255,0.07)'; e.currentTarget.style.boxShadow=`0 0 12px ${color}22`; }}}
    >
      {game.note && (
        <div style={{ position:'absolute', top:2, right:4, fontSize:'0.5rem',
          color:'#fbbf24', fontWeight:800, letterSpacing:'0.05em' }}>⚡FF</div>
      )}
      {[t1,t2].map((team,i) => (
        <div key={i} style={{
          display:'flex', alignItems:'center', gap:4, padding:'0 7px',
          height:(CARD_H-2)/2,
          borderBottom: i===0 ? '1px solid rgba(255,255,255,0.07)' : 'none',
          background: fav===i && live ? `${color}18` : 'transparent',
        }}>
          <span style={{
            width:17, height:17, borderRadius:4, flexShrink:0,
            background: fav===i && live ? color+'44' : 'rgba(255,255,255,0.07)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:'0.55rem', fontWeight:800,
            color: fav===i && live ? color : 'rgba(255,255,255,0.4)',
          }}>{team.seed}</span>
          <span style={{
            flex:1, fontSize:'0.72rem', fontWeight: fav===i && live ? 700 : 400,
            color: fav===i && live ? 'white' : 'rgba(255,255,255,0.65)',
            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
          }}>{team.name}</span>
          {o && (
            <span style={{
              fontSize:'0.65rem', fontWeight:800, flexShrink:0,
              color: fav===i ? color : 'rgba(255,255,255,0.3)',
            }}>{i===0?p1:p2}%</span>
          )}
        </div>
      ))}
    </a>
  );
}

function TBDSlot({ color }) {
  return (
    <div style={{
      height:CARD_H, borderRadius:8,
      background:'rgba(255,255,255,0.02)',
      border:'1px dashed rgba(255,255,255,0.08)',
      display:'flex', alignItems:'center', justifyContent:'center',
    }}>
      <span style={{ fontSize:'0.62rem', color:'rgba(255,255,255,0.2)', fontWeight:600 }}>TBD</span>
    </div>
  );
}

// SVG connector lines for one region column (between rounds ri and ri+1)
function Connectors({ ri, color }) {
  const leftX  = COL_W[ri] + 1;
  const rightX = COL_W[ri] + COL_GAP - 1;
  const midX   = (leftX + rightX) / 2;
  const count  = Math.pow(2, 3 - ri); // cards in this round
  const lines  = [];

  for (let gi = 0; gi < count; gi += 2) {
    const y1 = slotTop(ri, gi) + CARD_H / 2;
    const y2 = slotTop(ri, gi+1) + CARD_H / 2;
    const yMid = (y1 + y2) / 2;
    // horizontal nub from card right
    lines.push(<line key={`h${gi}`}   x1={leftX} y1={y1}   x2={midX}  y2={y1}   stroke={`${color}50`} strokeWidth={1} />);
    lines.push(<line key={`h${gi+1}`} x1={leftX} y1={y2}   x2={midX}  y2={y2}   stroke={`${color}50`} strokeWidth={1} />);
    // vertical connector between the two nubs
    lines.push(<line key={`v${gi}`}   x1={midX}  y1={y1}   x2={midX}  y2={y2}   stroke={`${color}50`} strokeWidth={1} />);
    // horizontal line to next round card
    lines.push(<line key={`c${gi}`}   x1={midX}  y1={yMid} x2={rightX} y2={yMid} stroke={`${color}50`} strokeWidth={1} />);
  }
  return <>{lines}</>;
}

function RegionBracket({ name, games, odds }) {
  const color = REGION_COLOR[name];
  const totalH = 8 * SLOT;
  const totalW = COL_W.reduce((a,b)=>a+b,0) + COL_GAP * 3;
  const rounds = [games, Array(4).fill(null), Array(2).fill(null), [null]];

  return (
    <div style={{ overflowX:'auto', paddingBottom:8 }}>
      {/* Region label */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
        <div style={{ width:3, height:18, borderRadius:2, background:color }} />
        <span style={{ fontSize:'0.8rem', fontWeight:900, color:'white',
          letterSpacing:'0.1em', textTransform:'uppercase' }}>{name}</span>
        <span style={{ fontSize:'0.65rem', color:'rgba(255,255,255,0.3)', fontWeight:600 }}>
          {ROUND_LABEL[0]} → {ROUND_LABEL[3]}
        </span>
      </div>

      <div style={{ position:'relative', width:totalW, height:totalH, flexShrink:0 }}>
        {/* Connector SVG */}
        <svg style={{ position:'absolute', top:0, left:0, width:totalW, height:totalH,
          pointerEvents:'none', overflow:'visible' }}>
          {[0,1,2].map(ri => {
            // offset x by sum of previous columns + gaps
            const offsetX = COL_W.slice(0,ri).reduce((a,b)=>a+b,0) + ri * COL_GAP;
            return (
              <g key={ri} transform={`translate(${offsetX},0)`}>
                <Connectors ri={ri} color={color} />
              </g>
            );
          })}
        </svg>

        {/* Cards */}
        {rounds.map((round, ri) => {
          const offsetX = COL_W.slice(0,ri).reduce((a,b)=>a+b,0) + ri * COL_GAP;
          return round.map((game, gi) => (
            <div key={`${ri}-${gi}`} style={{
              position:'absolute',
              left:offsetX,
              top:slotTop(ri, gi),
              width:COL_W[ri],
              height:CARD_H,
            }}>
              {game
                ? <MatchCard game={game} odds={odds} color={color} />
                : <TBDSlot color={color} />
              }
            </div>
          ));
        })}
      </div>
    </div>
  );
}

function FirstFourCard({ game, odds }) {
  const color = REGION_COLOR[game.region];
  const o = odds?.[game.slug];
  const [t1,t2] = game.teams;
  const [fp1,fp2] = getProbs(game, o);
  const fav = o ? (fp1 >= fp2 ? 0 : 1) : -1;

  return (
    <a href={poly(game.slug)} target="_blank" rel="noopener noreferrer"
      style={{ display:'block', textDecoration:'none',
        background:'rgba(255,255,255,0.06)', border:`1px solid ${color}44`,
        borderRadius:10, overflow:'hidden', boxShadow:`0 0 12px ${color}22` }}
      onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.12)'}
      onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.06)'}
    >
      <div style={{ padding:'5px 10px 4px', borderBottom:`1px solid ${color}33`,
        display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontSize:'0.6rem', fontWeight:800, color, letterSpacing:'0.08em',
          textTransform:'uppercase' }}>{game.region}</span>
        <span style={{ fontSize:'0.58rem', color:'rgba(255,255,255,0.35)' }}>{game.date}</span>
      </div>
      {[t1,t2].map((team,i) => (
        <div key={i} style={{
          display:'flex', alignItems:'center', gap:6, padding:'5px 10px',
          borderBottom: i===0 ? '1px solid rgba(255,255,255,0.06)' : 'none',
          background: fav===i && o ? `${color}18` : 'transparent',
        }}>
          <span style={{ width:18, height:18, borderRadius:4,
            background: fav===i && o ? color+'44' : 'rgba(255,255,255,0.07)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:'0.55rem', fontWeight:800,
            color: fav===i && o ? color : 'rgba(255,255,255,0.4)', flexShrink:0,
          }}>{team.seed}</span>
          <span style={{ flex:1, fontSize:'0.78rem', fontWeight: fav===i && o ? 700 : 400,
            color: fav===i && o ? 'white' : 'rgba(255,255,255,0.7)' }}>{team.name}</span>
          {o && <span style={{ fontSize:'0.7rem', fontWeight:800,
            color: fav===i ? color : 'rgba(255,255,255,0.3)' }}>{i===0?fp1:fp2}%</span>}
        </div>
      ))}
      <div style={{ padding:'5px 10px', textAlign:'right' }}>
        <span style={{ fontSize:'0.6rem', fontWeight:700, color,
          background:`${color}20`, padding:'2px 8px', borderRadius:99 }}>Bet ↗</span>
      </div>
    </a>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function MadnessPage() {
  const [tab, setTab] = useState('EAST');
  const odds = useOdds();

  return (
    <>
      <Head>
        <title>Bracket Bets 2026 — PolyPocket</title>
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

      <div style={{ minHeight:'100vh', background:'linear-gradient(160deg,#070510 0%,#120820 50%,#070510 100%)' }}>

        {/* Hero */}
        <div style={{ textAlign:'center', padding:'2rem 1rem 1.5rem',
          borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize:'2.5rem', marginBottom:'0.25rem' }}>🏀</div>
          <h1 style={{ fontSize:'clamp(1.6rem,5vw,2.6rem)', fontWeight:900, margin:'0 0 0.35rem',
            background:'linear-gradient(90deg,#f97316,#fbbf24,#ec4899,#f97316)',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
            backgroundSize:'300% auto', animation:'shimmer 4s linear infinite' }}>
            Bracket Bets 2026
          </h1>
          <p style={{ fontSize:'0.85rem', color:'rgba(255,255,255,0.45)', margin:'0 0 1.25rem' }}>
            Click any game to bet it live on Polymarket. Glowing = market open.
          </p>
          <a href={poly('2026-ncaa-tournament-winner')} target="_blank" rel="noopener noreferrer"
            style={{ display:'inline-flex', alignItems:'center', gap:'0.5rem',
              background:'linear-gradient(135deg,#f97316,#fbbf24)',
              color:'#1a0800', fontWeight:800, fontSize:'0.9rem',
              padding:'0.7rem 1.5rem', borderRadius:99, textDecoration:'none',
              boxShadow:'0 4px 24px rgba(249,115,22,0.4)' }}>
            🏆 Bet the Champion ↗
          </a>
        </div>

        <main style={{ maxWidth:1200, margin:'0 auto', padding:'1.5rem 1rem 4rem' }}>

          {/* First Four */}
          <div style={{ marginBottom:'2rem', maxWidth:900, margin:'0 auto 2rem' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginBottom:'0.85rem' }}>
              <span style={{ fontSize:'1.1rem' }}>⚡</span>
              <h2 style={{ fontSize:'0.85rem', fontWeight:900, margin:0, color:'#fbbf24',
                letterSpacing:'0.1em', textTransform:'uppercase' }}>Play-In Games</h2>
              <span style={{ fontSize:'0.65rem', color:'rgba(255,255,255,0.3)' }}>Dayton · Mar 17–18</span>
            </div>
            <div className="ff-grid" style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10 }}>
              {FIRST_FOUR.map((g,i) => <FirstFourCard key={i} game={g} odds={odds} />)}
            </div>
          </div>

          {/* Region tabs */}
          <div style={{ display:'flex', gap:6, marginBottom:'1.25rem', overflowX:'auto', paddingBottom:4 }}>
            {Object.keys(BRACKET).map(r => (
              <button key={r} onClick={() => setTab(r)}
                style={{ padding:'0.45rem 1.2rem', borderRadius:99, border:'none',
                  fontWeight:800, fontSize:'0.78rem', cursor:'pointer', fontFamily:'inherit',
                  whiteSpace:'nowrap',
                  background: tab===r ? REGION_COLOR[r] : 'rgba(255,255,255,0.07)',
                  color: tab===r ? 'white' : 'rgba(255,255,255,0.5)',
                  boxShadow: tab===r ? `0 0 16px ${REGION_COLOR[r]}66` : 'none',
                  transition:'all .15s',
                }}>
                {r}
              </button>
            ))}
          </div>

          {/* Active region bracket */}
          {Object.entries(BRACKET).map(([name, games]) =>
            tab === name && (
              <RegionBracket key={name} name={name} games={games} odds={odds} />
            )
          )}

          {/* Round legend */}
          <div style={{ display:'flex', gap:'1rem', marginTop:'1.5rem', flexWrap:'wrap' }}>
            {ROUND_LABEL.map((label, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:6,
                fontSize:'0.65rem', color:'rgba(255,255,255,0.35)' }}>
                <div style={{ width:COL_W[i]*0.12, height:2, borderRadius:1,
                  background:`rgba(255,255,255,${0.15 + i*0.05})` }} />
                {label}
              </div>
            ))}
            <div style={{ display:'flex', alignItems:'center', gap:6,
              fontSize:'0.65rem', color:'rgba(255,255,255,0.35)' }}>
              <div style={{ width:12, height:12, borderRadius:3,
                border:'1px dashed rgba(255,255,255,0.2)' }} />
              TBD — market not yet open
            </div>
          </div>
        </main>
      </div>

      <style>{`
        @keyframes shimmer {
          0%   { background-position: 0% center; }
          100% { background-position: 300% center; }
        }
        @media (min-width: 640px) {
          .ff-grid { grid-template-columns: repeat(4,1fr) !important; }
        }
      `}</style>
    </>
  );
}

const navStyle = {
  position:'sticky', top:0, zIndex:200,
  display:'flex', justifyContent:'space-between', alignItems:'center',
  padding:'0.6rem 1rem',
  background:'rgba(7,5,16,0.92)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)',
  borderBottom:'1px solid rgba(255,255,255,0.07)',
  paddingLeft:'max(1rem,env(safe-area-inset-left))',
  paddingRight:'max(1rem,env(safe-area-inset-right))',
};
const logoStyle = {
  display:'inline-flex', alignItems:'center', gap:'0.45rem',
  textDecoration:'none', fontWeight:800, fontSize:'0.95rem', color:'white',
};
