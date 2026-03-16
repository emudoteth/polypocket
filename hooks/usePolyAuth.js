import { useState, useEffect } from 'react';

const AUTH_DOMAIN = { name: 'ClobAuthDomain', version: '1', chainId: 137 }; // chainId required per clob-client source
const AUTH_TYPES  = {
  ClobAuth: [
    { name: 'address',   type: 'address' },
    { name: 'timestamp', type: 'string'  },
    { name: 'nonce',     type: 'uint256' },
    { name: 'message',   type: 'string'  },
  ],
};

export function usePolyAuth(wallet) {
  const [creds,   setCreds]   = useState(null);
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
    if (!wallet?.signer || !wallet?.address) return { success: false, error: 'Wallet not connected' };
    setStatus('signing');
    setError(null);
    try {
      const timestamp = String(Date.now());
      const nonce     = 0;

      const sig = await wallet.signer._signTypedData(AUTH_DOMAIN, AUTH_TYPES, {
        address:   wallet.address,
        timestamp,
        nonce,
        message:   'This message attests that I control the given wallet',
      });

      setStatus('loading');

      // Try GET derive-api-key first, then POST api-key as fallback
      let data, ok;
      for (const httpMethod of ['GET', 'POST']) {
        const r = await fetch('/api/poly-auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: wallet.address, signature: sig, timestamp, nonce, httpMethod }),
        });
        data = await r.json();
        ok = r.ok && data.apiKey;
        if (ok) break;
      }

      if (!ok) {
        const msg = data?.error?.toLowerCase?.() || '';
        const needsAccount = msg.includes('derive') || msg.includes('api key') || msg.includes('not found');
        throw new Error(needsAccount
          ? 'No Polymarket account found for this wallet. Visit polymarket.com, connect your wallet and accept their Terms of Service, then come back and try again.'
          : (data?.error || 'Authorization failed'));
      }

      const newCreds = { ...data, address: wallet.address };
      setCreds(newCreds);
      setStatus('ready');
      localStorage.setItem(`poly_creds_${wallet.address}`, JSON.stringify(newCreds));
      return { success: true, creds: newCreds };
    } catch (e) {
      setError(e.message);
      setStatus('error');
      return { success: false, error: e.message };
    }
  }

  function logout() {
    if (wallet?.address) localStorage.removeItem(`poly_creds_${wallet.address}`);
    setCreds(null);
    setStatus('idle');
    setError(null);
  }

  // Retry after error
  function retry() { setStatus('idle'); setError(null); }

  return { creds, status, error, authorize, logout, retry };
}
