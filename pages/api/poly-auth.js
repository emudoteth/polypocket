// POST { address, signature, timestamp, nonce }
// Derives Polymarket L2 API credentials from a wallet-signed EIP-712 message
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { address, signature, timestamp, nonce = 0 } = req.body || {};
  if (!address || !signature || !timestamp)
    return res.status(400).json({ error: 'address, signature, timestamp required' });

  try {
    const r = await fetch('https://clob.polymarket.com/auth/derive-api-key', {
      method: 'GET',
      headers: {
        'POLY_ADDRESS':   address,
        'POLY_SIGNATURE': signature,
        'POLY_TIMESTAMP': String(timestamp),
        'POLY_NONCE':     String(nonce),
        'Content-Type':   'application/json',
      },
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data.error || JSON.stringify(data) });
    return res.json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
