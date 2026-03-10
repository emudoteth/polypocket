/**
 * Polymarket CLOB client wrapper.
 * @polymarket/clob-client uses Node.js built-ins — all imports are deferred
 * inside async functions so they never execute at module parse time in the browser.
 */

const HOST      = 'https://clob.polymarket.com';
const CHAIN_ID  = 137;

// Re-export enums lazily (accessed after first async call, safe)
export const Side = { BUY: 'BUY', SELL: 'SELL' };
export const OrderType = { GTC: 'GTC', GTD: 'GTD', FOK: 'FOK', FAK: 'FAK' };

const CREDS_KEY = (addr) => `polypocket_creds_${addr.toLowerCase()}`;

async function getClobModule() {
  const mod = await import('@polymarket/clob-client');
  return mod;
}

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
  const { ClobClient } = await getClobModule();
  const client = new ClobClient(HOST, CHAIN_ID, signer);
  const creds = await client.createOrDeriveApiKey();
  localStorage.setItem(CREDS_KEY(address), JSON.stringify(creds));
  return creds;
}

/**
 * Create an authenticated ClobClient for the given signer.
 */
export async function getClient(signer) {
  const { ClobClient } = await getClobModule();
  const creds = await getOrDeriveCreds(signer);
  return new ClobClient(HOST, CHAIN_ID, signer, creds, 0, await signer.getAddress());
}

/**
 * Place a limit order.
 * @param {object} signer  - ethers Signer
 * @param {object} params  - { tokenID, price, size, side }
 */
export async function placeOrder(signer, { tokenID, price, size, side }) {
  const { OrderType: OT } = await getClobModule();
  const client = await getClient(signer);
  const order = await client.createAndPostOrder({
    tokenID,
    price:     parseFloat(price),
    size:      parseFloat(size),
    side:      side === 'SELL' ? 'SELL' : 'BUY',
    orderType: OT.GTC,
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
