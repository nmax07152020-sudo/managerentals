export default async function handler(req, res) {
  const allowedOrigins = new Set([
    'https://managerentals-ph.vercel.app',
    'https://localhost',
    'http://localhost',
    'capacitor://localhost',
    'ionic://localhost'
  ]);
  const origin = req.headers.origin;
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Capacitor WebView sends a CORS preflight before cross-origin JSON POST.
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const gasUrl = process.env.GAS_WEB_APP_URL;
  const secret = process.env.RENTFLOW_API_SECRET;
  if (!gasUrl || !secret) {
    return res.status(500).json({ ok: false, error: 'Server environment is not configured' });
  }

  try {
    const upstream = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ ...(req.body || {}), secret })
    });
    const raw = await upstream.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return res.status(502).json({
        ok: false,
        error: `Apps Script returned a non-JSON response (HTTP ${upstream.status}). Check the Web App deployment and access settings.`
      });
    }
    return res.status(data.ok ? 200 : 400).json(data);
  } catch (e) {
    return res.status(502).json({ ok: false, error: e.message || 'Backend connection failed' });
  }
}
