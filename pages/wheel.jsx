import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import WalletButton from '../components/WalletButton';

const SEGMENT_COUNT = 8;

// Neon/trippy palette — vivid, high contrast
const SEGMENTS_STYLE = [
  { bg: '#ff006e', glow: 'rgba(255,0,110,0.6)' },
  { bg: '#8338ec', glow: 'rgba(131,56,236,0.6)' },
  { bg: '#3a86ff', glow: 'rgba(58,134,255,0.6)' },
  { bg: '#06d6a0', glow: 'rgba(6,214,160,0.6)' },
  { bg: '#fb5607', glow: 'rgba(251,86,7,0.6)'  },
  { bg: '#ffbe0b', glow: 'rgba(255,190,11,0.6)' },
  { bg: '#e040fb', glow: 'rgba(224,64,251,0.6)' },
  { bg: '#00b4d8', glow: 'rgba(0,180,216,0.6)'  },
];

function drawWheel(canvas, labels) {
  const ctx = canvas.getContext('2d');
  const SIZE = canvas.width;
  const cx = SIZE / 2, cy = SIZE / 2;
  const r  = SIZE / 2 - 6;
  const arc = (2 * Math.PI) / SEGMENT_COUNT;

  ctx.clearRect(0, 0, SIZE, SIZE);

  labels.forEach((label, i) => {
    const start = i * arc - Math.PI / 2;
    const end   = start + arc;
    const mid   = start + arc / 2;
    const style = SEGMENTS_STYLE[i % SEGMENTS_STYLE.length];

    // Radial gradient fill — dark centre → vivid edge
    const grad = ctx.createRadialGradient(cx, cy, r * 0.18, cx, cy, r);
    grad.addColorStop(0, 'rgba(0,0,0,0.55)');
    grad.addColorStop(1, style.bg);

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, end);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Segment divider lines
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Number badge near outer edge
    const badgeR = r * 0.82;
    const bx = cx + Math.cos(mid) * badgeR;
    const by = cy + Math.sin(mid) * badgeR;
    ctx.save();
    ctx.beginPath();
    ctx.arc(bx, by, 13, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(bx, by);
    ctx.fillStyle = 'white';
    ctx.font = `bold 13px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(i + 1, 0, 0);
    ctx.restore();

    // Short label in middle band
    const labelR = r * 0.48;
    const lx = cx + Math.cos(mid) * labelR;
    const ly = cy + Math.sin(mid) * labelR;
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(mid + Math.PI / 2);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = `600 9px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const short = label.split(' ').slice(0, 3).join(' ');
    ctx.fillText(short.length > 16 ? short.slice(0, 15) + '…' : short, 0, 0);
    ctx.restore();
  });

  // Outer ring glow
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, 2 * Math.PI);
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();

  // Centre disc
  const cGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 26);
  cGrad.addColorStop(0, '#fff');
  cGrad.addColorStop(1, '#e9d5ff');
  ctx.beginPath();
  ctx.arc(cx, cy, 26, 0, 2 * Math.PI);
  ctx.fillStyle = cGrad;
  ctx.shadowColor = 'rgba(124,58,237,0.5)';
  ctx.shadowBlur = 12;
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#7c3aed';
  ctx.font = 'bold 16px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🫧', cx, cy);
}

export default function WheelPage() {
  const canvasRef = useRef(null);
  const [markets, setMarkets]   = useState([]);
  const [segments, setSegments] = useState([]);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [winner,   setWinner]   = useState(null);
  const [loading,  setLoading]  = useState(true);
  const animRef = useRef(null);

  useEffect(() => {
    fetch('/api/events?tag=all&offset=0&limit=100')
      .then(r => r.json())
      .then(data => {
        const parseJson = (s, fb) => { try { return JSON.parse(s||'null')??fb; } catch { return fb; } };
        const active = data.filter(e =>
          (e.markets||[]).every(m =>
            parseJson(m.outcomePrices,[]).every(p => parseFloat(p) < 0.98)
          )
        );
        setMarkets(active);
        pick(active);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function pick(pool) {
    const shuffled = [...(pool||markets)].sort(() => Math.random() - 0.5);
    setSegments(shuffled.slice(0, SEGMENT_COUNT));
    setWinner(null);
  }

  useEffect(() => {
    if (!canvasRef.current || !segments.length) return;
    drawWheel(canvasRef.current, segments.map(e => e.title || 'Market'));
  }, [segments]);

  function spin() {
    if (spinning || !segments.length) return;
    setSpinning(true);
    setWinner(null);

    const extra  = 6 + Math.floor(Math.random() * 5);
    const arc    = 360 / SEGMENT_COUNT;
    const winIdx = Math.floor(Math.random() * SEGMENT_COUNT);
    const segMid = winIdx * arc + arc / 2;
    const target = rotation + extra * 360 + (360 - (rotation % 360)) % 360 + (360 - segMid);

    const start = performance.now();
    const dur   = 4500;
    const startRot = rotation;

    function frame(now) {
      const t    = Math.min((now - start) / dur, 1);
      const ease = 1 - Math.pow(1 - t, 4);
      setRotation(startRot + (target - startRot) * ease);
      if (t < 1) {
        animRef.current = requestAnimationFrame(frame);
      } else {
        setRotation(target);
        setSpinning(false);
        setWinner(segments[winIdx]);
      }
    }
    animRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => () => cancelAnimationFrame(animRef.current), []);

  const fmtVol = n => {
    if (!n || isNaN(n)) return '—';
    if (n >= 1e6) return `$${(n/1e6).toFixed(1)}M`;
    if (n >= 1e3) return `$${(n/1e3).toFixed(0)}K`;
    return `$${n.toFixed(0)}`;
  };

  const parseJson = (s, fb) => { try { return JSON.parse(s||'null')??fb; } catch { return fb; } };

  return (
    <>
      <Head>
        <title>Spin the Market — PolyPocket</title>
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

      {/* Trippy gradient bg */}
      <div style={{ minHeight:'100vh', background:'linear-gradient(160deg,#0d0020 0%,#1a0040 40%,#0a001a 100%)', paddingBottom:'4rem' }}>

        <main style={{ maxWidth:520, margin:'0 auto', padding:'1.5rem 1rem 0' }}>

          {/* Header */}
          <div style={{ textAlign:'center', marginBottom:'1.5rem' }}>
            <div style={{ fontSize:'2.5rem', marginBottom:'0.3rem' }}>🎰</div>
            <h1 style={{
              fontSize:'1.6rem', fontWeight:900, margin:'0 0 0.35rem',
              background:'linear-gradient(90deg,#ff006e,#8338ec,#3a86ff,#06d6a0)',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
              backgroundSize:'200% auto', animation:'shimmer 3s linear infinite',
            }}>Spin the Market</h1>
            <p style={{ fontSize:'0.82rem', color:'rgba(255,255,255,0.5)', margin:0 }}>
              Can't decide? Let the wheel pick your next prediction.
            </p>
          </div>

          {/* Pointer + Wheel */}
          <div style={{ position:'relative', display:'flex', justifyContent:'center', marginBottom:'1.25rem' }}>
            {/* Glow ring behind wheel */}
            <div style={{
              position:'absolute', top:'50%', left:'50%',
              transform:'translate(-50%,-50%)',
              width:330, height:330, borderRadius:'50%',
              background:'radial-gradient(circle,rgba(131,56,236,0.25) 0%,transparent 70%)',
              animation: spinning ? 'glowPulse 0.6s ease-in-out infinite alternate' : 'none',
              pointerEvents:'none',
            }} />

            {/* Pointer */}
            <div style={{
              position:'absolute', top:-14, left:'50%', transform:'translateX(-50%)',
              zIndex:10,
              width:0, height:0,
              borderLeft:'12px solid transparent',
              borderRight:'12px solid transparent',
              borderTop:'26px solid #ff006e',
              filter:'drop-shadow(0 0 8px #ff006e)',
            }} />

            {/* Wheel canvas */}
            <div style={{
              borderRadius:'50%', overflow:'hidden',
              boxShadow:`0 0 40px rgba(131,56,236,0.4), 0 0 80px rgba(131,56,236,0.15)`,
              border:'2px solid rgba(255,255,255,0.1)',
              transform:`rotate(${rotation}deg)`,
              transition: spinning ? 'none' : 'transform 0.05s',
            }}>
              {loading
                ? <div style={{ width:320, height:320, background:'#1a0040',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:'2rem' }}>⏳</div>
                : <canvas ref={canvasRef} width={320} height={320} />
              }
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display:'flex', gap:'0.75rem', justifyContent:'center', marginBottom:'1.5rem' }}>
            <button
              onClick={spin} disabled={spinning || loading}
              style={{
                background: spinning
                  ? 'rgba(255,255,255,0.1)'
                  : 'linear-gradient(135deg,#ff006e,#8338ec)',
                color:'white', fontWeight:900, fontSize:'1.05rem',
                padding:'0.8rem 2.25rem', borderRadius:99, border:'none',
                cursor: spinning ? 'not-allowed' : 'pointer', fontFamily:'inherit',
                boxShadow: spinning ? 'none' : '0 0 24px rgba(255,0,110,0.5)',
                transition:'all .2s', letterSpacing:'0.02em',
              }}
            >
              {spinning ? '🌀 Spinning…' : '🎯  Spin!'}
            </button>
            {!spinning && markets.length > SEGMENT_COUNT && (
              <button
                onClick={() => pick()}
                style={{ background:'rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.8)',
                  fontWeight:700, fontSize:'0.85rem', padding:'0.8rem 1.25rem',
                  borderRadius:99, border:'1px solid rgba(255,255,255,0.15)',
                  cursor:'pointer', fontFamily:'inherit' }}
              >
                🔀 Reshuffle
              </button>
            )}
          </div>

          {/* Legend */}
          {segments.length > 0 && (
            <div style={{ background:'rgba(255,255,255,0.05)', borderRadius:14,
              border:'1px solid rgba(255,255,255,0.08)', padding:'0.85rem 1rem',
              marginBottom: winner ? '1rem' : 0 }}>
              {segments.map((e, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:'0.6rem',
                  padding:'0.3rem 0',
                  borderBottom: i < segments.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                  opacity: winner && winner !== e ? 0.45 : 1,
                  transition:'opacity .4s',
                }}>
                  <span style={{
                    width:22, height:22, borderRadius:'50%', flexShrink:0,
                    background: SEGMENTS_STYLE[i % SEGMENTS_STYLE.length].bg,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:'0.65rem', fontWeight:900, color:'white',
                    boxShadow: winner === e ? `0 0 10px ${SEGMENTS_STYLE[i % SEGMENTS_STYLE.length].bg}` : 'none',
                  }}>{i + 1}</span>
                  <span style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.85)',
                    fontWeight: winner === e ? 800 : 400, lineHeight:1.3 }}>
                    {e.title}
                  </span>
                  <span style={{ marginLeft:'auto', fontSize:'0.68rem',
                    color:'rgba(255,255,255,0.35)', flexShrink:0 }}>
                    {fmtVol(parseFloat(e.volume24hr)||0)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Winner card */}
          {winner && (
            <div style={{
              background:'linear-gradient(135deg,rgba(255,0,110,0.15),rgba(131,56,236,0.15))',
              border:'1.5px solid rgba(255,0,110,0.4)',
              borderRadius:16, padding:'1.25rem',
              boxShadow:'0 0 40px rgba(255,0,110,0.2)',
              animation:'slideUp .35s cubic-bezier(.33,1,.68,1)',
            }}>
              <div style={{ fontSize:'0.65rem', fontWeight:800, letterSpacing:'0.1em',
                color:'#ff006e', textTransform:'uppercase', marginBottom:'0.5rem' }}>
                🎉 The wheel chose
              </div>
              <div style={{ fontWeight:800, fontSize:'1rem', lineHeight:1.4,
                color:'white', marginBottom:'0.75rem' }}>
                {winner.title}
              </div>

              {(() => {
                const m = (winner.markets||[])[0];
                if (!m) return null;
                const names  = parseJson(m.outcomes, ['Yes','No']);
                const prices = parseJson(m.outcomePrices, [0.5,0.5]);
                return (
                  <div style={{ display:'flex', gap:'0.5rem', marginBottom:'1rem', flexWrap:'wrap' }}>
                    {names.slice(0,2).map((n,i) => (
                      <div key={i} style={{
                        background: i===0 ? 'rgba(6,214,160,0.2)' : 'rgba(255,0,110,0.2)',
                        color:      i===0 ? '#06d6a0' : '#ff006e',
                        border:`1px solid ${i===0 ? '#06d6a0' : '#ff006e'}`,
                        borderRadius:99, padding:'0.3rem 0.75rem',
                        fontSize:'0.82rem', fontWeight:700,
                      }}>
                        {n} · {Math.round(parseFloat(prices[i]||0.5)*100)}%
                      </div>
                    ))}
                  </div>
                );
              })()}

              <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
                <a href={`https://polymarket.com/event/${winner.slug||''}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ background:'linear-gradient(135deg,#ff006e,#8338ec)', color:'white',
                    fontWeight:700, fontSize:'0.85rem', padding:'0.65rem 1.25rem',
                    borderRadius:99, textDecoration:'none', display:'inline-flex',
                    alignItems:'center', gap:4, boxShadow:'0 0 20px rgba(255,0,110,0.4)' }}>
                  Trade on Polymarket ↗
                </a>
                <button onClick={spin}
                  style={{ background:'rgba(255,255,255,0.1)', color:'white', fontWeight:700,
                    fontSize:'0.85rem', padding:'0.65rem 1.25rem', borderRadius:99,
                    border:'1px solid rgba(255,255,255,0.2)', cursor:'pointer', fontFamily:'inherit' }}>
                  Spin Again
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      <style>{`
        @keyframes shimmer {
          0%   { background-position: 0% center; }
          100% { background-position: 200% center; }
        }
        @keyframes glowPulse {
          from { opacity: 0.5; transform: translate(-50%,-50%) scale(0.95); }
          to   { opacity: 1;   transform: translate(-50%,-50%) scale(1.05); }
        }
        @keyframes slideUp {
          from { opacity:0; transform:translateY(16px); }
          to   { opacity:1; transform:translateY(0); }
        }
      `}</style>
    </>
  );
}

const navStyle = {
  position:'sticky', top:0, zIndex:200,
  display:'flex', justifyContent:'space-between', alignItems:'center',
  padding:'0.6rem 1rem', background:'rgba(13,0,32,0.9)',
  backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)',
  borderBottom:'1px solid rgba(255,255,255,0.08)',
  paddingLeft:'max(1rem,env(safe-area-inset-left))',
  paddingRight:'max(1rem,env(safe-area-inset-right))',
};
const logoStyle = {
  display:'inline-flex', alignItems:'center', gap:'0.45rem',
  textDecoration:'none', fontWeight:800, fontSize:'0.95rem', color:'white',
};
