import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import WalletButton from '../components/WalletButton';

const THRESHOLD = 0.93;

// ── Story generator ──────────────────────────────────────────────────────────

const DATELINES = [
  'NEW YORK','WASHINGTON','LONDON','BRUSSELS','DAVOS',
  'SINGAPORE','DUBAI','MIAMI','GENEVA','TOKYO',
];

const BYLINES = [
  'Staff Correspondent','Senior Markets Analyst','Blockchain Affairs Desk',
  'Our Prediction Bureau','Global Uncertainty Reporter',
  'Chief Inevitable-Outcome Officer','The Algorithm','A Very Confident Source',
];

const DISCLAIMERS = [
  'The remaining traders betting against this outcome could not be reached for comment.',
  'Dissenting traders declined to respond; their wallets, however, spoke volumes.',
  'A spokesperson for the losing side issued a terse "no comment" before closing their position.',
  'Bears on this outcome have reportedly gone quiet. Very quiet.',
  'The {loser}% still betting otherwise were described by analysts as "optimistic."',
  'Counterparties to this trade are said to be "re-evaluating their priors."',
];

const HEADLINE_TEMPLATES = [
  '{OUTCOME} NOW CONSIDERED INEVITABLE, POLYMARKET TRADERS SAY',
  'SOURCES CONFIRM: {OUTCOME}',
  '{OUTCOME}, ACCORDING TO EVERYONE WHO PUT MONEY ON IT',
  'PREDICTION MARKETS REACH {PCT}% CONSENSUS: {OUTCOME}',
  'BREAKING: {OUTCOME} — MARKET ESSENTIALLY CERTAIN',
  'ANALYSTS STUNNED THAT {OUTCOME} IS HAPPENING',
  '{OUTCOME}: A {PCT}% PROBABILITY STORY',
  'REPORT: {OUTCOME} (TRADERS HAVE SPOKEN)',
];

const SUBHEAD_TEMPLATES = [
  'Polymarket bettors have priced this event at {pct}% — a number widely described as "basically decided."',
  'With odds at {pct}%, contrarian traders are reportedly "not doing great."',
  'Market participants, armed with USDC and conviction, have collectively concluded that yes, this is happening.',
  'The smart money — and, frankly, most of the dumb money — agrees: {outcome}.',
  'In what experts are calling "a pretty lopsided market," the {pct}% figure speaks for itself.',
  'Our prediction bureau notes this represents the {nth} time this week markets have been this one-sided.',
];

const BODY_TEMPLATES = [
  `In a development that surprised no one monitoring decentralized prediction markets, traders on Polymarket have pushed the probability of {outcome} to {pct}%, leaving little room for debate. The event in question — {title} — has attracted significant open interest, with the majority of capital firmly positioned on one side of the ledger.\n\n"When you see a number like {pct}%, you stop hedging your conversations," said one anonymous trader who requested we not disclose their position size. Market depth remains concentrated, and the pointer on the wheel of fate appears to have stopped spinning.\n\n{disclaimer}`,

  `POLYMARKET — Traders wagering on the outcome of {title} have reached something approaching a collective verdict, pricing {outcome} at {pct}% as of press time. This figure, while technically not 100%, has been characterized by market watchers as "close enough to be awkward for the other side."\n\nVolume on the opposing outcome has thinned considerably in recent sessions. Analysts note that when a market approaches this level of certainty, it tends to generate more news coverage than actual trading activity.\n\n{disclaimer}`,

  `The question "{title}" — once considered genuinely uncertain — has been resolved in the eyes of Polymarket traders to the tune of {pct}%. Sources familiar with probability theory confirm that this is, in fact, a very high number.\n\nThe market, which operates on the Polygon blockchain and settles in USDC, has become something of a one-way street. Liquidity providers on the {outcome} side are collecting time-value premiums; their counterparts are collecting regret.\n\n{disclaimer}`,

  `Prediction market participants — a group broadly characterized as "people who put money where their mouth is" — have collectively decided that {outcome} is the most likely outcome of {title}, assigning it a {pct}% probability.\n\nThis figure was reached through the elegant mechanism of financial incentive: if you're wrong, you lose money. Evidently, enough people are sufficiently confident in {outcome} to have driven the price to its current level.\n\nNo further comment was available from the market. The market had already spoken.\n\n{disclaimer}`,
];

const NTH = ['second','third','fourth','fifth','sixth','seventh','eighth'];

function pick(arr, seed) {
  return arr[seed % arr.length];
}

function cap(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

function generateStory(event, idx) {
  const parseJson = (s, fb) => { try { return JSON.parse(s||'null')??fb; } catch { return fb; } };
  const market = (event.markets||[])[0];
  if (!market) return null;

  const names  = parseJson(market.outcomes, ['Yes','No']);
  const prices = parseJson(market.outcomePrices, []);
  if (!prices.length) return null;

  // Find the high-confidence outcome
  let winIdx = 0, winP = 0;
  prices.forEach((p, i) => { const f = parseFloat(p); if (f > winP) { winP = f; winIdx = i; } });
  if (winP < THRESHOLD) return null;

  const pct      = Math.round(winP * 100);
  const outcome  = cap(names[winIdx] || 'Yes');
  const loser    = Math.round((1 - winP) * 100);
  const title    = event.title || 'this prediction';
  const dateline = pick(DATELINES, idx * 7);
  const byline   = pick(BYLINES, idx * 3 + 2);
  const date     = new Date().toLocaleDateString('en-US',{ month:'long', day:'numeric', year:'numeric' });

  const ht = pick(HEADLINE_TEMPLATES, idx);
  const headline = ht
    .replace('{OUTCOME}', outcome.toUpperCase())
    .replace('{PCT}', pct)
    .replace('{outcome}', outcome);

  const st = pick(SUBHEAD_TEMPLATES, idx + 1);
  const subhead = st
    .replace('{pct}', pct)
    .replace('{outcome}', outcome)
    .replace('{nth}', pick(NTH, idx));

  let disc = pick(DISCLAIMERS, idx * 2 + 1).replace('{loser}', loser);

  const bt = pick(BODY_TEMPLATES, idx % BODY_TEMPLATES.length);
  const body = bt
    .replace(/{outcome}/g, outcome)
    .replace(/{pct}/g, pct)
    .replace(/{title}/g, `"${title}"`)
    .replace('{disclaimer}', disc);

  return { headline, subhead, body, dateline, byline, date, pct, outcome, title, slug: event.slug, winIdx, idx };
}

// ── Component ────────────────────────────────────────────────────────────────

export default function NewsPage() {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const today = new Date().toLocaleDateString('en-US',{
    weekday:'long', year:'numeric', month:'long', day:'numeric'
  });

  useEffect(() => {
    fetch('/api/events?tag=all&offset=0&limit=100')
      .then(r => r.json())
      .then(data => {
        const parseJson = (s, fb) => { try { return JSON.parse(s||'null')??fb; } catch { return fb; } };
        const generated = [];
        data.forEach((event, i) => {
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

        {/* Subheader */}
        <div style={{ background:'#1a1a1a', color:'white', textAlign:'center',
          padding:'0.3rem', fontSize:'0.7rem', letterSpacing:'0.12em', maxWidth:900, margin:'0 auto' }}>
          MARKETS AT 93%+ CERTAINTY · SATIRE · NOT FINANCIAL ADVICE · PROBABLY NOT REAL NEWS EITHER
        </div>

        <main style={{ maxWidth:900, margin:'0 auto', padding:'1.5rem 1rem', background:'white',
          boxShadow:'0 0 40px rgba(0,0,0,0.06)' }}>

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

          {/* Lead story */}
          {stories[0] && <LeadStory story={stories[0]} />}

          {/* Divider */}
          {stories.length > 1 && (
            <div style={{ borderTop:'2px solid #1a1a1a', borderBottom:'1px solid #ccc',
              padding:'0.2rem 0', textAlign:'center', margin:'1.5rem 0',
              fontSize:'0.65rem', letterSpacing:'0.15em', textTransform:'uppercase', color:'#555' }}>
              More Inevitable Developments
            </div>
          )}

          {/* Grid of smaller stories */}
          <div style={{ columns: 'auto 260px', columnGap:'1.5rem', columnRule:'1px solid #e0e0e0' }}>
            {stories.slice(1).map((s, i) => (
              <SmallStory key={i} story={s} />
            ))}
          </div>
        </main>

        <footer style={{ maxWidth:900, margin:'0 auto', padding:'1rem', textAlign:'center',
          fontSize:'0.65rem', color:'#888', borderTop:'1px solid #ddd',
          fontFamily:'Georgia,serif', fontStyle:'italic', background:'white' }}>
          The Poly Gazette is a satirical publication. Stories are generated from Polymarket prediction market data.
          Nothing here constitutes financial, legal, or journalistic advice. Seriously.
          <br />Trade responsibly at{' '}
          <a href="https://polymarket.com" target="_blank" rel="noopener noreferrer"
            style={{ color:'#555' }}>polymarket.com</a>.
        </footer>
      </div>
    </>
  );
}

function LeadStory({ story }) {
  return (
    <article style={{ marginBottom:'1.5rem', paddingBottom:'1.5rem',
      borderBottom:'1px solid #ddd' }}>
      {/* Confidence badge */}
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
        display:'flex', gap:'1rem', fontFamily:'Georgia,serif' }}>
        <span><strong>{story.dateline}</strong> — By {story.byline}</span>
        <span>·</span>
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
        <span><strong>{story.dateline}</strong> · {story.byline}</span>
        {' · '}
        <a href={`https://polymarket.com/event/${story.slug||''}`}
          target="_blank" rel="noopener noreferrer"
          style={{ color:'#aaa' }}>See market ↗</a>
      </div>
    </article>
  );
}

const navStyle = {
  position:'sticky', top:0, zIndex:200,
  display:'flex', justifyContent:'space-between', alignItems:'center',
  padding:'0.6rem 1rem', background:'white',
  borderBottom:'1px solid #e0d8c8',
  paddingLeft:'max(1rem,env(safe-area-inset-left))',
  paddingRight:'max(1rem,env(safe-area-inset-right))',
};
const logoStyle = {
  display:'inline-flex', alignItems:'center', gap:'0.45rem',
  textDecoration:'none', fontWeight:800, fontSize:'0.95rem', color:'var(--text)',
};
