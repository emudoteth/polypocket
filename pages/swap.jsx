import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useRef } from 'react';

const USDC_E_POLYGON = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
const FEE_RECIPIENT  = '0x2bA225e8a27B2B75e22c647E6e373ac051413f95';

export default function SwapPage() {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    let handler;

    import('@cowprotocol/widget-lib').then(({ createCowSwapWidget }) => {
      handler = createCowSwapWidget(containerRef.current, {
        params: {
          appCode:  'PolyPocket',
          chainId:  137, // Polygon
          width:    '100%',
          height:   580,
          sell:     { asset: 'MATIC' },
          buy:      { asset: USDC_E_POLYGON },
          theme: {
            baseTheme:  'dark',
            primary:    '#fbbf24',
            background: '#0b0918',
            paper:      '#150f2a',
            text:       '#ffffff',
          },
          partnerFee: {
            bps:       50,               // 0.5% partner fee
            recipient: FEE_RECIPIENT,
          },
        },
      });
    });

    return () => { try { handler?.destroy?.(); } catch {} };
  }, []);

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
          <Link href="/" style={{textDecoration:'none',display:'flex',alignItems:'center',gap:'0.4rem'}}>
            <span style={{fontSize:'1.1rem',fontWeight:900,background:'linear-gradient(90deg,#fbbf24,#f97316)',
              WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>PolyPocket</span>
          </Link>
          <div style={{display:'flex',gap:'0.5rem',alignItems:'center'}}>
            <Link href="/play" style={{fontSize:'0.72rem',fontWeight:700,color:'rgba(255,255,255,0.5)',
              textDecoration:'none',padding:'4px 10px',borderRadius:6,
              border:'1px solid rgba(255,255,255,0.1)'}}>← Back to Bracket</Link>
          </div>
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
            {[
              ['🔗','Polygon Network'],
              ['🪙','USDC.e (Bridged)'],
              ['⚡','Powered by CoW Protocol'],
            ].map(([icon,label])=>(
              <span key={label} style={{fontSize:'0.68rem',fontWeight:600,
                color:'rgba(255,255,255,0.5)',background:'rgba(255,255,255,0.06)',
                border:'1px solid rgba(255,255,255,0.1)',borderRadius:99,padding:'3px 10px'}}>
                {icon} {label}
              </span>
            ))}
          </div>

          {/* Widget */}
          <div style={{borderRadius:16,overflow:'hidden',border:'1px solid rgba(251,191,36,0.2)',
            boxShadow:'0 0 40px rgba(251,191,36,0.08)'}}>
            <div ref={containerRef} />
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
              <li>Select what you're swapping from (MATIC, ETH, etc.)</li>
              <li>USDC.e is pre-selected as the destination</li>
              <li>Approve + swap — funds land in your wallet instantly</li>
              <li><Link href="/play" style={{color:'#fbbf24',textDecoration:'none',fontWeight:700}}>← Back to Bracket Bets</Link> to place your wager</li>
            </ol>
          </div>
        </div>
      </div>
    </>
  );
}
