import Head from 'next/head';
import Link from 'next/link';

// CoW Swap on Polygon — sell MATIC, buy USDC.e (bridged USDC used by Polymarket)
const USDC_E  = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
const COW_URL = `https://swap.cow.fi/#/137/swap/NATIVE/${USDC_E}?theme=dark`;

export default function SwapPage() {
  return (
    <>
      <Head>
        <title>Get USDC.e — PolyPocket</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div style={{minHeight:'100vh',background:'#0b0918',color:'white',fontFamily:"'Inter',sans-serif"}}>
        {/* Nav */}
        <nav style={{
          display:'flex',alignItems:'center',justifyContent:'space-between',
          padding:'0.75rem 1.5rem',borderBottom:'1px solid rgba(255,255,255,0.08)',
          background:'rgba(11,9,24,0.95)',backdropFilter:'blur(12px)',
          position:'sticky',top:0,zIndex:100,
        }}>
          <Link href="/" style={{textDecoration:'none'}}>
            <span style={{fontSize:'1.1rem',fontWeight:900,
              background:'linear-gradient(90deg,#fbbf24,#f97316)',
              WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>PolyPocket</span>
          </Link>
          <Link href="/play" style={{fontSize:'0.72rem',fontWeight:700,color:'rgba(255,255,255,0.5)',
            textDecoration:'none',padding:'4px 10px',borderRadius:6,
            border:'1px solid rgba(255,255,255,0.1)'}}>← Back to Bracket</Link>
        </nav>

        <div style={{maxWidth:560,margin:'0 auto',padding:'2rem 1rem'}}>
          {/* Header */}
          <div style={{textAlign:'center',marginBottom:'1.75rem'}}>
            <div style={{fontSize:'2rem',marginBottom:'0.5rem'}}>💱</div>
            <h1 style={{fontSize:'1.5rem',fontWeight:900,margin:'0 0 0.5rem',
              background:'linear-gradient(90deg,#fbbf24,#f97316)',
              WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>
              Get USDC.e for Betting
            </h1>
            <p style={{fontSize:'0.82rem',color:'rgba(255,255,255,0.5)',margin:0,lineHeight:1.5}}>
              Polymarket uses <strong style={{color:'rgba(255,255,255,0.8)'}}>USDC.e</strong> (bridged USDC on Polygon).
              Swap any token below to get it — then head back to place your bets.
            </p>
          </div>

          {/* Info chips */}
          <div style={{display:'flex',gap:8,justifyContent:'center',marginBottom:'1.5rem',flexWrap:'wrap'}}>
            {[['🔗','Polygon Network'],['🪙','USDC.e (Bridged)'],['⚡','Powered by CoW Protocol']].map(([icon,label])=>(
              <span key={label} style={{fontSize:'0.68rem',fontWeight:600,
                color:'rgba(255,255,255,0.5)',background:'rgba(255,255,255,0.06)',
                border:'1px solid rgba(255,255,255,0.1)',borderRadius:99,padding:'3px 10px'}}>
                {icon} {label}
              </span>
            ))}
          </div>

          {/* CoW Widget iframe — no npm dep, works everywhere */}
          <div style={{borderRadius:16,overflow:'hidden',border:'1px solid rgba(251,191,36,0.2)',
            boxShadow:'0 0 40px rgba(251,191,36,0.08)',background:'#150f2a'}}>
            <iframe
              src={COW_URL}
              width="100%"
              height="600"
              style={{border:'none',display:'block'}}
              allow="ethereum; clipboard-write"
              title="CoW Swap — Get USDC.e"
            />
          </div>

          {/* Help text */}
          <div style={{marginTop:'1.25rem',background:'rgba(255,255,255,0.04)',borderRadius:12,
            border:'1px solid rgba(255,255,255,0.07)',padding:'0.85rem 1rem'}}>
            <div style={{fontSize:'0.7rem',fontWeight:700,color:'rgba(255,255,255,0.4)',
              textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'0.4rem'}}>
              📖 How it works
            </div>
            <ol style={{margin:0,paddingLeft:'1.25rem',color:'rgba(255,255,255,0.5)',
              fontSize:'0.75rem',lineHeight:1.8}}>
              <li>Make sure your wallet is on <strong style={{color:'rgba(255,255,255,0.7)'}}>Polygon mainnet</strong></li>
              <li>Connect your wallet in the swap widget above</li>
              <li>MATIC → USDC.e is pre-selected — adjust the amount</li>
              <li>Approve + swap — funds arrive in your wallet instantly</li>
              <li><Link href="/play" style={{color:'#fbbf24',textDecoration:'none',fontWeight:700}}>← Back to Bracket Bets</Link> to place your wager</li>
            </ol>
          </div>
        </div>
      </div>
    </>
  );
}
