import crypto from 'node:crypto';
import { del, put } from '@vercel/blob';
import { ALLOW_MULTIPLE_GAMES, EMAIL_CONFIG, PAYMENT_CONFIG } from '../../../src/config/eventConfig.js';
import {
  appendPaymentAuditEvent,
  appendPaymentRegistration,
  checkPaymentDuplicates,
  getSupabaseClient,
  deleteRegistration,
} from '../../_lib/supabase.js';
import { checkRateLimit, serializeRegistrationSubmission } from '../../_lib/rateLimit.js';
import { decodePaymentImage, validatePaymentFields } from '../../_lib/paymentValidation.js';
import { signQrToken } from '../../_lib/crypto.js';

const VALID_GAMES = ['Free Fire', 'BGMI', 'Mini Militia', 'eFootball', 'Ludo', 'Carrom'];
const GROUP_ONE_GAMES = ['Free Fire', 'BGMI', 'Mini Militia'];
const GROUP_TWO_GAMES = ['eFootball', 'Ludo', 'Carrom'];
const DEFAULT_SHEET_TITLE = 'E-Clash';

const replyRateLimited = (res, retryAfterSeconds) => {
  res.setHeader('Retry-After', String(retryAfterSeconds));
  return res.status(429).json({ error: 'Too many attempts. Please wait a little and try again.' });
};

const makeReservationPath = (kind, value) => {
  const digest = crypto
    .createHmac('sha256', process.env.QR_SECRET)
    .update(`${kind}:${String(value).trim().toLowerCase()}`)
    .digest('hex');
  return `payment-reservations/${digest}.lock`;
};

const isReservationConflict = (error) =>
  error?.name === 'BlobPreconditionFailedError' ||
  error?.code === 'precondition_failed' ||
  error?.status === 412;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const ipRate = checkRateLimit({
    req,
    namespace: 'manual-payment-submit-ip',
    ipLimit: 12,
    windowMs: 60 * 60 * 1000,
  });
  if (!ipRate.allowed) return replyRateLimited(res, ipRate.retryAfterSeconds);

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const campusIdForLimit = String(body.campusId || '').trim();
  const campusRate = checkRateLimit({
    req,
    namespace: 'manual-payment-submit-campus',
    identity: campusIdForLimit,
    ipLimit: 100,
    identityLimit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!campusRate.allowed) return replyRateLimited(res, campusRate.retryAfterSeconds);

  if (String(body.honeypot || '').trim()) {
    return res.status(202).json({ success: true, message: 'Submission received.' });
  }

  const validation = validatePaymentFields(body, {
    emailConfig: EMAIL_CONFIG,
    validGames: VALID_GAMES,
    groupOne: GROUP_ONE_GAMES,
    groupTwo: GROUP_TWO_GAMES,
  });
  if (!validation.valid) {
    return res.status(422).json({
      error: 'Please correct the highlighted registration and payment fields.',
      validationErrors: validation.errors,
    });
  }

  const image = decodePaymentImage(body.paymentScreenshot);
  if (!image.valid) {
    return res.status(422).json({ error: image.error, validationErrors: { paymentScreenshot: image.error } });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(503).json({
      error: 'Payment proof storage is not configured yet. Please try again later.',
      code: 'PAYMENT_STORAGE_UNAVAILABLE',
    });
  }
  const supabase = getSupabaseClient();
  if (
    !supabase ||
    !process.env.QR_SECRET ||
    process.env.QR_SECRET.trim().length < 32 ||
    /proxima-eclash-qr-secret-key/i.test(process.env.QR_SECRET)
  ) {
    return res.status(503).json({
      error: 'Registration storage (Supabase) or ticket signing is not configured yet. Please try again later.',
      code: 'REGISTRATION_STORAGE_UNAVAILABLE',
    });
  }

  return serializeRegistrationSubmission(async () => {
    let screenshotUrl = '';
    let registrationId = '';
    let rowStored = false;
    let keepReservations = false;
    const reservations = [];
    const reservationKeys = [
      { kind: 'utr', value: validation.values.utr, conflictField: 'utr' },
      ...(!ALLOW_MULTIPLE_GAMES
        ? [
            { kind: 'campus-id', value: validation.values.campusId, conflictField: 'campusId' },
            { kind: 'campus-email', value: validation.values.campusEmail, conflictField: 'campusEmail' },
          ]
        : []),
    ].sort((left, right) => makeReservationPath(left.kind, left.value).localeCompare(
      makeReservationPath(right.kind, right.value)
    ));

    try {
      // Blob's no-overwrite write acts as a cross-instance uniqueness reservation.
      for (const reservation of reservationKeys) {
        const pathname = makeReservationPath(reservation.kind, reservation.value);
        try {
          const result = await put(pathname, 'reserved', {
            access: 'public',
            allowOverwrite: false,
            contentType: 'text/plain',
            token: process.env.BLOB_READ_WRITE_TOKEN,
            cacheControlMaxAge: 0,
          });
          reservations.push({ url: result.url, ...reservation });
        } catch (error) {
          if (!isReservationConflict(error)) throw error;
          if (reservation.conflictField === 'utr') {
            try {
              await appendPaymentAuditEvent(supabase, {
                event: 'DUPLICATE_UTR_BLOCKED',
                campusId: validation.values.campusId,
                utr: validation.values.utr,
                actor: 'SYSTEM',
                note: 'A concurrent or previous submission already reserved this UTR.',
              });
            } catch (auditError) {
              console.error('[Payment Registration] Could not write duplicate UTR audit event:', auditError);
            }
            return res.status(409).json({
              error: 'This UTR has already been used.',
              code: 'DUPLICATE_UTR',
              conflictField: 'utr',
            });
          }
          return res.status(409).json({
            error: reservation.conflictField === 'campusId'
              ? 'This Campus ID already has a registration.'
              : 'This campus email already has a registration.',
            code: 'DUPLICATE_REGISTRATION',
            conflictField: reservation.conflictField,
          });
        }
      }

      const duplicate = await checkPaymentDuplicates(
        supabase,
        validation.values.campusId,
        validation.values.campusEmail,
        validation.values.utr
      );

      if (duplicate.isDuplicate) {
        if (duplicate.conflictField === 'utr') {
          try {
            await appendPaymentAuditEvent(supabase, {
              event: 'DUPLICATE_UTR_BLOCKED',
              campusId: validation.values.campusId,
              utr: validation.values.utr,
              actor: 'SYSTEM',
              note: 'Duplicate payment reference was blocked before ticket creation.',
            });
          } catch (auditError) {
            console.error('[Payment Registration] Could not write duplicate UTR audit event:', auditError);
          }
          return res.status(409).json({
            error: 'This UTR has already been used.',
            code: 'DUPLICATE_UTR',
            conflictField: 'utr',
          });
        }
        return res.status(409).json({
          error: duplicate.conflictField === 'campusId'
            ? 'This Campus ID already has a registration.'
            : 'This campus email already has a registration.',
          code: 'DUPLICATE_REGISTRATION',
          conflictField: duplicate.conflictField,
        });
      }

      const format = image.format === 'jpeg' ? 'jpg' : image.format;
      const blobPath = `payment-proofs/${crypto.randomUUID()}.${format}`;
      const blob = await put(blobPath, image.bytes, {
        access: 'public',
        addRandomSuffix: true,
        contentType: image.contentType,
        token: process.env.BLOB_READ_WRITE_TOKEN,
        cacheControlMaxAge: 0,
      });
      screenshotUrl = blob.url;

      const registration = await appendPaymentRegistration(supabase, {
        ...validation.values,
        screenshotUrl,
        selection: validation.values.selection.join(', '),
      });
      registrationId = registration.registrationId;
      rowStored = true;

      await appendPaymentAuditEvent(supabase, {
        timestamp: registration.registeredAt,
        event: 'SUBMITTED',
        registrationId,
        campusId: validation.values.campusId,
        utr: validation.values.utr,
        actor: 'STUDENT',
        note: `Manual UPI payment proof submitted; amount INR ${PAYMENT_CONFIG.ENTRY_FEE}.`,
      });

      const qrToken = signQrToken(registrationId, process.env.QR_SECRET);
      keepReservations = true;
      return res.status(201).json({
        success: true,
        registrationId,
        qrToken,
        registeredAt: registration.registeredAt,
        registeredAtIST: registration.registeredAtIST,
        details: {
          fullName: validation.values.fullName,
          phone: validation.values.phone,
          campusId: validation.values.campusId,
          campusEmail: validation.values.campusEmail,
          year: validation.values.year,
          game: validation.values.selection.join(', '),
          games: validation.values.selection,
          paymentAmount: PAYMENT_CONFIG.ENTRY_FEE,
          paymentStatus: 'UNVERIFIED',
        },
      });
    } catch (error) {
      console.error('[Payment Registration] Submission could not be committed:', error);
      let rollbackSucceeded = true;

      if (rowStored && registrationId) {
        try {
          await deleteRegistration(supabase, registrationId);
        } catch (rollbackError) {
          rollbackSucceeded = false;
          console.error('[Payment Registration] Could not roll back the appended registration row:', rollbackError);
        }
      }
      if (screenshotUrl) {
        try {
          await del(screenshotUrl, { token: process.env.BLOB_READ_WRITE_TOKEN });
        } catch (rollbackError) {
          rollbackSucceeded = false;
          console.error('[Payment Registration] Could not delete the uncommitted payment screenshot:', rollbackError);
        }
      }

      return res.status(503).json({
        error: rollbackSucceeded
          ? 'We could not safely finish your submission. No ticket was created; please retry.'
          : 'Your submission could not be safely completed. Please contact the organizer before trying again.',
        code: 'PAYMENT_SUBMISSION_RETRYABLE',
        retryable: rollbackSucceeded,
      });
    } finally {
      if (!keepReservations && reservations.length) {
        for (const reservation of reservations) {
          try {
            await del(reservation.url, { token: process.env.BLOB_READ_WRITE_TOKEN });
          } catch (error) {
            console.error('[Payment Registration] Could not release a uniqueness reservation:', error);
          }
        }
      }
    }
  });
}
