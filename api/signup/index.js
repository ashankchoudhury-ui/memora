import { get } from '@vercel/blob';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, name, source } = req.body || {};

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'A valid email address is required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const timestamp = new Date().toISOString();
    const record = {
      email: normalizedEmail,
      name: (name || '').trim(),
      source: source || 'landing-page',
      created_at: timestamp,
      status: 'pending'
    };

    const { blobs } = await get({ prefix: 'signups/', token: process.env.BLOB_READ_WRITE_TOKEN });

    for await (const blob of blobs) {
      if (blob.size > 0) {
        try {
          const existing = await blob.text();
          if (existing.email === normalizedEmail) {
            return res.status(409).json({ error: 'This email is already on the waitlist.' });
          }
        } catch (_) { /* skip malformed */ }
      }
    }

    const filename = `signups/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`;
    await fetch(filename, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
      body: JSON.stringify(record)
    });

    return res.status(200).json({ ok: true, code: `memora-${Date.now().toString(36).slice(2, 6)}`, message: "You're on the list! We'll be in touch when early access opens." });

  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
}
