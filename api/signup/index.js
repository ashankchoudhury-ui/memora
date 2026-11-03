const { get, list, put } = require('@vercel/blob');

const BLOB_PREFIX = 'signups/';

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, name, source, _honeypot } = req.body || {};

    // Honeypot check
    if (_honeypot) {
      return res.status(200).json({ ok: true, message: 'You\'re on the list!' });
    }

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

    // Check for duplicates
    let isDuplicate = false;
    try {
      const listResult = await list({ prefix: BLOB_PREFIX, token: process.env.BLOB_READ_WRITE_TOKEN });
      const existingBlobs = listResult.blobs || [];
      
      for (const blob of existingBlobs) {
        try {
          const result = await get(blob.pathname, { access: 'private', token: process.env.BLOB_READ_WRITE_TOKEN });
          if (result && result.stream) {
            const chunks = [];
            for await (const chunk of result.stream) {
              chunks.push(chunk);
            }
            const text = Buffer.concat(chunks).toString('utf8');
            const data = JSON.parse(text);
            if (data.email === normalizedEmail) {
              isDuplicate = true;
              break;
            }
          }
        } catch (e) {
          // Skip malformed records
        }
      }
    } catch (listError) {
      console.error('List error:', listError);
      // Continue with empty list
    }

    if (isDuplicate) {
      return res.status(409).json({ error: 'This email is already on the waitlist.' });
    }

    // Store as individual blob
    const filename = `${BLOB_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`;
    await put(filename, JSON.stringify(record), {
      access: 'private',
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: 'application/json'
    });

    return res.status(200).json({
      ok: true,
      code: `mynto-${Math.random().toString(36).slice(2, 6)}`,
      message: "You're on the list! We'll be in touch when early access opens."
    });

  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
};
