export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const params = new URLSearchParams({
      active: 'true',
      limit: '30',
      order: 'volume24hr',
      ascending: 'false',
      closed: 'false',
    });
    const upstream = await fetch(
      `https://gamma-api.polymarket.com/markets?${params}`,
      { headers: { 'User-Agent': 'polypocket/1.0' } }
    );
    const data = await upstream.json();
    res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=30');
    return res.status(200).json(data);
  } catch (e) {
    return res.status(502).json({ error: e.message });
  }
}
