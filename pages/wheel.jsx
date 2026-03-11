import { useState, useEffect, useRef, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import WalletButton from '../components/WalletButton';

const COLORS = [
  '#7c3aed','#db2777','#2563eb','#059669',
  '#d97706','#7c3aed','#be185d','#0891b2',
];

const SEGMENT_COUNT = 8;

function drawWheel(canvas, labels) {
  const ctx = canvas.getContext('2d');
  const SIZE = canvas.width;
  const cx = SIZE / 2, cy = SIZE / 2, r = SIZE / 2 - 4;
  const arc = (2 * Math.PI) / SEGMENT_COUNT;

  ctx.clearRect(0, 0, SIZE, SIZE);

  labels.forEach((label, i) => {
    const start = i * arc - Math.PI / 2;
    const end   = start + arc;
    const mid   = start + arc / 2;

    // Segment fill
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, end);
    ctx.closePath();
    ctx.fillStyle = COLORS[i % COLORS.length];
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Label text
    ctx.save();
    ctx.translate(cx + Math.cos(mid) * r * 0.6, cy + Math.sin(mid) * r * 0.6);
    ctx.rotate(mid + Math.PI / 2);
    ctx.fillStyle = 'white';
    ctx.font = `bold ${SIZE < 320 ? 9 : 11}px system-ui`;
    ctx.textAlign = 'center';
    const words = label.split(' ');
    // Max 3 words per line, 2 lines
    const line1 = words.slice(0, 3).join(' ');
    const line2 = words.slice(3, 6).join(' ');
    ctx.fillText(line1.length > 18 ? line1.slice(0, 17) + '…' : line1, 0, 0);
    if (line2) ctx.fillText(line2.length > 18 ? line2.slice(0, 17) + '…' : line2, 0, 13);
    ctx.restore();
  });

  // Centre circle
  ctx.beginPath();
  ctx.arc(cx, cy, 22, 0, 2 * Math.PI);
  ctx.fillStyle = 'white';
  ctx.fill();
  ctx.strokeStyle = '#e9d5ff';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Logo text in centre
  ctx.fillStyle = '#7c3aed';
  ctx.font = 'bold 11px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🫧', cx, cy);
}

export default function WheelPage() {
  const canvasRef   = useRef(null);
  const [markets, setMarkets]     = useState([]);
  const [segments, setSegments]   = useState([]);
  const [spinning, setSpinning]   = useState(false);
  const [rotation, setRotation]   = useState(0);
  const [winner, setWinner]       = useState(null);
  const [loading, setLoading]     = useState(true);
  const animRef = useRef(null);

  // Fetch markets
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
        pickSegments(active);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function pickSegments(pool) {
    if (!pool.length) return;
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    setSegments(shuffled.slice(0, SEGMENT_COUNT));
    setWinner(null);
  }

  // Draw wheel whenever segments change
  useEffect(() => {
    if (!canvasRef.current || !segments.length) return;
    const labels = segments.map(e => e.title || 'Market');
    drawWheel(canvasRef.current, labels);
  }, [segments]);

  function spin() {
    if (spinning || !segments.length) return;
    setSpinning(true);
    setWinner(null);

    const extra = 5 + Math.floor(Math.random() * 5); // 5-9 full rotations
    const arc   = 360 / SEGMENT_COUNT;
    const winIdx = Math.floor(Math.random() * SEGMENT_COUNT);
    // Land pointer (top, 270°) on winning segment centre
    const segMid = winIdx * arc + arc / 2;
    const target = rotation + extra * 360 + (360 - segMid);
    const startRot = rotation;
    const delta = target - startRot;

    const duration = 4000;
    const start = performance.now();

    function frame(now) {
      const t = Math.min((now - start) / duration, 1);
      // Ease-out cubic
      const ease = 1 - Math.pow(1 - t, 3);
      const cur = startRot + delta * ease;
      setRotation(cur);

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

  // Cleanup animation on unmount
  useEffect(() => () => cancelAnimationFrame(animRef.current), []);

  const fmtVol = n => {
    if (!n || isNaN(n)) return '—';
    if (n >= 1e6) return `$${(n/1e6).toFixed(1)}M`;
    if (n >= 1e3) return `$${(n/1e3).toFixed(0)}K`;
    return `$${n.toFixed(0)}`;
  };

  return (
    <>
      <Head>
        <title>Spin the Market — PolyPocket</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="shortcut icon" href="/logo.png" />
      </Head>

      {/* Nav */}
      <nav style={navStyle}>
        <Link href="/" style={logoStyle}>
          <img src="/logo.png" alt="PolyPocket" style={{ width:32, height:32, borderRadius:8, objectFit:'cover', flexShrink:0 }} />
          PolyPocket
        </Link>
        <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
          <Link href="/" style={{ fontSize:'0.78rem', fontWeight:600, color:'var(--muted)', textDecoration:'none' }}>← Markets</Link>
          <WalletButton />
        </div>
      </nav>

      <main style={{ maxWidth:520, margin:'0 auto', padding:'1.5rem 1rem 4rem' }}>
        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:'1.5rem' }}>
          <div style={{ fontSize:'2.5rem', marginBottom:'0.25rem' }}>🎰</div>
          <h1 style={{ fontSize:'1.4rem', fontWeight:800, margin:'0 0 0.35rem',
            background:'linear-gradient(135deg,var(--pink),var(--purple))',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
            Spin the Market
          </h1>
          <p style={{ fontSize:'0.82rem', color:'var(--muted)', margin:0 }}>
            Can't decide? Let the wheel pick your next prediction.
          </p>
        </div>

        {/* Wheel */}
        <div style={{ position:'relative', display:'flex', justifyContent:'center', marginBottom:'1.25rem' }}>
          {/* Pointer */}
          <div style={{
            position:'absolute', top:-10, left:'50%', transform:'translateX(-50%)',
            width:0, height:0, zIndex:10,
            borderLeft:'10px solid transparent', borderRight:'10px solid transparent',
            borderTop:'22px solid #7c3aed',
            filter:'drop-shadow(0 2px 4px rgba(124,58,237,0.4))',
          }} />
          <div style={{
            borderRadius:'50%', overflow:'hidden',
            boxShadow:'0 8px 40px rgba(124,58,237,0.25)',
            border:'3px solid #e9d5ff',
            transform: `rotate(${rotation}deg)`,
            transition: spinning ? 'none' : 'transform 0.1s',
          }}>
            {loading ? (
              <div style={{ width:300, height:300, background:'var(--lilac)',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:'1.5rem', color:'var(--purple)' }}>
                ⏳
              </div>
            ) : (
              <canvas ref={canvasRef} width={300} height={300} />
            )}
          </div>
        </div>

        {/* Spin button + reshuffle */}
        <div style={{ display:'flex', gap:'0.75rem', justifyContent:'center', marginBottom:'1.5rem' }}>
          <button
            style={{
              background: spinning ? 'var(--border)' : 'linear-gradient(135deg,var(--pink),var(--purple))',
              color:'white', fontWeight:800, fontSize:'1rem',
              padding:'0.75rem 2rem', borderRadius:99, border:'none',
              cursor: spinning ? 'not-allowed' : 'pointer',
              transition:'all .2s', fontFamily:'inherit',
              boxShadow: spinning ? 'none' : '0 4px 20px rgba(124,58,237,0.3)',
            }}
            onClick={spin}
            disabled={spinning || loading}
          >
            {spinning ? '🌀 Spinning…' : '🎯 Spin!'}
          </button>
          {!spinning && markets.length > SEGMENT_COUNT && (
            <button
              style={{ background:'white', color:'var(--purple)', fontWeight:700,
                fontSize:'0.82rem', padding:'0.75rem 1.25rem', borderRadius:99,
                border:'1.5px solid var(--purple)', cursor:'pointer', fontFamily:'inherit' }}
              onClick={() => pickSegments(markets)}
            >
              🔀 Reshuffle
            </button>
          )}
        </div>

        {/* Winner card */}
        {winner && (
          <div style={{
            background:'white', border:'2px solid var(--purple)',
            borderRadius:16, padding:'1.25rem',
            boxShadow:'0 8px 32px rgba(124,58,237,0.15)',
            animation:'slideUp .35s cubic-bezier(.33,1,.68,1)',
          }}>
            <div style={{ fontSize:'0.65rem', fontWeight:800, letterSpacing:'0.1em',
              color:'var(--purple)', textTransform:'uppercase', marginBottom:'0.5rem' }}>
              🎉 The wheel chose
            </div>
            <div style={{ fontWeight:800, fontSize:'1rem', lineHeight:1.4, marginBottom:'0.75rem' }}>
              {winner.title}
            </div>

            {/* Prices */}
            {(() => {
              const parseJson = (s, fb) => { try { return JSON.parse(s||'null')??fb; } catch { return fb; } };
              const m = (winner.markets||[])[0];
              if (!m) return null;
              const names  = parseJson(m.outcomes, ['Yes','No']);
              const prices = parseJson(m.outcomePrices, [0.5,0.5]);
              return (
                <div style={{ display:'flex', gap:'0.5rem', marginBottom:'1rem', flexWrap:'wrap' }}>
                  {names.slice(0,2).map((n,i) => (
                    <div key={i} style={{
                      background: i===0 ? '#dcfce7' : '#fef2f2',
                      color:      i===0 ? 'var(--green)' : 'var(--red)',
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
              <a
                href={`https://polymarket.com/event/${winner.slug||''}`}
                target="_blank" rel="noopener noreferrer"
                style={{
                  background:'linear-gradient(135deg,var(--pink),var(--purple))',
                  color:'white', fontWeight:700, fontSize:'0.85rem',
                  padding:'0.6rem 1.25rem', borderRadius:99,
                  textDecoration:'none', display:'inline-flex', alignItems:'center', gap:4,
                }}
              >
                Trade on Polymarket ↗
              </a>
              <button
                style={{ background:'var(--lilac)', color:'var(--purple)', fontWeight:700,
                  fontSize:'0.85rem', padding:'0.6rem 1.25rem', borderRadius:99,
                  border:'none', cursor:'pointer', fontFamily:'inherit' }}
                onClick={spin}
              >
                Spin Again
              </button>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

const navStyle = {
  position:'sticky', top:0, zIndex:200,
  display:'flex', justifyContent:'space-between', alignItems:'center',
  padding:'0.6rem 1rem', background:'white',
  borderBottom:'1px solid var(--border)',
  paddingLeft:'max(1rem,env(safe-area-inset-left))',
  paddingRight:'max(1rem,env(safe-area-inset-right))',
};
const logoStyle = {
  display:'inline-flex', alignItems:'center', gap:'0.45rem',
  textDecoration:'none', fontWeight:800, fontSize:'0.95rem', color:'var(--text)',
};
