export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { market, interval = '1w', fidelity = '100' } = req.query;
  if (!market) return res.status(400).json({ error: 'market required' });

  try {
    const url = `https://clob.polymarket.com/prices-history?market=${encodeURIComponent(market)}&interval=${interval}&fidelity=${fidelity}`;
    const r = await fetch(url, { headers: { 'User-Agent': 'polypocket/1.0' } });
    const data = await r.json();
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
    return res.status(200).json(data);
  } catch (e) {
    return res.status(502).json({ error: e.message });
  }
}
