const { put, list } = require('@vercel/blob');

const BLOB_PREFIX = 'analytics/';

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { type, path, referrer, userAgent } = req.body || {};
    const timestamp = new Date().toISOString();
    const record = {
      type: type || 'pageview',
      path: path || '/',
      referrer: referrer || '',
      userAgent: userAgent || '',
      created_at: timestamp
    };

    const filename = `${BLOB_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`;
    await put(filename, JSON.stringify(record), {
      access: 'private',
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: 'application/json'
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Analytics error:', error);
    return res.status(200).json({ ok: true });
  }
};
