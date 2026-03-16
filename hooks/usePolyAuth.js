import { useState, useEffect } from 'react';

// EIP-712 typed data for Polymarket L1 auth (derive API key)
const AUTH_DOMAIN = { name: 'ClobAuthDomain', version: '1' }; // no chainId — Polymarket's spec
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

  // Step 1: user opens polymarket.com to accept ToS (first-time only)
  function openPolymarketTos() {
    window.open('https://polymarket.com', '_blank');
    setStatus('tos-pending');
  }

  // Step 2: sign + derive API key
  async function authorize() {
    if (!wallet?.signer || !wallet?.address) return;
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
      // Try derive-api-key first, fall back to POST api-key
      let data, ok;
      for (const method of ['GET', 'POST']) {
        const r = await fetch('/api/poly-auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: wallet.address, signature: sig, timestamp, nonce, httpMethod: method }),
        });
        data = await r.json();
        ok = r.ok && data.apiKey;
        if (ok) break;
      }
      if (!ok) throw new Error(data?.error || 'Could not get API key. Make sure you have accepted Polymarket\'s Terms of Service at polymarket.com.');

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
    if (wallet?.address)
      localStorage.removeItem(`poly_creds_${wallet.address}`);
    setCreds(null);
    setStatus('idle');
  }

  return { creds, status, error, authorize, logout };
}
