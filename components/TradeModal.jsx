import { useState, useEffect } from 'react';
import { useProvider, useSigner, useAccount, useNetwork, useSwitchNetwork } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { placeOrder, Side } from '../lib/clob';

const POLYGON_ID = 137;

export default function TradeModal({ event, tokenID, outcomeName, initialPrice, onClose }) {
  const { isConnected } = useAccount();
  const { chain } = useNetwork();
  const { switchNetwork } = useSwitchNetwork();
  const { data: signer } = useSigner();

  const [side, setSide] = useState(Side.BUY);
  const [price, setPrice] = useState(parseFloat(initialPrice || 0.5).toFixed(2));
  const [size, setSize] = useState('');
  const [status, setStatus] = useState('idle'); // idle | signing | submitting | success | error
  const [errorMsg, setErrorMsg] = useState('');
  const [txResult, setTxResult] = useState(null);

  const wrongChain = isConnected && chain?.id !== POLYGON_ID;
  const priceNum = parseFloat(price) || 0;
  const sizeNum = parseFloat(size) || 0;
  const shares = priceNum > 0 ? (sizeNum / priceNum).toFixed(2) : '—';
  const maxPayout = sizeNum > 0 ? sizeNum.toFixed(2) : '—';

  async function handleSubmit() {
    if (!signer || !tokenID) return;
    setStatus('signing');
    setErrorMsg('');
    try {
      setStatus('submitting');
      const result = await placeOrder(signer, { tokenID, price: priceNum, size: sizeNum, side });
      setTxResult(result);
      setStatus('success');
    } catch (e) {
      setErrorMsg(e.message || 'Order failed');
      setStatus('error');
    }
  }

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <>
      <div style={overlay} onClick={onClose} />
      <div style={sheet}>
        <div style={handle} />

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'0.25rem' }}>
          <div style={{ fontSize:'0.95rem', fontWeight:800 }}>Place a Trade</div>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>
        <div style={{ fontSize:'0.78rem', color:'var(--muted)', marginBottom:'1.25rem', lineHeight:1.4 }}>
          {event?.title || 'Market'}
        </div>

        {!isConnected ? (
          <div style={{ textAlign:'center', padding:'1rem 0' }}>
            <p style={{ fontSize:'0.85rem', color:'var(--muted)', marginBottom:'1rem' }}>
              Connect your wallet to trade
            </p>
            <ConnectButton />
          </div>
        ) : wrongChain ? (
          <div style={{ textAlign:'center', padding:'1rem 0' }}>
            <p style={{ fontSize:'0.85rem', color:'var(--red)', marginBottom:'1rem' }}>
              ⚠️ Polymarket runs on <strong>Polygon</strong>. Please switch networks.
            </p>
            <button
              style={primaryBtn}
              onClick={() => switchNetwork?.(POLYGON_ID)}
            >
              Switch to Polygon
            </button>
          </div>
        ) : status === 'success' ? (
          <div style={{ textAlign:'center', padding:'1rem 0' }}>
            <div style={{ fontSize:'2rem', marginBottom:'0.5rem' }}>🎉</div>
            <div style={{ fontWeight:800, marginBottom:'0.25rem' }}>Order Submitted!</div>
            <div style={{ fontSize:'0.78rem', color:'var(--muted)', marginBottom:'1rem' }}>
              {side === Side.BUY ? 'Buying' : 'Selling'} {outcomeName} @ {price} · {size} USDC
            </div>
            {txResult?.orderID && (
              <div style={{ fontFamily:'monospace', fontSize:'0.72rem', color:'var(--purple)', background:'var(--lilac)', borderRadius:'8px', padding:'0.5rem', wordBreak:'break-all', marginBottom:'1rem' }}>
                Order ID: {txResult.orderID}
              </div>
            )}
            <button style={primaryBtn} onClick={onClose}>Done</button>
          </div>
        ) : (
          <>
            {/* Outcome badge */}
            <div style={{ display:'flex', gap:'0.5rem', marginBottom:'1.25rem' }}>
              <div style={{ ...badge, background:'var(--lilac)', color:'var(--purple)' }}>
                {outcomeName}
              </div>
              <div style={{ ...badge, background: priceNum > 0.5 ? '#dcfce7' : '#fef2f2', color: priceNum > 0.5 ? 'var(--green)' : 'var(--red)' }}>
                {Math.round(priceNum * 100)}% implied
              </div>
            </div>

            {/* Buy / Sell toggle */}
            <div style={toggleWrap}>
              <button
                style={{ ...toggleBtn, ...(side === Side.BUY ? toggleBuyActive : {}) }}
                onClick={() => setSide(Side.BUY)}
              >Buy</button>
              <button
                style={{ ...toggleBtn, ...(side === Side.SELL ? toggleSellActive : {}) }}
                onClick={() => setSide(Side.SELL)}
              >Sell</button>
            </div>

            {/* Price */}
            <label style={labelStyle}>
              Limit Price (0.01 – 0.99)
              <div style={inputWrap}>
                <input
                  type="number" min="0.01" max="0.99" step="0.01"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  style={inputStyle}
                />
                <span style={inputSuffix}>USDC</span>
              </div>
              <input
                type="range" min="1" max="99" value={Math.round(priceNum * 100)}
                onChange={e => setPrice((parseInt(e.target.value) / 100).toFixed(2))}
                style={{ width:'100%', marginTop:'0.4rem', accentColor:'var(--purple)' }}
              />
            </label>

            {/* Size */}
            <label style={labelStyle}>
              Size (USDC)
              <div style={inputWrap}>
                <input
                  type="number" min="1" step="1" placeholder="e.g. 10"
                  value={size}
                  onChange={e => setSize(e.target.value)}
                  style={inputStyle}
                />
                <span style={inputSuffix}>USDC</span>
              </div>
            </label>

            {/* Summary */}
            {sizeNum > 0 && (
              <div style={summary}>
                <div style={summaryRow}>
                  <span style={{ color:'var(--muted)' }}>Shares</span>
                  <span style={{ fontWeight:700 }}>{shares}</span>
                </div>
                <div style={summaryRow}>
                  <span style={{ color:'var(--muted)' }}>Max payout</span>
                  <span style={{ fontWeight:700, color:'var(--green)' }}>${maxPayout}</span>
                </div>
                <div style={summaryRow}>
                  <span style={{ color:'var(--muted)' }}>You spend</span>
                  <span style={{ fontWeight:700 }}>${sizeNum.toFixed(2)} USDC</span>
                </div>
              </div>
            )}

            {/* Geoblock notice */}
            <div style={{ fontSize:'0.68rem', color:'var(--muted)', marginBottom:'1rem', lineHeight:1.5 }}>
              ⚠️ Polymarket trading is restricted in some jurisdictions, including the United States. You are responsible for compliance with local laws.
            </div>

            {status === 'error' && (
              <div style={{ fontSize:'0.78rem', color:'var(--red)', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:'8px', padding:'0.6rem', marginBottom:'0.75rem' }}>
                {errorMsg}
              </div>
            )}

            <button
              style={{ ...primaryBtn, width:'100%', opacity: (!sizeNum || status !== 'idle') ? 0.6 : 1 }}
              disabled={!sizeNum || status !== 'idle'}
              onClick={handleSubmit}
            >
              {status === 'signing' ? '⏳ Sign in wallet…' :
               status === 'submitting' ? '⏳ Submitting…' :
               `${side === Side.BUY ? '🟢 Buy' : '🔴 Sell'} ${outcomeName}`}
            </button>
          </>
        )}
      </div>
    </>
  );
}

// ── Styles ──
const overlay = {
  position:'fixed', inset:0, zIndex:300,
  background:'rgba(0,0,0,0.45)',
  backdropFilter:'blur(4px)', WebkitBackdropFilter:'blur(4px)',
  animation:'fadeIn .2s ease',
};
const sheet = {
  position:'fixed', bottom:0, left:0, right:0, zIndex:301,
  background:'white', borderRadius:'20px 20px 0 0',
  padding:'0 1.25rem 2rem',
  paddingBottom:'max(2rem, env(safe-area-inset-bottom))',
  maxHeight:'90dvh', overflowY:'auto',
  animation:'slideUp .28s cubic-bezier(.33,1,.68,1)',
};
const handle = {
  width:36, height:4, borderRadius:2,
  background:'var(--border)', margin:'0.75rem auto 1rem',
};
const closeBtn = {
  width:28, height:28, borderRadius:'50%',
  background:'var(--bg)', border:'none', cursor:'pointer',
  display:'flex', alignItems:'center', justifyContent:'center',
  fontSize:'0.85rem', color:'var(--muted)',
};
const primaryBtn = {
  background:'linear-gradient(135deg, var(--pink), var(--purple))',
  color:'white', fontWeight:700, fontSize:'0.9rem',
  padding:'0.75rem 1.5rem', borderRadius:'99px',
  border:'none', cursor:'pointer', transition:'opacity .2s',
};
const badge = {
  display:'inline-flex', alignItems:'center',
  fontSize:'0.72rem', fontWeight:700,
  padding:'0.25rem 0.65rem', borderRadius:'99px',
};
const toggleWrap = {
  display:'flex', gap:0, borderRadius:'10px', overflow:'hidden',
  border:'1.5px solid var(--border)', marginBottom:'1.25rem',
};
const toggleBtn = {
  flex:1, padding:'0.55rem', fontSize:'0.85rem', fontWeight:700,
  border:'none', cursor:'pointer', background:'white', color:'var(--muted)',
  transition:'all .18s',
};
const toggleBuyActive = { background:'#dcfce7', color:'var(--green)' };
const toggleSellActive = { background:'#fef2f2', color:'var(--red)' };
const labelStyle = {
  display:'block', fontSize:'0.78rem', fontWeight:600,
  color:'var(--muted)', marginBottom:'1.1rem',
};
const inputWrap = {
  display:'flex', alignItems:'center', gap:'0.5rem', marginTop:'0.35rem',
};
const inputStyle = {
  flex:1, padding:'0.65rem 0.75rem',
  border:'1.5px solid var(--border)', borderRadius:'10px',
  fontSize:'1rem', fontWeight:700, color:'var(--text)',
  outline:'none', width:'100%',
};
const inputSuffix = { fontSize:'0.78rem', fontWeight:600, color:'var(--muted)', whiteSpace:'nowrap' };
const summary = {
  background:'var(--bg)', border:'1.5px solid var(--border)',
  borderRadius:'10px', padding:'0.75rem', marginBottom:'1rem',
};
const summaryRow = {
  display:'flex', justifyContent:'space-between',
  fontSize:'0.82rem', padding:'0.2rem 0',
};
