export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { tag, offset = '0', limit = '48' } = req.query;
  const params = new URLSearchParams({
    active: 'true',
    closed: 'false',
    limit,
    offset,
    order: 'volume24hr',
    ascending: 'false',
  });

  // Only apply tag filter when a specific category is selected
  if (tag && tag !== 'all') params.set('tag_slug', tag);

  try {
    const upstream = await fetch(
      `https://gamma-api.polymarket.com/events?${params}`,
      { headers: { 'User-Agent': 'polypocket/1.0' } }
    );
    const data = await upstream.json();
    res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=30');
    return res.status(200).json(data);
  } catch (e) {
    return res.status(502).json({ error: e.message });
  }
}
