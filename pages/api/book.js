export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { token_id } = req.query;
  if (!token_id) return res.status(400).json({ error: 'token_id required' });

  try {
    const upstream = await fetch(
      `https://clob.polymarket.com/book?token_id=${encodeURIComponent(token_id)}`,
      { headers: { 'User-Agent': 'polypocket/1.0' } }
    );
    const data = await upstream.json();
    res.setHeader('Cache-Control', 's-maxage=5, stale-while-revalidate=10');
    return res.status(200).json(data);
  } catch (e) {
    return res.status(502).json({ error: e.message });
  }
}
