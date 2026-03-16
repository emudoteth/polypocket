// GET — checks if the requesting user's IP is allowed to trade on Polymarket
// Proxies polymarket.com/api/geoblock so the check reflects the user's actual IP
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  const clientIp =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.headers['x-real-ip'] ||
    '';

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (clientIp) headers['X-Forwarded-For'] = clientIp;

    const r = await fetch('https://polymarket.com/api/geoblock', { headers });
    const data = await r.json();
    return res.json(data); // { blocked, ip, country, region }
  } catch (e) {
    // If geocheck itself fails, assume allowed (don't block users unnecessarily)
    return res.json({ blocked: false, error: e.message });
  }
}
