import {
  getRegistrationForTicket,
  getSupabaseClient,
} from '../_lib/supabase.js';
import { checkRateLimit } from '../_lib/rateLimit.js';
import { signQrToken } from '../_lib/crypto.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return res.status(405).json({ error: 'Method not allowed. Use GET.' });
  }

  const url = new URL(req.url || '/api/ticket', 'http://localhost');
  const campusId = String(req.query?.campusId || url.searchParams.get('campusId') || '').trim();
  const email = String(req.query?.email || url.searchParams.get('email') || '').trim().toLowerCase();
  if (!campusId || !email) {
    return res.status(400).json({ error: 'Campus ID and campus email are both required.' });
  }

  const rate = checkRateLimit({
    req,
    namespace: 'ticket-reopen',
    identity: `${campusId}:${email}`,
    ipLimit: 30,
    identityLimit: 8,
    windowMs: 60 * 60 * 1000,
  });
  if (!rate.allowed) {
    res.setHeader('Retry-After', String(rate.retryAfterSeconds));
    return res.status(429).json({ error: 'Too many ticket lookup attempts. Please wait and try again.' });
  }

  const supabase = getSupabaseClient();
  if (!supabase || !process.env.QR_SECRET || process.env.QR_SECRET.length < 32) {
    return res.status(503).json({ error: 'Ticket lookup storage (Supabase) is not configured yet. Please try again later.' });
  }

  try {
    const registration = await getRegistrationForTicket(
      supabase,
      campusId,
      email
    );
    if (!registration) {
      return res.status(404).json({ error: 'No registration matched both the Campus ID and campus email.' });
    }
    if (registration.paymentStatus === 'REJECTED') {
      return res.status(403).json({ error: 'This ticket has been revoked. Please contact the organizer.' });
    }

    return res.status(200).json({
      success: true,
      registrationId: registration.registrationId,
      qrToken: signQrToken(registration.registrationId, process.env.QR_SECRET),
      details: registration,
    });
  } catch (error) {
    console.error('[Ticket Lookup] Could not retrieve registration:', error);
    return res.status(503).json({ error: 'Could not retrieve your ticket right now. Please try again later.' });
  }
}
