import healthHandler from './_handlers/health.js';
import ticketHandler from './_handlers/ticket.js';
import adminLoginHandler from './_handlers/admin/login.js';
import adminRegistrationsHandler from './_handlers/admin/registrations.js';
import adminVolunteersHandler from './_handlers/admin/volunteers.js';
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
  const pathname = new URL(req.url || '/', 'http://localhost').pathname;
  const route = pathname.replace(/^\/api\/?/, '').replace(/\/$/, '');
  const routeHandler = handlers[route];

  if (!routeHandler) {
    return res.status(404).json({ error: `API route ${pathname} not found.` });
  }

  return routeHandler(req, res);
}
