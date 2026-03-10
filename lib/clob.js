import { ClobClient } from '@polymarket/clob-client';
import { Side, OrderType } from '@polymarket/clob-client';

export { Side, OrderType };

const HOST = 'https://clob.polymarket.com';
const CHAIN_ID = 137; // Polygon mainnet

// Storage keys
const CREDS_KEY = (addr) => `polypocket_creds_${addr.toLowerCase()}`;

/**
 * Get or derive L2 API credentials for a wallet address.
 * Credentials are cached in localStorage to avoid re-signing each session.
 */
export async function getOrDeriveCreds(signer) {
  const address = await signer.getAddress();
  const stored = localStorage.getItem(CREDS_KEY(address));
  if (stored) {
    try { return JSON.parse(stored); } catch {}
  }

  // L1 auth: sign EIP-712 message to derive L2 creds
  const client = new ClobClient(HOST, CHAIN_ID, signer);
  const creds = await client.createOrDeriveApiKey();
  localStorage.setItem(CREDS_KEY(address), JSON.stringify(creds));
  return creds;
}

/**
 * Create an authenticated ClobClient for the given signer.
 */
export async function getClient(signer) {
  const creds = await getOrDeriveCreds(signer);
  return new ClobClient(HOST, CHAIN_ID, signer, creds);
}

/**
 * Place a limit order.
 * @param {object} signer - ethers Signer
 * @param {object} params - { tokenID, price, size, side }
 */
export async function placeOrder(signer, { tokenID, price, size, side }) {
  const client = await getClient(signer);
  const order = await client.createAndPostOrder({
    tokenID,
    price: parseFloat(price),
    size: parseFloat(size),
    side,
    orderType: OrderType.GTC,
  });
  return order;
}

/**
 * Get open orders for the connected wallet.
 */
export async function getOpenOrders(signer) {
  const client = await getClient(signer);
  return client.getOrders({ owner: await signer.getAddress() });
}
