/**
 * useWallet — bare ethers.js + EIP-1193 wallet hook.
 * No wagmi, no RainbowKit, no WalletConnect required.
 * Works with MetaMask, Brave Wallet, Coinbase Wallet, Rabby, and any
 * browser extension that exposes window.ethereum.
 */
import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

const POLYGON_CHAIN_ID = 137;
const POLYGON_PARAMS = {
  chainId: '0x89',
  chainName: 'Polygon Mainnet',
  nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
  rpcUrls: ['https://polygon-rpc.com'],
  blockExplorerUrls: ['https://polygonscan.com'],
};

export function useWallet() {
  const [address, setAddress]     = useState(null);
  const [chainId, setChainId]     = useState(null);
  const [signer,  setSigner]      = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError]         = useState(null);

  const isConnected = !!address;
  const onPolygon   = chainId === POLYGON_CHAIN_ID;

  // ── Connect ──────────────────────────────────────────────────────────────
  const connect = useCallback(async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      setError('No wallet found — install MetaMask or Brave Wallet');
      return;
    }
    setConnecting(true);
    setError(null);
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const provider = new ethers.providers.Web3Provider(window.ethereum, 'any');
      const s        = provider.getSigner();
      const addr     = await s.getAddress();
      const net      = await provider.getNetwork();
      setSigner(s);
      setAddress(addr);
      setChainId(net.chainId);
      setProviderRef(provider);
    } catch (e) {
      setError(e.message || 'Connection rejected');
    } finally {
      setConnecting(false);
    }
  }, []);

  // ── Disconnect ───────────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    setAddress(null);
    setChainId(null);
    setSigner(null);
  }, []);

  // ── Switch / add Polygon ─────────────────────────────────────────────────
  const switchToPolygon = useCallback(async () => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x89' }],
      });
    } catch (e) {
      if (e.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [POLYGON_PARAMS],
        });
      }
    }
  }, []);

  // ── Auto-connect + listeners ─────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) return;

    // Reconnect silently if already authorized
    window.ethereum.request({ method: 'eth_accounts' }).then((accounts) => {
      if (accounts?.length > 0) connect();
    }).catch(() => {});

    const onAccounts = (accounts) => {
      if (!accounts?.length) disconnect();
      else connect();
    };
    const onChain = () => {
      // Standard practice: reload on chain change so provider/signer stay fresh
      window.location.reload();
    };

    window.ethereum.on('accountsChanged', onAccounts);
    window.ethereum.on('chainChanged', onChain);
    return () => {
      window.ethereum.removeListener('accountsChanged', onAccounts);
      window.ethereum.removeListener('chainChanged', onChain);
    };
  }, [connect, disconnect]);

  return { address, chainId, signer, provider: providerRef, isConnected, onPolygon, connecting, error, connect, disconnect, switchToPolygon };
}
