import healthHandler from './_handlers/health.js';
import ticketHandler from './_handlers/ticket.js';
import adminLoginHandler from './_handlers/admin/login.js';
import adminCheckInsHandler from './_handlers/admin/checkins.js';
import adminRegistrationsHandler from './_handlers/admin/registrations.js';
import adminVolunteersHandler from './_handlers/admin/volunteers.js';
import adminFixturesHandler from './_handlers/admin/fixtures.js';
import legacyRegisterHandler from './_handlers/register/eclash.js';
import legacyPaymentHandler from './_handlers/register/payment.js';
import registerHandler from './_handlers/register/manualPayment.js';
import volunteerCheckinHandler from './_handlers/volunteer/checkin.js';
import volunteerHistoryHandler from './_handlers/volunteer/history.js';
import volunteerLoginHandler from './_handlers/volunteer/login.js';
import volunteerMeHandler from './_handlers/volunteer/me.js';
import volunteerScanHandler from './_handlers/volunteer/scan.js';
import volunteerSearchHandler from './_handlers/volunteer/search.js';
import volunteerStatsHandler from './_handlers/volunteer/stats.js';

const handlers = {
  'admin/checkins': adminCheckInsHandler,
  'admin/fixtures': adminFixturesHandler,
  'admin/login': adminLoginHandler,
  'admin/registrations': adminRegistrationsHandler,
  'admin/volunteers': adminVolunteersHandler,
  health: healthHandler,
  register: registerHandler,
  'register/eclash': legacyRegisterHandler,
  'register/index': registerHandler,
  'register/manualPayment': registerHandler,
  'register/payment': legacyPaymentHandler,
  ticket: ticketHandler,
  'volunteer/checkin': volunteerCheckinHandler,
  'volunteer/history': volunteerHistoryHandler,
  'volunteer/login': volunteerLoginHandler,
  'volunteer/me': volunteerMeHandler,
  'volunteer/scan': volunteerScanHandler,
  'volunteer/search': volunteerSearchHandler,
  'volunteer/stats': volunteerStatsHandler,
};

export default function handler(req, res) {
  let route = '';

  // 1. Try Vercel dynamic catch-all route parameter (req.query.path)
  if (req.query?.path) {
    if (Array.isArray(req.query.path)) {
      route = req.query.path.join('/');
    } else if (typeof req.query.path === 'string') {
      route = req.query.path;
    }
  }

  // 2. If route is empty or literal '[...path]', inspect req.url
  if (!route || route === '[...path]') {
    const rawUrl = req.url || '/';
    const pathname = new URL(rawUrl, 'http://localhost').pathname;
    const clean = pathname.replace(/^\/api\/?/, '').replace(/\/$/, '');
    if (clean && clean !== '[...path]') {
      route = clean;
    }
  }

  // 3. Fall back to Vercel headers if available
  if (!route || route === '[...path]') {
    const matched = req.headers?.['x-matched-path'] || req.headers?.['x-forwarded-uri'] || '';
    const clean = matched.replace(/^\/api\/?/, '').replace(/\/$/, '');
    if (clean && clean !== '[...path]') {
      route = clean;
    }
  }

  // Clean route of leading/trailing slashes and query strings
  route = (route || '').replace(/^\/+/, '').replace(/\/+$/, '').split('?')[0];

  const routeHandler = handlers[route];

  if (!routeHandler) {
    return res.status(404).json({ error: `API route /api/${route || '[empty]'} not found.` });
  }

  return routeHandler(req, res);
}
