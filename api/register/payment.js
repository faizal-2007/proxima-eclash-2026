export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Allow', 'POST');
  return res.status(410).json({
    error: 'This legacy payment endpoint is retired. Submit registration and payment proof together at /api/register.',
  });
}
