// POST { maker, tokenId, price, size, side }
// Builds unsigned EIP-712 typed data — send to client for signing
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { maker, tokenId, price, size, side = 'BUY' } = req.body || {};
  if (!maker || !tokenId || !price || !size)
    return res.status(400).json({ error: 'maker, tokenId, price, size required' });

  const DECIMALS = 1_000_000; // USDC + CTF tokens both use 6 decimals on Polygon
  const isBuy = side.toUpperCase() === 'BUY';

  // BUY:  makerAmount = USDC spent,    takerAmount = outcome tokens received
  // SELL: makerAmount = tokens given,   takerAmount = USDC received
  const makerAmount = isBuy
    ? String(Math.round(size * DECIMALS))
    : String(Math.round(size * price * DECIMALS));
  const takerAmount = isBuy
    ? String(Math.round((size / price) * DECIMALS))
    : String(Math.round(size * DECIMALS));

  const order = {
    salt:          String(Math.floor(Date.now() * Math.random())),
    maker,
    signer:        maker,
    taker:         '0x0000000000000000000000000000000000000000',
    tokenId,
    makerAmount,
    takerAmount,
    expiration:    '0',   // 0 = GTC (Good Till Cancelled)
    nonce:         '0',
    feeRateBps:    '0',
    side:          isBuy ? '0' : '1',
    signatureType: '0',   // 0 = EOA
  };

  const typedData = {
    domain: {
      name:              'Polymarket CTF Exchange',
      version:           '1',
      chainId:           137,
      verifyingContract: '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E',
    },
    types: {
      Order: [
        { name: 'salt',          type: 'uint256' },
        { name: 'maker',         type: 'address' },
        { name: 'signer',        type: 'address' },
        { name: 'taker',         type: 'address' },
        { name: 'tokenId',       type: 'uint256' },
        { name: 'makerAmount',   type: 'uint256' },
        { name: 'takerAmount',   type: 'uint256' },
        { name: 'expiration',    type: 'uint256' },
        { name: 'nonce',         type: 'uint256' },
        { name: 'feeRateBps',    type: 'uint256' },
        { name: 'side',          type: 'uint8'   },
        { name: 'signatureType', type: 'uint8'   },
      ],
    },
    primaryType: 'Order',
    message: order,
  };

  return res.json({ order, typedData });
}
