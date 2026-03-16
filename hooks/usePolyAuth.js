import { useState, useEffect } from 'react';

// EIP-712 typed data for Polymarket L1 auth (derive API key)
const AUTH_DOMAIN = { name: 'ClobAuthDomain', version: '1', chainId: 137 };
const AUTH_TYPES  = {
  ClobAuth: [
    { name: 'address',   type: 'address' },
    { name: 'timestamp', type: 'string'  },
    { name: 'nonce',     type: 'uint256' },
    { name: 'message',   type: 'string'  },
  ],
};

export function usePolyAuth(wallet) {
  const [creds,   setCreds]   = useState(null);  // { apiKey, secret, passphrase }
  const [status,  setStatus]  = useState('idle'); // idle | signing | loading | ready | error
  const [error,   setError]   = useState(null);

  // Load cached creds for this wallet address
  useEffect(() => {
    if (!wallet?.address) { setCreds(null); setStatus('idle'); return; }
    try {
      const raw = localStorage.getItem(`poly_creds_${wallet.address}`);
      if (raw) { setCreds(JSON.parse(raw)); setStatus('ready'); }
      else        setStatus('idle');
    } catch { setStatus('idle'); }
  }, [wallet?.address]);

  async function authorize() {
    if (!wallet?.signer || !wallet?.address) return;
    setStatus('signing');
    setError(null);
    try {
      const timestamp = String(Date.now());
      const nonce     = 0;

      // Sign the Polymarket auth typed data with the connected wallet
      const sig = await wallet.signer._signTypedData(AUTH_DOMAIN, AUTH_TYPES, {
        address:   wallet.address,
        timestamp,
        nonce,
        message:   'This message attests that I control the given wallet',
      });

      setStatus('loading');
      const r = await fetch('/api/poly-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: wallet.address, signature: sig, timestamp, nonce }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || `Auth failed (${r.status})`);

      const newCreds = { ...data, address: wallet.address };
      setCreds(newCreds);
      setStatus('ready');
      localStorage.setItem(`poly_creds_${wallet.address}`, JSON.stringify(newCreds));
    } catch (e) {
      setError(e.message);
      setStatus('error');
    }
  }

  function logout() {
    if (wallet?.address)
      localStorage.removeItem(`poly_creds_${wallet.address}`);
    setCreds(null);
    setStatus('idle');
  }

  return { creds, status, error, authorize, logout };
}
