import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import WalletButton from '../components/WalletButton';

const THRESHOLD = 0.93;

// ── Headline / story generation ───────────────────────────────────────────────

const VERB_MAP = {
  win:'wins',lose:'loses',be:'is',become:'becomes',reach:'reaches',
  hit:'hits',pass:'passes',happen:'happens',sign:'signs',get:'gets',
  make:'makes',take:'takes',run:'runs',stay:'stays',remain:'remains',
  leave:'leaves',resign:'resigns',sell:'sells',buy:'buys',trade:'trades',
  rise:'rises',fall:'falls',drop:'drops',close:'closes',open:'opens',
  beat:'beats',lead:'leads',launch:'launches',announce:'announces',
  end:'ends',start:'starts',finish:'finishes',complete:'completes',
  exceed:'exceeds',surpass:'surpasses',cross:'crosses',top:'tops',
  hold:'holds',keep:'keeps',break:'breaks',set:'sets',go:'goes',
  come:'comes',return:'returns',issue:'issues',file:'files',
  confirm:'confirms',deny:'denies',approve:'approves',reject:'rejects',
  vote:'votes',exit:'exits',enter:'enters',join:'joins',quit:'quits',
  fire:'fires',hire:'hires',appoint:'appoints',deploy:'deploys',
  release:'releases',withdraw:'withdraws',survive:'survives',die:'dies',
  recover:'recovers',collapse:'collapses',gross:'grosses',earn:'earns',
  raise:'raises',cut:'cuts',increase:'increases',decrease:'decreases',
  advance:'advances',decline:'declines',gain:'gains',expire:'expires',
  default:'defaults',elect:'elects',defeat:'defeats',claim:'claims',
};

const VERB_REGEX = new RegExp(
  `\\b(${Object.keys(VERB_MAP).join('|')})\\b`, 'i'
);

function verbify(word) { return VERB_MAP[word.toLowerCase()] || word; }

function transformYes(body) {
  return body.replace(VERB_REGEX, m => verbify(m));
}

function titleToHeadline(title, outcome, pct) {
  const clean = title.trim().replace(/\?$/, '');
  const outUp = outcome.toUpperCase();

  // Strip sport/category prefix like "NBA: " or "NFL: "
  const stripped = clean.replace(/^[A-Z\s]+:\s*/, '');

  // "Will X ..."
  const willMatch = stripped.match(/^Will\s+(.+)$/i);
  if (willMatch) {
    const body = willMatch[1].trim();
    if (outcome.toLowerCase() === 'yes') {
      return transformYes(body).toUpperCase();
    } else if (outcome.toLowerCase() === 'no') {
      return `${body.replace(/^the\s+/i,'').toUpperCase()} — NOT HAPPENING`;
    }
    // Named candidate / specific outcome
    return `${outUp} — MARKET AT ${pct}%`;
  }

  // "Who will X?"
  if (stripped.match(/^who will/i)) {
    const rest = stripped.replace(/^who will\s*/i,'').trim();
    return `${outUp} SET TO ${rest.toUpperCase()}`;
  }

  // "Which X will ...?"
  if (stripped.match(/^which/i)) {
    return `${outUp} — MARKET AT ${pct}% CERTAINTY`;
  }

  // Fallback: use outcome as subject
  return `MARKET REACHES ${pct}%: ${outUp}`;
}

// Subhead templates — reference actual market and outcome
const SUBHEADS = [
  (t,o,p) => `Polymarket traders have priced "${t}" at ${p}% in favor of ${o} — a number widely described as "basically settled."`,
  (t,o,p) => `With odds on "${t}" sitting at ${p}%, the opposing side is running out of reasons to hold their position.`,
  (t,o,p) => `The prediction market for "${t}" has arrived at a ${p}% consensus: ${o}.`,
  (t,o,p) => `When ${p}% of on-chain capital says ${o}, this publication takes note — and so should you.`,
  (t,o,p) => `${o} is the ${p}% verdict from Polymarket traders tracking "${t}."`,
  (t,o,p) => `Traders wagering real USDC on "${t}" have spoken: ${o}, at ${p}%.`,
];

// Body paragraph templates — narrative, reference the specific market
const BODIES = [
  (t, o, p, loser) =>
    `POLYMARKET — The prediction market tracking the question of "${t}" has settled at ${p}% in favor of ${o}, according to on-chain data reviewed by this publication. The figure, derived from real money wagered on Polygon by traders motivated by the unusual incentive of not losing their USDC, leaves little room for alternative interpretations.\n\n` +
    `"At ${p}%, you've stopped hedging your sentences," said one anonymous trader who requested their position size remain undisclosed. "You've started writing calendar invites." Market depth on the ${o} side remains robust, while the ${loser}% still positioned against it have been characterised by observers as "committed" — a word that can be meant kindly or otherwise.\n\n` +
    `No official statement has been issued regarding this development. The market, as is its custom, expressed its view in basis points rather than press releases.`,

  (t, o, p, loser) =>
    `The question — "${t}" — was once considered genuinely open. It is no longer considered genuinely open.\n\n` +
    `Polymarket traders, armed with USDC and the full weight of financial incentive, have pushed the probability of ${o} to ${p}%. This represents a level of collective confidence that market analysts describe as "not subtle," "fairly unambiguous," and in one instance, "the kind of number you frame and put on a wall."\n\n` +
    `The remaining ${loser}% wagered on the alternative outcome declined to comment. Their capital, however, continues to speak on their behalf — quietly, and in the direction of loss.`,

  (t, o, p, loser) =>
    `In a development that has surprised precisely no one monitoring prediction markets, Polymarket's market for "${t}" has priced ${o} at ${p}% certainty. The market, which operates on the Polygon blockchain and settles in USDC, has become a one-way street.\n\n` +
    `Liquidity providers on the ${o} side are described as "comfortable." Their counterparts, holding the remaining ${loser}%, are described using a wider range of vocabulary that this publication has chosen not to reproduce in full.\n\n` +
    `This is, we are compelled to note, how prediction markets are supposed to work: real stakes, real information, and a number that says what the smart money actually thinks rather than what it tells reporters.`,

  (t, o, p, loser) =>
    `Sources familiar with the Polymarket order book confirm that ${o} is now priced at ${p}% for the question of "${t}" — a figure that traders reached not through editorial consensus or expert polling, but through the time-honoured mechanism of putting money on it.\n\n` +
    `"The market doesn't care about narratives," said one participant, who added that they had closed their position at a comfortable profit and were now watching the remaining ${loser}% "from the bleachers."\n\n` +
    `Whether ${o} ultimately resolves as correct remains, technically, a matter for the future. The market, however, has already made up its mind.`,
];

const DATELINES = ['NEW YORK','WASHINGTON','LONDON','BRUSSELS','DAVOS','SINGAPORE','DUBAI','MIAMI','GENEVA','TOKYO'];
const BYLINES   = ['Staff Correspondent','Senior Markets Analyst','Blockchain Affairs Desk','Our Prediction Bureau','Chief Inevitable-Outcome Officer','The Algorithm','A Very Confident Source'];

function pick(arr, seed) { return arr[Math.abs(seed) % arr.length]; }
function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }

const parseJson = (s, fb) => { try { return JSON.parse(s||'null')??fb; } catch { return fb; } };

function generateStory(event, idx) {
  const market = (event.markets||[])[0];
  if (!market) return null;

  const names  = parseJson(market.outcomes, ['Yes','No']);
  const prices = parseJson(market.outcomePrices, []);
  if (!prices.length) return null;

  let winIdx = 0, winP = 0;
  prices.forEach((p, i) => { const f = parseFloat(p); if (f > winP) { winP = f; winIdx = i; } });
  if (winP < THRESHOLD) return null;

  const pct     = Math.round(winP * 100);
  const outcome = cap(names[winIdx] || 'Yes');
  const loser   = Math.round((1 - winP) * 100);
  const title   = (event.title || 'this prediction').replace(/\?$/,'').trim();

  const headline = titleToHeadline(event.title || title, outcome, pct);
  const subhead  = pick(SUBHEADS, idx + 1)(title, outcome, pct);
  const body     = pick(BODIES, idx)(title, outcome, pct, loser);
  const dateline = pick(DATELINES, idx * 7);
  const byline   = pick(BYLINES, idx * 3 + 2);

  return { headline, subhead, body, dateline, byline, pct, outcome, title, slug: event.slug };
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function NewsPage() {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const today = new Date().toLocaleDateString('en-US',{
    weekday:'long', year:'numeric', month:'long', day:'numeric',
  });

  useEffect(() => {
    fetch('/api/events?tag=all&offset=0&limit=100')
      .then(r => r.json())
      .then(data => {
        const generated = [];
        data.forEach((event) => {
          const market = (event.markets||[])[0];
          if (!market) return;
          const prices = parseJson(market.outcomePrices, []);
          const maxP = Math.max(...prices.map(p => parseFloat(p)||0));
          if (maxP >= THRESHOLD) {
            const story = generateStory(event, generated.length);
            if (story) generated.push(story);
          }
        });
        setStories(generated);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <>
      <Head>
        <title>The Poly Gazette — PolyPocket</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="shortcut icon" href="/logo.png" />
      </Head>

      <nav style={navStyle}>
        <Link href="/" style={logoStyle}>
          <img src="/logo.png" alt="PolyPocket" style={{ width:32, height:32, borderRadius:8, objectFit:'cover' }} />
          PolyPocket
        </Link>
        <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
          <Link href="/" style={{ fontSize:'0.78rem', fontWeight:600, color:'var(--muted)', textDecoration:'none' }}>← Markets</Link>
          <WalletButton />
        </div>
      </nav>

      <div style={{ background:'#faf7f0', minHeight:'100vh' }}>

        {/* Masthead */}
        <header style={{ borderBottom:'3px double #1a1a1a', borderTop:'3px solid #1a1a1a',
          padding:'1rem 1.5rem 0.75rem', textAlign:'center',
          background:'white', maxWidth:900, margin:'0 auto' }}>
          <div style={{ fontSize:'0.65rem', letterSpacing:'0.15em', textTransform:'uppercase',
            color:'#555', borderBottom:'1px solid #ccc', paddingBottom:'0.4rem', marginBottom:'0.5rem' }}>
            All The Market Certainty That's Fit To Print
          </div>
          <h1 style={{ fontFamily:'Georgia,serif', fontSize:'clamp(2rem,6vw,3.5rem)',
            fontWeight:900, margin:0, letterSpacing:'-0.02em', lineHeight:1 }}>
            The Poly Gazette
          </h1>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
            marginTop:'0.5rem', fontSize:'0.7rem', color:'#555', borderTop:'1px solid #ccc',
            paddingTop:'0.4rem' }}>
            <span>Est. 2024 · Powered by USDC</span>
            <span style={{ fontWeight:700 }}>{today}</span>
            <span>Vol. {stories.length} · {stories.length} Stories</span>
          </div>
        </header>

        <div style={{ background:'#1a1a1a', color:'white', textAlign:'center',
          padding:'0.3rem', fontSize:'0.7rem', letterSpacing:'0.12em', maxWidth:900, margin:'0 auto' }}>
          MARKETS AT 93%+ CERTAINTY · SATIRE · NOT FINANCIAL ADVICE · PROBABLY NOT REAL NEWS EITHER
        </div>

        <main style={{ maxWidth:900, margin:'0 auto', padding:'1.5rem 1rem',
          background:'white', boxShadow:'0 0 40px rgba(0,0,0,0.06)' }}>

          {loading && (
            <div style={{ textAlign:'center', padding:'3rem', fontFamily:'Georgia,serif',
              color:'#888', fontStyle:'italic' }}>
              Consulting the markets for breaking certainty…
            </div>
          )}

          {!loading && stories.length === 0 && (
            <div style={{ textAlign:'center', padding:'3rem', fontFamily:'Georgia,serif',
              color:'#888', fontStyle:'italic' }}>
              No markets above 93% confidence today. The world remains uncertain.
            </div>
          )}

          {stories[0] && <LeadStory story={stories[0]} />}

          {stories.length > 1 && (
            <div style={{ borderTop:'2px solid #1a1a1a', borderBottom:'1px solid #ccc',
              padding:'0.2rem 0', textAlign:'center', margin:'1.5rem 0',
              fontSize:'0.65rem', letterSpacing:'0.15em', textTransform:'uppercase', color:'#555' }}>
              More Inevitable Developments
            </div>
          )}

          <div style={{ columns:'auto 260px', columnGap:'1.5rem', columnRule:'1px solid #e0e0e0' }}>
            {stories.slice(1).map((s, i) => <SmallStory key={i} story={s} />)}
          </div>
        </main>

        <footer style={{ maxWidth:900, margin:'0 auto', padding:'1rem', textAlign:'center',
          fontSize:'0.65rem', color:'#888', borderTop:'1px solid #ddd',
          fontFamily:'Georgia,serif', fontStyle:'italic', background:'white' }}>
          The Poly Gazette is a satirical publication. Stories are generated from Polymarket prediction market data.
          Nothing here constitutes financial, legal, or journalistic advice. Seriously.{' '}
          Trade responsibly at{' '}
          <a href="https://polymarket.com" target="_blank" rel="noopener noreferrer" style={{ color:'#555' }}>
            polymarket.com
          </a>.
        </footer>
      </div>
    </>
  );
}

function LeadStory({ story }) {
  return (
    <article style={{ marginBottom:'1.5rem', paddingBottom:'1.5rem', borderBottom:'1px solid #ddd' }}>
      <div style={{ display:'inline-block', background:'#1a1a1a', color:'white',
        fontSize:'0.6rem', fontWeight:800, letterSpacing:'0.12em', textTransform:'uppercase',
        padding:'0.2rem 0.6rem', marginBottom:'0.6rem' }}>
        {story.pct}% CERTAIN · BREAKING
      </div>
      <h2 style={{ fontFamily:'Georgia,serif', fontSize:'clamp(1.4rem,4vw,2.2rem)',
        fontWeight:900, lineHeight:1.15, margin:'0 0 0.5rem', color:'#1a1a1a' }}>
        {story.headline}
      </h2>
      <p style={{ fontFamily:'Georgia,serif', fontSize:'1rem', color:'#444',
        fontStyle:'italic', margin:'0 0 0.6rem', lineHeight:1.5 }}>
        {story.subhead}
      </p>
      <div style={{ fontSize:'0.68rem', color:'#888', marginBottom:'0.8rem',
        display:'flex', gap:'1rem', fontFamily:'Georgia,serif', flexWrap:'wrap' }}>
        <span><strong>{story.dateline}</strong> — By {story.byline}</span>
        <a href={`https://polymarket.com/event/${story.slug||''}`}
          target="_blank" rel="noopener noreferrer"
          style={{ color:'#888', textDecoration:'underline' }}>
          See market ↗
        </a>
      </div>
      <div style={{ fontFamily:'Georgia,serif', fontSize:'0.92rem', lineHeight:1.75,
        color:'#2a2a2a', columnCount:2, columnGap:'1.5rem', columnRule:'1px solid #e0e0e0' }}>
        {story.body.split('\n\n').map((para, i) => (
          <p key={i} style={{ margin:'0 0 0.9rem', textAlign:'justify',
            textIndent: i === 0 ? '1.5em' : 0 }}>{para}</p>
        ))}
      </div>
    </article>
  );
}

function SmallStory({ story }) {
  return (
    <article style={{ breakInside:'avoid', marginBottom:'1.5rem',
      paddingBottom:'1.5rem', borderBottom:'1px solid #eee' }}>
      <div style={{ display:'inline-block', background:'#f0f0f0', color:'#555',
        fontSize:'0.58rem', fontWeight:800, letterSpacing:'0.1em', textTransform:'uppercase',
        padding:'0.15rem 0.5rem', marginBottom:'0.4rem' }}>
        {story.pct}% CERTAIN
      </div>
      <h3 style={{ fontFamily:'Georgia,serif', fontSize:'1rem', fontWeight:900,
        lineHeight:1.25, margin:'0 0 0.35rem', color:'#1a1a1a' }}>
        {story.headline}
      </h3>
      <p style={{ fontFamily:'Georgia,serif', fontSize:'0.8rem', color:'#555',
        fontStyle:'italic', margin:'0 0 0.4rem', lineHeight:1.45 }}>
        {story.subhead}
      </p>
      <p style={{ fontFamily:'Georgia,serif', fontSize:'0.8rem', color:'#333',
        margin:'0 0 0.5rem', lineHeight:1.6, textAlign:'justify' }}>
        {story.body.split('\n\n')[0]}
      </p>
      <div style={{ fontSize:'0.65rem', color:'#aaa', fontFamily:'Georgia,serif' }}>
        <strong>{story.dateline}</strong> · {story.byline} ·{' '}
        <a href={`https://polymarket.com/event/${story.slug||''}`}
          target="_blank" rel="noopener noreferrer" style={{ color:'#aaa' }}>
          See market ↗
        </a>
      </div>
    </article>
  );
}

const navStyle = {
  position:'sticky', top:0, zIndex:200,
  display:'flex', justifyContent:'space-between', alignItems:'center',
  padding:'0.6rem 1rem', background:'white', borderBottom:'1px solid #e0d8c8',
  paddingLeft:'max(1rem,env(safe-area-inset-left))',
  paddingRight:'max(1rem,env(safe-area-inset-right))',
};
const logoStyle = {
  display:'inline-flex', alignItems:'center', gap:'0.45rem',
  textDecoration:'none', fontWeight:800, fontSize:'0.95rem', color:'var(--text)',
};
