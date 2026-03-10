export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { user, limit = '50' } = req.query;
  if (!user) return res.status(400).json({ error: 'user address required' });

  try {
    const r = await fetch(
      `https://data-api.polymarket.com/positions?user=${user}&limit=${limit}&sizeThreshold=0.01`,
      { headers: { 'User-Agent': 'polypocket/1.0' } }
    );
    const data = await r.json();
    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=20');
    return res.status(200).json(data);
  } catch (e) {
    return res.status(502).json({ error: e.message });
  }
}
