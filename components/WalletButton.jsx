/** Wallet connect button — wraps hooks/useWallet.js */
import { useWallet } from '../hooks/useWallet';

const POLYGON_CHAIN_ID = 137;

export default function WalletButton() {
  const { address, chainId, isConnected, onPolygon, connecting, connect, disconnect, switchToPolygon } = useWallet();

  if (connecting) {
    return <button style={btnBase} disabled>Connecting…</button>;
  }

  if (!isConnected) {
    return (
      <button style={{ ...btnBase, ...btnConnect }} onClick={connect}>
        Connect Wallet
      </button>
    );
  }

  if (!onPolygon) {
    return (
      <button style={{ ...btnBase, ...btnWarn }} onClick={switchToPolygon}>
        ⚠️ Switch to Polygon
      </button>
    );
  }

  const short = `${address.slice(0, 6)}…${address.slice(-4)}`;
  return (
    <button
      style={{ ...btnBase, ...btnConnected }}
      onClick={disconnect}
      title={`${address}\nClick to disconnect`}
    >
      <span style={{ width:7, height:7, borderRadius:'50%', background:'#22c55e', display:'inline-block', flexShrink:0 }} />
      {short}
    </button>
  );
}

const btnBase = {
  display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
  padding: '0.45rem 0.9rem', borderRadius: '99px',
  fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
  border: '1.5px solid transparent', transition: 'all .18s',
  fontFamily: 'inherit', whiteSpace: 'nowrap',
};
const btnConnect   = { background: 'linear-gradient(135deg,var(--pink),var(--purple))', color: 'white', border: 'none' };
const btnConnected = { background: 'var(--lilac)', color: 'var(--purple)', border: '1.5px solid var(--purple)' };
const btnWarn      = { background: '#fef9c3', color: '#854d0e', border: '1.5px solid #fbbf24' };
