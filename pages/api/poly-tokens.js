// GET ?slug=cbb-siena-duke-2026-03-19
// Returns CTF token IDs for both outcomes of a market
export default async function handler(req, res) {
  const { slug } = req.query;
  if (!slug) return res.status(400).json({ error: 'slug required' });

  try {
    // 1. Get conditionId from Gamma
    const evR = await fetch(`https://gamma-api.polymarket.com/events?slug=${encodeURIComponent(slug)}`);
    const evData = await evR.json();
    const market = evData?.[0]?.markets?.[0];
    if (!market) return res.status(404).json({ error: 'Market not found' });

    const conditionId = market.conditionId;
    const outcomes = JSON.parse(market.outcomes || '[]');

    // 2. Get token IDs from CLOB
    const clobR = await fetch(`https://clob.polymarket.com/markets/${conditionId}`);
    const clobData = await clobR.json();
    const tokens = clobData.tokens || [];

    return res.json({
      conditionId,
      slug,
      active: market.active ?? true,
      minOrderSize: clobData.minimum_order_size ?? 5,
      minTickSize: clobData.minimum_tick_size ?? 0.001,
      tokens: tokens.map((t, i) => ({
        tokenId: t.token_id,
        outcome: t.outcome || outcomes[i] || `Outcome ${i + 1}`,
        price: t.price,
      })),
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
