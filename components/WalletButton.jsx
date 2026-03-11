import { useWallet } from '../hooks/useWallet';

// MetaMask mobile deep link — opens the app and navigates to this dapp
const MM_DEEPLINK = 'https://metamask.app.link/dapp/polypocket.vercel.app';

function hasEthereum() {
  return typeof window !== 'undefined' && !!window.ethereum;
}

export default function WalletButton() {
  const { address, isConnected, onPolygon, connecting, error, connect, disconnect, switchToPolygon } = useWallet();

  if (connecting) {
    return <button style={btnBase} disabled>Connecting…</button>;
  }

  // No wallet detected — show install prompt
  if (!hasEthereum() && !isConnected) {
    return (
      <a href={MM_DEEPLINK} target="_blank" rel="noopener noreferrer"
        style={{ ...btnBase, ...btnConnect, textDecoration: 'none' }}>
        🦊 Get MetaMask
      </a>
    );
  }

  if (!isConnected) {
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'0.25rem' }}>
        <button style={{ ...btnBase, ...btnConnect }} onClick={connect}>
          Connect Wallet
        </button>
        {error && (
          <span style={{ fontSize:'0.65rem', color:'var(--red)', maxWidth:160, textAlign:'center', lineHeight:1.3 }}>
            {error}
          </span>
        )}
      </div>
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
