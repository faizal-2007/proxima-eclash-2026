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
  if (!password) {
    return res.status(400).json({ error: 'Password is required.' });
  }

  const trimmed = String(password).trim();
  const configuredAdminSecret = process.env.ADMIN_SECRET_KEY || 'yennex2026';
  const configuredViewerSecret = process.env.ADMIN_VIEWER_KEY || 'yennexview2026';
  const viewerPasscodes = [
    configuredViewerSecret.toLowerCase(),
    'yennexview2026',
    'viewer2026',
    'proximaview2026',
    'proximaviewer2026',
  ];

  if (trimmed === configuredAdminSecret) {
    // Full admin access
    const token = Buffer.from(`admin:${Date.now()}:${configuredAdminSecret}`).toString('base64');
    return res.status(200).json({
      success: true,
      token,
      role: 'admin',
      message: 'Full administrator access granted to PROXIMA E-CLASH command center.',
    });
  }

  if (viewerPasscodes.includes(trimmed.toLowerCase())) {
    // Read-only viewer access
    const token = Buffer.from(`viewer:${Date.now()}:${configuredViewerSecret}`).toString('base64');
    return res.status(200).json({
      success: true,
      token,
      role: 'viewer',
      message: 'Read-only viewer access granted. You can view registrations without edit permissions.',
    });
  }

  return res.status(401).json({
    error: 'Invalid credentials. Please enter the correct admin or viewer password.',
  });
}
