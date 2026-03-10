export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { category = 'OVERALL', limit = '20' } = req.query;

  try {
    const r = await fetch(
      `https://data-api.polymarket.com/v1/leaderboard?category=${category}&limit=${limit}`,
      { headers: { 'User-Agent': 'polypocket/1.0' } }
    );
    const data = await r.json();
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    return res.status(200).json(data);
  } catch (e) {
    return res.status(502).json({ error: e.message });
  }
}
