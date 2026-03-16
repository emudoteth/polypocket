// GET — returns all teams in the 2026 champion market with win odds + Yes tokenId
// Cached for 2 minutes on Vercel edge
export const config = { api: { responseLimit: '4mb' } };

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=60');
  try {
    const evR = await fetch('https://gamma-api.polymarket.com/events?slug=2026-ncaa-tournament-winner&limit=1');
    const [event] = await evR.json();
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const markets = event.markets || [];
    const teams = [];

    for (const m of markets) {
      const outcomes = JSON.parse(m.outcomes || '[]');
      const prices   = JSON.parse(m.outcomePrices || '[]');
      const q        = m.question || '';
      // "Will [TEAM] win the 2026 NCAA Tournament?"
      const match = q.match(/^Will (.+) win the 2026/i);
      if (!match) continue;

      const yesIdx = outcomes.findIndex(o => /^yes$/i.test(o.trim()));
      if (yesIdx === -1) continue;

      const yesPrice = parseFloat(prices[yesIdx] || 0);
      if (yesPrice <= 0) continue;

      teams.push({
        team:        match[1],
        question:    q,
        slug:        m.slug || event.slug,
        conditionId: m.conditionId,
        yesPrice,
        yesPct:      Math.round(yesPrice * 1000) / 10, // 1 decimal
      });
    }

    // Sort by win probability descending
    teams.sort((a, b) => b.yesPrice - a.yesPrice);

    return res.json({ teams, total: teams.length });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
