/**
 * Vercel Serverless Function: POST /api/admin/login
 * Validates admin password against ADMIN_SECRET_KEY or default developer secret.
 */
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }
  const { password } = req.body || {};
  const configuredSecret = process.env.ADMIN_SECRET_KEY || 'yennex2026';

  if (!password || String(password).trim() !== configuredSecret) {
    return res.status(401).json({
      error: 'Invalid admin credentials. Please enter the correct password.',
    });
  }

  // Generate simple session token
  const token = Buffer.from(`admin:${Date.now()}:${configuredSecret}`).toString('base64');

  return res.status(200).json({
    success: true,
    token,
    message: 'Authentication successful. Access granted to PROXIMA E-CLASH command center.',
  });
}
