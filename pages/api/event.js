// Single event by ID — GET /api/event?id=<eventId>
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'id required' });

  try {
    const r = await fetch(
      `https://gamma-api.polymarket.com/events/${id}`,
      { headers: { 'User-Agent': 'polypocket/1.0' } }
    );
    const data = await r.json();
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
    return res.status(200).json(data);
  } catch (e) {
    return res.status(502).json({ error: e.message });
  }
}
