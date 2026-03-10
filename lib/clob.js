/**
 * Polymarket CLOB client helpers.
 *
 * ⚠️  SERVER-SIDE ONLY — @polymarket/clob-client uses Node.js built-ins
 *     (crypto, stream, http, https) that do not exist in the browser.
 *     Import this file only from pages/api/* routes, never from components.
 *
 * Browser wallet connection is handled by hooks/useWallet.js (ethers + window.ethereum).
 * Order placement flow:
 *   1. Browser: collect trade params (tokenID, price, size, side)
 *   2. Browser: send to POST /api/place-order with the user's wallet signer
 *      (or deeplink to polymarket.com for the MVP)
 *   3. Server: use ClobClient to build, sign (with funder creds), and submit the order
 */
import { ClobClient, Side, OrderType } from '@polymarket/clob-client';

export { Side, OrderType };

const HOST     = 'https://clob.polymarket.com';
const CHAIN_ID = 137;

const CREDS_KEY = (addr) => `polypocket_creds_${addr.toLowerCase()}`;

/**
 * Create a ClobClient from an ethers Signer.
 * Derives L2 API credentials on first use and caches in localStorage.
 * Call only from browser code that also handles Node.js polyfills,
 * or better — call from a server-side API route.
 */
export async function getClient(signer) {
  const address = await signer.getAddress();

  let creds = null;
  if (typeof localStorage !== 'undefined') {
    try { creds = JSON.parse(localStorage.getItem(CREDS_KEY(address))); } catch {}
  }

  const client = new ClobClient(HOST, CHAIN_ID, signer, creds, 0, address);

  if (!creds) {
    creds = await client.createOrDeriveApiKey();
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(CREDS_KEY(address), JSON.stringify(creds));
    }
  }

  return client;
}

/**
 * Place a GTC limit order.
 * @param {import('ethers').Signer} signer
 * @param {{ tokenID: string, price: number, size: number, side: string }} params
 */
export async function placeOrder(signer, { tokenID, price, size, side }) {
  const client = await getClient(signer);
  return client.createAndPostOrder({
    tokenID,
    price: parseFloat(price),
    size: parseFloat(size),
    side: side === 'SELL' ? Side.SELL : Side.BUY,
    orderType: OrderType.GTC,
  });
}

/**
 * Fetch open orders for a wallet address.
 */
export async function getOpenOrders(signer) {
  const client = await getClient(signer);
  const address = await signer.getAddress();
  return client.getOrders({ owner: address });
}
