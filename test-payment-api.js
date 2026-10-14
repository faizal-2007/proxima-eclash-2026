import assert from 'node:assert/strict';
import fs from 'node:fs';
import { decodePaymentImage, validatePaymentFields } from './api/_lib/paymentValidation.js';
import registerHandler from './api/_handlers/register/index.js';
import legacyHandler from './api/_handlers/register/eclash.js';
import ticketHandler from './api/_handlers/ticket.js';
import { quoteSheetRange } from './api/_lib/googleSheets.js';
import { EMAIL_CONFIG } from './src/config/eventConfig.js';

const validBody = {
  fullName: 'Asha Rao',
  phone: '9876543210',
  campusId: '12345',
  campusEmail: '12345@yenepoya.edu.in',
  year: '1st Year',
  selection: ['Free Fire', 'eFootball'],
  utr: '123456789012',
  agreeToTerms: true,
  honeypot: '',
};

const validationOptions = {
  emailConfig: EMAIL_CONFIG,
  validGames: ['Free Fire', 'BGMI', 'Mini Militia', 'eFootball', 'Ludo', 'Carrom'],
  groupOne: ['Free Fire', 'BGMI', 'Mini Militia'],
  groupTwo: ['eFootball', 'Ludo', 'Carrom'],
};

const createMockReqRes = (body = {}, method = 'POST') => {
  const req = {
    method,
    body,
    headers: { 'x-vercel-forwarded-for': `192.0.2.${Math.floor(Math.random() * 200) + 1}` },
    query: {},
    url: '/api/test',
  };
  const res = {
    statusCode: 200,
    headers: {},
    data: null,
    setHeader(key, value) {
      this.headers[key] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(value) {
      this.data = value;
      return this;
    },
    end() {
      return this;
    },
  };
  return { req, res };
};

const validFields = validatePaymentFields(validBody, validationOptions);
assert.equal(validFields.valid, true, 'Valid two-game payment form should pass.');
assert.equal(quoteSheetRange('E-Clash', 'A2:M'), "'E-Clash'!A2:M", 'Sheet titles with hyphens must be quoted in A1 ranges.');
assert.equal(quoteSheetRange("Students' Sheet", 'A1'), "'Students'' Sheet'!A1", 'Apostrophes in sheet titles must be escaped.');

assert.equal(
  validatePaymentFields({ ...validBody, utr: '12345678901' }, validationOptions).errors.utr !== undefined,
  true,
  'An 11-digit UTR should fail.'
);
assert.equal(
  validatePaymentFields({ ...validBody, campusEmail: 'other@yenepoya.edu.in' }, validationOptions).errors.campusEmail !== undefined,
  true,
  'A campus email with a mismatched prefix should fail.'
);
assert.equal(
  validatePaymentFields({ ...validBody, selection: ['Free Fire', 'BGMI'] }, validationOptions).errors.selection !== undefined,
  true,
  'Two selections from Group 1 should fail.'
);
assert.equal(
  validatePaymentFields({ ...validBody, phone: '1234567890' }, validationOptions).errors.phone !== undefined,
  true,
  'An invalid Indian mobile number should fail.'
);

const png = fs.readFileSync(new URL('./public/proxima-logo.png', import.meta.url));
const validPng = `data:image/png;base64,${png.toString('base64')}`;
assert.equal(decodePaymentImage(validPng).valid, true, 'A real PNG with matching MIME should pass.');
assert.equal(
  decodePaymentImage(`data:image/png;base64,${Buffer.from('<svg></svg>').toString('base64')}`).valid,
  false,
  'An SVG disguised as PNG should fail magic-byte validation.'
);
assert.equal(
  decodePaymentImage(`data:image/png;base64,${Buffer.alloc(2 * 1024 * 1024 + 1).toString('base64')}`).valid,
  false,
  'A screenshot larger than 2 MB should fail.'
);

const invalidSubmission = createMockReqRes({ ...validBody, utr: 'not-a-utr' });
await registerHandler(invalidSubmission.req, invalidSubmission.res);
assert.equal(invalidSubmission.res.statusCode, 422, 'Invalid submissions must be rejected before ticket creation.');
assert.equal(invalidSubmission.res.data.registrationId, undefined, 'Invalid submissions must not receive a Registration ID.');
assert.equal(invalidSubmission.res.data.qrToken, undefined, 'Invalid submissions must not receive a QR token.');

const noConsentSubmission = createMockReqRes({ ...validBody, agreeToTerms: false, paymentScreenshot: validPng });
await registerHandler(noConsentSubmission.req, noConsentSubmission.res);
assert.equal(noConsentSubmission.res.statusCode, 422, 'Payment terms consent is required.');

const honeypotSubmission = createMockReqRes({ honeypot: 'bot' });
await registerHandler(honeypotSubmission.req, honeypotSubmission.res);
assert.equal(honeypotSubmission.res.statusCode, 202, 'Honeypot submissions must not create tickets.');
assert.equal(honeypotSubmission.res.data.registrationId, undefined);

const originalBlobToken = process.env.BLOB_READ_WRITE_TOKEN;
process.env.BLOB_READ_WRITE_TOKEN = '';
const storageUnavailableSubmission = createMockReqRes({ ...validBody, paymentScreenshot: validPng });
await registerHandler(storageUnavailableSubmission.req, storageUnavailableSubmission.res);
assert.equal(storageUnavailableSubmission.res.statusCode, 503, 'No screenshot store must fail closed.');
assert.equal(storageUnavailableSubmission.res.data.registrationId, undefined, 'Storage failure must not issue a ticket.');
if (originalBlobToken === undefined) delete process.env.BLOB_READ_WRITE_TOKEN;
else process.env.BLOB_READ_WRITE_TOKEN = originalBlobToken;

const oldRouteRequest = createMockReqRes(validBody);
await legacyHandler(oldRouteRequest.req, oldRouteRequest.res);
assert.equal(oldRouteRequest.res.statusCode, 422, 'Legacy registration route must still require payment proof.');
assert.equal(oldRouteRequest.res.data.registrationId, undefined, 'Legacy route must not issue an unpaid ticket.');

const ticketLookup = createMockReqRes({}, 'GET');
ticketLookup.req.query = { campusId: '12345', email: '12345@yenepoya.edu.in' };
const originalSheetId = process.env.GOOGLE_SHEET_ID;
process.env.GOOGLE_SHEET_ID = '';
await ticketHandler(ticketLookup.req, ticketLookup.res);
assert.equal(ticketLookup.res.statusCode, 503, 'Ticket lookup must fail closed when sheet storage is unavailable.');
if (originalSheetId === undefined) delete process.env.GOOGLE_SHEET_ID;
else process.env.GOOGLE_SHEET_ID = originalSheetId;

console.log('Payment API validation tests passed.');
