export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok:false, error:'Method not allowed' });
  const gasUrl = process.env.GAS_WEB_APP_URL;
  const secret = process.env.RENTFLOW_API_SECRET;
  if (!gasUrl || !secret) return res.status(500).json({ ok:false, error:'Server environment is not configured' });
  try {
    const upstream = await fetch(gasUrl, {
      method:'POST',
      headers:{'Content-Type':'text/plain;charset=utf-8'},
      body:JSON.stringify({...req.body, secret})
    });
    const raw = await upstream.text();
    let data;
    try { data = JSON.parse(raw); } catch { throw new Error('Apps Script returned an unreadable response. Check web app deployment access.'); }
    return res.status(data.ok ? 200 : 400).json(data);
  } catch (e) {
    return res.status(502).json({ok:false,error:e.message || 'Backend connection failed'});
  }
}