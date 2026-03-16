import { useState, useEffect, useRef, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import WalletButton from '../components/WalletButton';
import { useWallet } from '../hooks/useWallet';
import { usePolyAuth } from '../hooks/usePolyAuth';
import { ethers } from 'ethers';

// ── Constants ────────────────────────────────────────────────────────────────
const CARD_H  = 68;
const CARD_G  = 6;
const SLOT    = CARD_H + CARD_G;
const COL_W   = [186, 158, 132, 116];
const COL_GAP = 14;

const REGION_COLOR = { EAST:'#3b82f6', SOUTH:'#22c55e', WEST:'#ef4444', MIDWEST:'#a855f7' };
const ROUND_LABEL  = ['Round of 64','Round of 32','Sweet 16','Elite 8'];

// Polygon USDC (USDC.e bridged) + CTF Exchange
const USDC_ADDR    = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
const CTF_EXCHANGE = '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E';
const USDC_ABI     = [
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
];

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

// ── Helpers ───────────────────────────────────────────────────────────────────
function slotTop(round, idx) {
  const span = Math.pow(2, round);
  return (span * idx + (span - 1) / 2) * SLOT;
}

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
  if (hit(t1.name,n1) && hit(t2.name,n2)) return [o.t1, o.t2];
  if (hit(t1.name,n2) && hit(t2.name,n1)) return [o.t2, o.t1];
  if (hit(t1.name,n2) && !hit(t1.name,n1)) return [o.t2, o.t1];
  if (hit(t2.name,n2) && !hit(t2.name,n1)) return [o.t1, o.t2];
  const hi=Math.max(o.t1,o.t2), lo=Math.min(o.t1,o.t2);
  if (t1.seed < t2.seed) return [hi, lo];
  if (t1.seed > t2.seed) return [lo, hi];
  return [o.t1, o.t2];
}

// ── Odds hook ─────────────────────────────────────────────────────────────────
function useOdds() {
  const [odds, setOdds] = useState({});
  useEffect(() => {
    fetch('/api/events?tag=ncaa-basketball&offset=0&limit=100')
      .then(r=>r.json())
      .then(data => {
        const pj=(s,fb)=>{try{return JSON.parse(s||'null')??fb}catch{return fb}};
        const m={};
        data.forEach(e => {
          const mk=e.markets?.[0];
          if(!mk||!e.slug) return;
          const p=pj(mk.outcomePrices,[]);
          const n=pj(mk.outcomes,[]);
          if(p.length>=2) m[e.slug]={
            t1:Math.round(parseFloat(p[0])*100), t2:Math.round(parseFloat(p[1])*100),
            n1:(n[0]||'').toLowerCase(), n2:(n[1]||'').toLowerCase(),
          };
        });
        setOdds(m);
      }).catch(()=>{});
  },[]);
  return odds;
}

// ── BetModal ──────────────────────────────────────────────────────────────────
function BetModal({ game, odds, wallet, polyAuth, onClose }) {
  const color  = REGION_COLOR[game.region] || '#f97316';
  const o      = odds?.[game.slug];
  const [p1,p2]= getProbs(game, o);
  const [t1,t2]= game.teams;

  const [selectedIdx, setSelectedIdx] = useState(o ? (p1>=p2?0:1) : 0);
  const [amount,   setAmount]   = useState('10');
  const [step,     setStep]     = useState('idle');  // idle|approving|signing-auth|signing-order|submitting|done|error
  const [txMsg,    setTxMsg]    = useState('');
  const [tokens,      setTokens]      = useState(null);
  const [tokensError, setTokensError] = useState(null);
  const [result,      setResult]      = useState(null);

  const selectedTeam = game.teams[selectedIdx];
  const selectedProb = selectedIdx===0 ? p1 : p2;
  const potentialWin = selectedProb ? (parseFloat(amount||0) / (selectedProb/100)).toFixed(2) : '—';
  const profit       = selectedProb ? (parseFloat(potentialWin||0) - parseFloat(amount||0)).toFixed(2) : '—';

  // Fetch token IDs on mount — with retry
  const fetchTokens = useCallback(() => {
    setTokensError(null);
    fetch(`/api/poly-tokens?slug=${game.slug}`)
      .then(r=>r.json())
      .then(d => {
        if(d.tokens?.length) setTokens(d);
        else setTokensError(d.error || 'No token data returned');
      })
      .catch(e => setTokensError(e.message || 'Network error fetching market data'));
  }, [game.slug]);

  useEffect(() => { fetchTokens(); }, [fetchTokens]);

  async function checkApproval() {
    if (!wallet?.signer) return false;
    const usdc = new ethers.Contract(USDC_ADDR, USDC_ABI, wallet.signer);
    const allowance = await usdc.allowance(wallet.address, CTF_EXCHANGE);
    const needed = ethers.utils.parseUnits(amount, 6);
    return allowance.gte(needed);
  }

  async function approveUSDC() {
    setStep('approving');
    setTxMsg('Approving USDC — confirm in wallet…');
    const usdc = new ethers.Contract(USDC_ADDR, USDC_ABI, wallet.signer);
    const tx = await usdc.approve(CTF_EXCHANGE, ethers.constants.MaxUint256);
    setTxMsg('Waiting for approval confirmation…');
    await tx.wait();
  }

  async function placeBet() {
    if (!wallet?.address || !wallet?.signer) return;
    setStep('idle');
    setTxMsg('');
    setResult(null);

    try {
      // 1. Ensure Polymarket auth — use return value, not stale state
      let activeCreds = polyAuth.creds;
      if (polyAuth.status !== 'ready') {
        if (polyAuth.status === 'tos-pending') {
          throw new Error('Click "✅ I\'ve accepted — Sign" in the top bar to finish authorization first.');
        }
        setStep('signing-auth');
        setTxMsg('Authorizing with Polymarket — sign the message in your wallet…');
        const authResult = await polyAuth.authorize();
        if (!authResult?.success) {
          throw new Error(authResult?.error || 'Authorization failed. Visit polymarket.com, connect your wallet and accept their Terms of Service, then try again.');
        }
        activeCreds = authResult.creds;
      }

      // 2. Check + get USDC approval
      const approved = await checkApproval();
      if (!approved) {
        await approveUSDC();
      }

      // 3. Find the token ID for selected outcome
      if (!tokens?.tokens?.length) throw new Error('Token IDs not loaded yet — try again');
      const tokenData = tokens.tokens[selectedIdx];
      if (!tokenData) throw new Error('No token found for selected outcome');

      // 4. Build unsigned order on server
      setStep('signing-order');
      setTxMsg('Building order…');
      const buildR = await fetch('/api/poly-build-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maker:   wallet.address,
          tokenId: tokenData.tokenId,
          price:   selectedProb / 100,
          size:    parseFloat(amount),
          side:    'BUY',
        }),
      });
      const { order, typedData } = await buildR.json();

      // 5. Client-side EIP-712 signing
      setTxMsg('Sign the order in your wallet…');
      const sig = await wallet.provider.send('eth_signTypedData_v4', [
        wallet.address,
        JSON.stringify(typedData),
      ]);

      // 6. Submit via server
      setStep('submitting');
      setTxMsg('Submitting order to Polymarket…');
      const creds = activeCreds || polyAuth.creds;
      const submitR = await fetch('/api/poly-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order, signature: sig,
          apiKey: creds.apiKey,
          secret: creds.secret,
          passphrase: creds.passphrase,
        }),
      });
      const submitData = await submitR.json();
      if (!submitR.ok) throw new Error(submitData.error || JSON.stringify(submitData));

      setResult({ success: true, data: submitData });
      setStep('done');
    } catch (e) {
      setTxMsg(e.message);
      setStep('error');
    }
  }

  const busy = ['approving','signing-auth','signing-order','submitting'].includes(step);

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:1000,
      background:'rgba(0,0,0,0.75)', backdropFilter:'blur(6px)',
      display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem',
    }} onClick={e=>e.target===e.currentTarget && onClose()}>
      <div style={{
        background:'#0f0d1a', border:`1px solid ${color}44`,
        borderRadius:16, padding:'1.5rem', width:'100%', maxWidth:380,
        boxShadow:`0 0 60px ${color}22`,
      }}>
        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1.25rem' }}>
          <div>
            <div style={{ fontSize:'0.65rem', fontWeight:800, color, letterSpacing:'0.1em',
              textTransform:'uppercase', marginBottom:3 }}>Place Bet</div>
            <div style={{ fontSize:'0.85rem', fontWeight:700, color:'white' }}>
              {t1.name} vs {t2.name}
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.4)',
            cursor:'pointer', fontSize:'1.2rem', padding:'0 0 0 8px', lineHeight:1 }}>✕</button>
        </div>

        {step === 'done' ? (
          <div style={{ textAlign:'center', padding:'1rem 0' }}>
            <div style={{ fontSize:'2.5rem', marginBottom:'0.5rem' }}>✅</div>
            <div style={{ fontWeight:800, fontSize:'1rem', color:'white', marginBottom:'0.35rem' }}>Order Submitted!</div>
            <div style={{ fontSize:'0.75rem', color:'rgba(255,255,255,0.5)', marginBottom:'1.25rem' }}>
              ${amount} on {selectedTeam.name} @ {selectedProb}¢
            </div>
            {result?.data?.orderID && (
              <div style={{ fontSize:'0.65rem', color:'rgba(255,255,255,0.3)',
                fontFamily:'monospace', wordBreak:'break-all', marginBottom:'1rem' }}>
                Order ID: {result.data.orderID}
              </div>
            )}
            <button onClick={onClose} style={{ ...btnStyle(color), width:'100%' }}>Done</button>
          </div>
        ) : (
          <>
            {/* Team selector */}
            <div style={{ marginBottom:'1rem' }}>
              <div style={{ fontSize:'0.65rem', fontWeight:700, color:'rgba(255,255,255,0.4)',
                marginBottom:'0.5rem', textTransform:'uppercase', letterSpacing:'0.05em' }}>Pick a side</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {[t1,t2].map((team,i) => {
                  const prob = i===0?p1:p2;
                  const sel  = selectedIdx===i;
                  return (
                    <button key={i} onClick={()=>!busy&&setSelectedIdx(i)} style={{
                      padding:'0.65rem 0.5rem', borderRadius:10, cursor:'pointer',
                      border:`2px solid ${sel ? color : 'rgba(255,255,255,0.1)'}`,
                      background: sel ? `${color}22` : 'rgba(255,255,255,0.04)',
                      boxShadow: sel ? `0 0 12px ${color}44` : 'none',
                      textAlign:'center', transition:'all .15s',
                    }}>
                      <div style={{ fontSize:'0.65rem', fontWeight:700, color:'rgba(255,255,255,0.4)',
                        marginBottom:2 }}>Seed {team.seed}</div>
                      <div style={{ fontSize:'0.82rem', fontWeight:800,
                        color: sel ? 'white' : 'rgba(255,255,255,0.7)' }}>{team.name}</div>
                      {prob != null && (
                        <div style={{ fontSize:'0.75rem', fontWeight:900, color: sel ? color : 'rgba(255,255,255,0.3)',
                          marginTop:3 }}>{prob}¢</div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Amount input */}
            <div style={{ marginBottom:'1rem' }}>
              <div style={{ fontSize:'0.65rem', fontWeight:700, color:'rgba(255,255,255,0.4)',
                marginBottom:'0.5rem', textTransform:'uppercase', letterSpacing:'0.05em' }}>Amount (USDC)</div>
              <div style={{ position:'relative' }}>
                <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)',
                  color:'rgba(255,255,255,0.4)', fontSize:'0.9rem' }}>$</span>
                <input
                  type="number" min="5" step="1" value={amount}
                  onChange={e=>!busy&&setAmount(e.target.value)}
                  style={{ width:'100%', boxSizing:'border-box', paddingLeft:28, paddingRight:12,
                    paddingTop:10, paddingBottom:10, borderRadius:8,
                    background:'rgba(255,255,255,0.07)',
                    border:`1px solid ${color}44`, color:'white',
                    fontSize:'1rem', fontWeight:700, fontFamily:'inherit', outline:'none' }}
                />
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:6,
                fontSize:'0.65rem', color:'rgba(255,255,255,0.3)' }}>
                <span>min $5</span>
                {['5','10','25','50'].map(v=>(
                  <button key={v} onClick={()=>!busy&&setAmount(v)}
                    style={{ background:'rgba(255,255,255,0.07)', border:'none', borderRadius:4,
                      padding:'1px 7px', color:'rgba(255,255,255,0.5)', cursor:'pointer',
                      fontSize:'0.65rem', fontFamily:'inherit' }}>${v}</button>
                ))}
              </div>
            </div>

            {/* Payout preview */}
            {selectedProb != null && (
              <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:8,
                padding:'0.65rem 0.85rem', marginBottom:'1rem',
                border:'1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.7rem', marginBottom:4 }}>
                  <span style={{ color:'rgba(255,255,255,0.4)' }}>Implied odds</span>
                  <span style={{ color:'white', fontWeight:700 }}>{selectedProb}¢</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.7rem', marginBottom:4 }}>
                  <span style={{ color:'rgba(255,255,255,0.4)' }}>Potential payout</span>
                  <span style={{ color:'white', fontWeight:700 }}>${potentialWin}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.7rem' }}>
                  <span style={{ color:'rgba(255,255,255,0.4)' }}>Profit if win</span>
                  <span style={{ color:'#22c55e', fontWeight:800 }}>+${profit}</span>
                </div>
              </div>
            )}

            {/* Status / error */}
            {(step === 'error' || busy) && (
              <div style={{ fontSize:'0.7rem', padding:'0.6rem 0.75rem', borderRadius:8, marginBottom:'0.85rem',
                background: step==='error' ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${step==='error' ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.1)'}`,
                color: step==='error' ? '#fca5a5' : 'rgba(255,255,255,0.6)' }}>
                {busy && <span style={{ marginRight:6 }}>⏳</span>}
                {txMsg}
              </div>
            )}

            {/* CTA button */}
            {/* Token loading state */}
            {!tokens && !tokensError && (
              <div style={{ fontSize:'0.68rem', color:'rgba(255,255,255,0.4)', textAlign:'center',
                marginBottom:'0.65rem' }}>⏳ Loading market data…</div>
            )}
            {tokensError && (
              <div style={{ fontSize:'0.68rem', color:'#fca5a5', marginBottom:'0.65rem',
                display:'flex', alignItems:'center', justifyContent:'space-between',
                background:'rgba(239,68,68,0.1)', borderRadius:8, padding:'0.5rem 0.75rem' }}>
                <span>⚠️ {tokensError}</span>
                <button onClick={fetchTokens}
                  style={{ background:'none', border:'1px solid rgba(239,68,68,0.5)',
                    borderRadius:6, color:'#fca5a5', cursor:'pointer', fontSize:'0.65rem',
                    padding:'2px 8px', marginLeft:8, fontFamily:'inherit' }}>Retry</button>
              </div>
            )}
            {!wallet?.address ? (
              <div style={{ textAlign:'center', fontSize:'0.78rem', color:'rgba(255,255,255,0.4)',
                padding:'0.75rem 0' }}>
                Connect your wallet to bet
              </div>
            ) : (
              <button
                onClick={placeBet}
                disabled={busy || !amount || parseFloat(amount)<5 || (!tokens && !tokensError)}
                style={{
                  ...btnStyle(color),
                  width:'100%',
                  opacity: busy || !amount || parseFloat(amount)<5 || (!tokens && !tokensError) ? 0.5 : 1,
                  cursor:  busy || !amount || parseFloat(amount)<5 || (!tokens && !tokensError) ? 'not-allowed' : 'pointer',
                }}
              >
                {busy ? txMsg.split('…')[0] + '…' :
                  polyAuth.status !== 'ready' ? '🔑 Authorize & Bet' :
                  `Bet $${amount} on ${selectedTeam.name}`}
              </button>
            )}

            <div style={{ textAlign:'center', fontSize:'0.6rem', color:'rgba(255,255,255,0.2)',
              marginTop:'0.75rem' }}>
              Orders are non-custodial · Polygon · USDC
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function btnStyle(color) {
  return {
    padding:'0.75rem 1.5rem', borderRadius:99, border:'none',
    background:`linear-gradient(135deg,${color},${color}cc)`,
    color:'white', fontWeight:800, fontSize:'0.88rem',
    fontFamily:'inherit', cursor:'pointer',
    boxShadow:`0 4px 16px ${color}44`,
  };
}

// ── Bracket components ────────────────────────────────────────────────────────
function Connectors({ ri, color }) {
  const leftX=COL_W[ri]+1, rightX=COL_W[ri]+COL_GAP-1, midX=(leftX+rightX)/2;
  const count=Math.pow(2,3-ri);
  const lines=[];
  for(let gi=0;gi<count;gi+=2){
    const y1=slotTop(ri,gi)+CARD_H/2, y2=slotTop(ri,gi+1)+CARD_H/2, yMid=(y1+y2)/2;
    lines.push(<line key={`h${gi}`}   x1={leftX} y1={y1}   x2={midX}  y2={y1}   stroke={`${color}50`} strokeWidth={1}/>);
    lines.push(<line key={`h${gi+1}`} x1={leftX} y1={y2}   x2={midX}  y2={y2}   stroke={`${color}50`} strokeWidth={1}/>);
    lines.push(<line key={`v${gi}`}   x1={midX}  y1={y1}   x2={midX}  y2={y2}   stroke={`${color}50`} strokeWidth={1}/>);
    lines.push(<line key={`c${gi}`}   x1={midX}  y1={yMid} x2={rightX} y2={yMid} stroke={`${color}50`} strokeWidth={1}/>);
  }
  return <>{lines}</>;
}

function MatchCard({ game, odds, color, onBet }) {
  const o=odds?.[game.slug];
  const [p1,p2]=getProbs(game,o);
  const [t1,t2]=game.teams;
  const fav=o?(p1>=p2?0:1):-1;
  const live=!!o;

  return (
    <div onClick={()=>live&&onBet(game)} style={{
      height:CARD_H,
      background:live?'rgba(255,255,255,0.07)':'rgba(255,255,255,0.03)',
      border:`1px solid ${live?color+'55':'rgba(255,255,255,0.08)'}`,
      borderRadius:8, overflow:'hidden',
      cursor:live?'pointer':'default',
      boxShadow:live?`0 0 12px ${color}22`:'none',
      transition:'all .15s', position:'relative',
    }}
    onMouseEnter={e=>{if(live){e.currentTarget.style.background='rgba(255,255,255,0.12)';e.currentTarget.style.boxShadow=`0 0 20px ${color}44`;}}}
    onMouseLeave={e=>{if(live){e.currentTarget.style.background='rgba(255,255,255,0.07)';e.currentTarget.style.boxShadow=`0 0 12px ${color}22`;}}}
    >
      {game.note&&<div style={{position:'absolute',top:2,right:4,fontSize:'0.5rem',color:'#fbbf24',fontWeight:800}}>⚡FF</div>}
      {live&&<div style={{position:'absolute',top:2,left:4,fontSize:'0.5rem',color:color,fontWeight:800,letterSpacing:'0.05em'}}>BET</div>}
      {[t1,t2].map((team,i)=>(
        <div key={i} style={{
          display:'flex',alignItems:'center',gap:4,padding:'0 7px',
          height:(CARD_H-2)/2,
          borderBottom:i===0?'1px solid rgba(255,255,255,0.07)':'none',
          background:fav===i&&live?`${color}18`:'transparent',
        }}>
          <span style={{width:17,height:17,borderRadius:4,flexShrink:0,
            background:fav===i&&live?color+'44':'rgba(255,255,255,0.07)',
            display:'flex',alignItems:'center',justifyContent:'center',
            fontSize:'0.55rem',fontWeight:800,
            color:fav===i&&live?color:'rgba(255,255,255,0.4)'}}>{team.seed}</span>
          <span style={{flex:1,fontSize:'0.72rem',fontWeight:fav===i&&live?700:400,
            color:fav===i&&live?'white':'rgba(255,255,255,0.65)',
            overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{team.name}</span>
          {o&&<span style={{fontSize:'0.65rem',fontWeight:800,flexShrink:0,
            color:fav===i?color:'rgba(255,255,255,0.3)'}}>{i===0?p1:p2}¢</span>}
        </div>
      ))}
    </div>
  );
}

function TBDSlot(){
  return(
    <div style={{height:CARD_H,borderRadius:8,background:'rgba(255,255,255,0.02)',
      border:'1px dashed rgba(255,255,255,0.08)',
      display:'flex',alignItems:'center',justifyContent:'center'}}>
      <span style={{fontSize:'0.62rem',color:'rgba(255,255,255,0.2)',fontWeight:600}}>TBD</span>
    </div>
  );
}

function RegionBracket({ name, games, odds, onBet }) {
  const color=REGION_COLOR[name];
  const totalH=8*SLOT;
  const totalW=COL_W.reduce((a,b)=>a+b,0)+COL_GAP*3;
  const rounds=[games,Array(4).fill(null),Array(2).fill(null),[null]];
  return(
    <div style={{overflowX:'auto',paddingBottom:8}}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
        <div style={{width:3,height:18,borderRadius:2,background:color}}/>
        <span style={{fontSize:'0.8rem',fontWeight:900,color:'white',letterSpacing:'0.1em',textTransform:'uppercase'}}>{name}</span>
        <span style={{fontSize:'0.65rem',color:'rgba(255,255,255,0.3)',fontWeight:600}}>{ROUND_LABEL[0]} → {ROUND_LABEL[3]}</span>
      </div>
      <div style={{position:'relative',width:totalW,height:totalH,flexShrink:0}}>
        <svg style={{position:'absolute',top:0,left:0,width:totalW,height:totalH,pointerEvents:'none',overflow:'visible'}}>
          {[0,1,2].map(ri=>{
            const offsetX=COL_W.slice(0,ri).reduce((a,b)=>a+b,0)+ri*COL_GAP;
            return<g key={ri} transform={`translate(${offsetX},0)`}><Connectors ri={ri} color={color}/></g>;
          })}
        </svg>
        {rounds.map((round,ri)=>{
          const offsetX=COL_W.slice(0,ri).reduce((a,b)=>a+b,0)+ri*COL_GAP;
          return round.map((game,gi)=>(
            <div key={`${ri}-${gi}`} style={{position:'absolute',left:offsetX,top:slotTop(ri,gi),width:COL_W[ri],height:CARD_H}}>
              {game?<MatchCard game={{...game,region:name}} odds={odds} color={color} onBet={onBet}/>:<TBDSlot/>}
            </div>
          ));
        })}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PlayPage() {
  const [tab,      setTab]      = useState('EAST');
  const [betGame,  setBetGame]  = useState(null);
  const odds   = useOdds();
  const wallet = useWallet();
  const polyAuth = usePolyAuth(wallet);

  return(
    <>
      <Head>
        <title>Bracket Bets — Live Trading · PolyPocket</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/>
        <link rel="shortcut icon" href="/logo.png"/>
      </Head>

      <nav style={navStyle}>
        <Link href="/" style={logoStyle}>
          <img src="/logo.png" alt="PolyPocket" style={{width:32,height:32,borderRadius:8,objectFit:'cover'}}/>
          PolyPocket
        </Link>
        <div style={{display:'flex',alignItems:'center',gap:'0.75rem'}}>
          <Link href="/madness" style={{fontSize:'0.78rem',fontWeight:600,color:'rgba(255,255,255,0.4)',textDecoration:'none'}}>Read Only</Link>
          {polyAuth.status==='ready'
            ? <span style={{fontSize:'0.72rem',fontWeight:700,color:'#22c55e',background:'rgba(34,197,94,0.15)',padding:'3px 10px',borderRadius:99}}>🔑 Authorized</span>
            : wallet?.address && polyAuth.status==='tos-pending'
              ? <button onClick={polyAuth.authorize}
                  style={{fontSize:'0.72rem',fontWeight:700,color:'#22c55e',background:'rgba(34,197,94,0.15)',padding:'3px 10px',borderRadius:99,border:'1px solid rgba(34,197,94,0.4)',cursor:'pointer',fontFamily:'inherit'}}>
                  ✅ I've accepted — Sign
                </button>
              : wallet?.address
                ? <button onClick={polyAuth.openPolymarketTos} disabled={polyAuth.status==='signing'||polyAuth.status==='loading'}
                    style={{fontSize:'0.72rem',fontWeight:700,color:'#fbbf24',background:'rgba(251,191,36,0.15)',padding:'3px 10px',borderRadius:99,border:'none',cursor:'pointer',fontFamily:'inherit'}}>
                    {polyAuth.status==='signing'||polyAuth.status==='loading' ? '⏳ Authorizing…' : '🔑 Authorize'}
                  </button>
                : null
          }
          <WalletButton/>
        </div>
      </nav>

      <div style={{minHeight:'100vh',background:'linear-gradient(160deg,#070510 0%,#120820 50%,#070510 100%)'}}>

        {/* Hero */}
        <div style={{textAlign:'center',padding:'2rem 1rem 1.5rem',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
          <div style={{fontSize:'2.5rem',marginBottom:'0.25rem'}}>🏀</div>
          <h1 style={{fontSize:'clamp(1.6rem,5vw,2.6rem)',fontWeight:900,margin:'0 0 0.35rem',
            background:'linear-gradient(90deg,#f97316,#fbbf24,#ec4899,#f97316)',
            WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',
            backgroundSize:'300% auto',animation:'shimmer 4s linear infinite'}}>
            Bracket Bets — Live
          </h1>
          <p style={{fontSize:'0.85rem',color:'rgba(255,255,255,0.45)',margin:'0 0 0.5rem'}}>
            Tap any glowing game card to place a bet directly. Powered by Polymarket.
          </p>
          <div style={{display:'inline-flex',alignItems:'center',gap:'0.5rem',
            fontSize:'0.72rem',fontWeight:700,color:'rgba(255,255,255,0.35)',
            background:'rgba(255,255,255,0.05)',padding:'4px 12px',borderRadius:99,marginBottom:'1.25rem'}}>
            <span style={{width:6,height:6,borderRadius:'50%',background:'#22c55e',display:'inline-block'}}/>
            Non-custodial · Polygon · USDC · Orders via Polymarket CLOB
          </div>
          <br/>
          <a href="https://polymarket.com/event/2026-ncaa-tournament-winner" target="_blank" rel="noopener noreferrer"
            style={{display:'inline-flex',alignItems:'center',gap:'0.5rem',
              background:'linear-gradient(135deg,#f97316,#fbbf24)',
              color:'#1a0800',fontWeight:800,fontSize:'0.9rem',
              padding:'0.7rem 1.5rem',borderRadius:99,textDecoration:'none',
              boxShadow:'0 4px 24px rgba(249,115,22,0.4)'}}>
            🏆 Bet the Champion ↗
          </a>
        </div>

        <main style={{maxWidth:1200,margin:'0 auto',padding:'1.5rem 1rem 4rem'}}>

          {/* Auth notice */}
          {!wallet?.address && (
            <div style={{background:'rgba(251,191,36,0.08)',border:'1px solid rgba(251,191,36,0.25)',
              borderRadius:10,padding:'0.75rem 1rem',marginBottom:'1.5rem',
              fontSize:'0.78rem',color:'rgba(251,191,36,0.9)',textAlign:'center'}}>
              Connect your wallet to place bets. Read-only view is available on the{' '}
              <Link href="/madness" style={{color:'#fbbf24',fontWeight:700}}>Bracket page</Link>.
            </div>
          )}
          {wallet?.address && polyAuth.status!=='ready' && (
            <div style={{background:'rgba(59,130,246,0.08)',border:'1px solid rgba(59,130,246,0.25)',
              borderRadius:10,padding:'0.75rem 1rem',marginBottom:'1.5rem',
              fontSize:'0.78rem',color:'rgba(147,197,253,0.9)',textAlign:'center'}}>
              Click <strong>🔑 Authorize</strong> above — it will open Polymarket to accept their Terms (first time only), then sign one gasless message to connect.
            </div>
          )}

          {/* Region tabs */}
          <div style={{display:'flex',gap:6,marginBottom:'1.25rem',overflowX:'auto',paddingBottom:4}}>
            {Object.keys(BRACKET).map(r=>(
              <button key={r} onClick={()=>setTab(r)} style={{
                padding:'0.45rem 1.2rem',borderRadius:99,border:'none',
                fontWeight:800,fontSize:'0.78rem',cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap',
                background:tab===r?REGION_COLOR[r]:'rgba(255,255,255,0.07)',
                color:tab===r?'white':'rgba(255,255,255,0.5)',
                boxShadow:tab===r?`0 0 16px ${REGION_COLOR[r]}66`:'none',
                transition:'all .15s',
              }}>{r}</button>
            ))}
          </div>

          {Object.entries(BRACKET).map(([name,games])=>
            tab===name&&(
              <RegionBracket key={name} name={name} games={games} odds={odds} onBet={g=>setBetGame({...g,region:name})}/>
            )
          )}

          <div style={{display:'flex',gap:'1rem',marginTop:'1.5rem',flexWrap:'wrap'}}>
            {ROUND_LABEL.map((label,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:6,fontSize:'0.65rem',color:'rgba(255,255,255,0.35)'}}>
                <div style={{width:COL_W[i]*0.12,height:2,borderRadius:1,background:`rgba(255,255,255,${0.15+i*0.05})`}}/>
                {label}
              </div>
            ))}
            <div style={{display:'flex',alignItems:'center',gap:6,fontSize:'0.65rem',color:'rgba(255,255,255,0.35)'}}>
              <span style={{fontSize:'0.6rem',fontWeight:800,color:'rgba(255,120,50,0.6)'}}>BET</span>
              Live market — click to bet
            </div>
          </div>
        </main>
      </div>

      {/* Bet modal */}
      {betGame && (
        <BetModal
          game={betGame}
          odds={odds}
          wallet={wallet}
          polyAuth={polyAuth}
          onClose={()=>setBetGame(null)}
        />
      )}

      <style>{`
        @keyframes shimmer {
          0%   { background-position: 0% center; }
          100% { background-position: 300% center; }
        }
      `}</style>
    </>
  );
}

const navStyle = {
  position:'sticky',top:0,zIndex:200,
  display:'flex',justifyContent:'space-between',alignItems:'center',
  padding:'0.6rem 1rem',
  background:'rgba(7,5,16,0.92)',backdropFilter:'blur(12px)',WebkitBackdropFilter:'blur(12px)',
  borderBottom:'1px solid rgba(255,255,255,0.07)',
  paddingLeft:'max(1rem,env(safe-area-inset-left))',
  paddingRight:'max(1rem,env(safe-area-inset-right))',
};
const logoStyle = {
  display:'inline-flex',alignItems:'center',gap:'0.45rem',
  textDecoration:'none',fontWeight:800,fontSize:'0.95rem',color:'white',
};
