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

const VALID_GAMES = ['Free Fire', 'BGMI', 'Mini Militia', 'eFootball', 'Carrom'];
const GROUP_ONE_GAMES = ['Free Fire', 'BGMI', 'Mini Militia'];
const GROUP_TWO_GAMES = ['eFootball', 'Carrom'];

const replyRateLimited = (res, retryAfterSeconds) => {
  res.setHeader('Retry-After', String(retryAfterSeconds));
  return res.status(429).json({ error: 'Too many attempts. Please wait a little and try again.' });
};

const makeReservationPath = (kind, value, secret) => {
  const digest = crypto
    .createHmac('sha256', secret)
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

  let image = null;
  if (validation.values.paymentMode === 'UPI') {
    image = decodePaymentImage(body.paymentScreenshot);
    if (!image.valid) {
      return res.status(422).json({ error: image.error, validationErrors: { paymentScreenshot: image.error } });
    }
  }

  const supabase = getSupabaseClient();
  const qrSecret = process.env.QR_SECRET || 'proxima-eclash-qr-secret-key-2026-production';

  if (!supabase) {
    return res.status(503).json({
      error: 'Registration database (Supabase) is not connected yet. Please try again later.',
      code: 'REGISTRATION_STORAGE_UNAVAILABLE',
    });
  }

  return serializeRegistrationSubmission(async () => {
    let screenshotUrl = '';
    let registrationId = '';
    let rowStored = false;
    let keepReservations = false;
    const reservations = [];
    const hasBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

    try {
      // 1. Uniqueness check via Blob locks if Blob token is configured
      if (hasBlob) {
        const reservationKeys = [
          ...(validation.values.utr
            ? [{ kind: 'utr', value: validation.values.utr, conflictField: 'utr' }]
            : []),
          ...(!ALLOW_MULTIPLE_GAMES
            ? [
                { kind: 'campus-id', value: validation.values.campusId, conflictField: 'campusId' },
                { kind: 'campus-email', value: validation.values.campusEmail, conflictField: 'campusEmail' },
              ]
            : []),
        ].sort((left, right) =>
          makeReservationPath(left.kind, left.value, qrSecret).localeCompare(
            makeReservationPath(right.kind, right.value, qrSecret)
          )
        );

        for (const reservation of reservationKeys) {
          const pathname = makeReservationPath(reservation.kind, reservation.value, qrSecret);
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
            if (isReservationConflict(error)) {
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
            } else {
              // Token invalid, expired, or Blob unavailable — fall back gracefully to Supabase DB check
              console.warn('[Vercel Blob] Blob reservation skipped (falling back to database check):', error.message);
              break;
            }
          }
        }
      }

      // 2. Database duplicate check via Supabase PostgreSQL
      const duplicate = await checkPaymentDuplicates(
        supabase,
        validation.values.campusId,
        validation.values.campusEmail,
        validation.values.utr || null
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

      // 3. Upload screenshot: Use Vercel Blob if configured, otherwise Supabase Storage (only for UPI)
      if (validation.values.paymentMode === 'UPI' && image) {
        const format = image.format === 'jpeg' ? 'jpg' : image.format;
        const fileName = `${crypto.randomUUID()}.${format}`;
        let uploaded = false;

        if (hasBlob) {
          try {
            const blobPath = `payment-proofs/${fileName}`;
            const blob = await put(blobPath, image.bytes, {
              access: 'public',
              addRandomSuffix: true,
              contentType: image.contentType,
              token: process.env.BLOB_READ_WRITE_TOKEN,
              cacheControlMaxAge: 0,
            });
            screenshotUrl = blob.url;
            uploaded = true;
          } catch (blobError) {
            console.warn('[Vercel Blob] Upload failed, falling back to Supabase Storage:', blobError.message);
          }
        }

        if (!uploaded) {
          // Upload to Supabase Storage bucket 'payment-proofs'
          const bucketName = 'payment-proofs';
          const { error: uploadError } = await supabase.storage
            .from(bucketName)
            .upload(fileName, image.bytes, {
              contentType: image.contentType,
              upsert: true,
            });

          if (uploadError) {
            // Attempt to create bucket if it does not exist yet
            await supabase.storage.createBucket(bucketName, { public: true }).catch(() => null);
            const retry = await supabase.storage
              .from(bucketName)
              .upload(fileName, image.bytes, {
                contentType: image.contentType,
                upsert: true,
              });

            if (retry.error) {
              console.error('[Supabase Storage] Screenshot upload failed:', retry.error);
              throw new Error(`Failed to store payment proof image: ${retry.error.message}`);
            }
          }

          const { data: publicUrlData } = supabase.storage
            .from(bucketName)
            .getPublicUrl(fileName);

          screenshotUrl = publicUrlData?.publicUrl || '';
        }
      }

      // 4. Save registration to Supabase
      const isCash = validation.values.paymentMode === 'CASH';
      const registration = await appendPaymentRegistration(supabase, {
        ...validation.values,
        screenshotUrl,
        selection: validation.values.selection.join(', '),
        paymentMode: validation.values.paymentMode,
        paymentUtr: validation.values.utr || null,
        paymentStatus: 'PENDING',
        status: isCash ? 'PENDING' : 'CONFIRMED',
      });
      registrationId = registration.registrationId;
      rowStored = true;

      await appendPaymentAuditEvent(supabase, {
        timestamp: registration.registeredAt,
        event: 'SUBMITTED',
        registrationId,
        campusId: validation.values.campusId,
        utr: validation.values.utr || null,
        actor: 'STUDENT',
        note: `${validation.values.paymentMode} payment registration submitted; amount INR ${PAYMENT_CONFIG.ENTRY_FEE}. Status is ${isCash ? 'PENDING' : 'CONFIRMED'}.`,
      });

      const qrToken = signQrToken(registrationId, qrSecret);
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
          paymentMode: validation.values.paymentMode,
          paymentAmount: PAYMENT_CONFIG.ENTRY_FEE,
          paymentStatus: 'PENDING',
          status: isCash ? 'PENDING' : 'CONFIRMED',
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
      if (screenshotUrl && hasBlob) {
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
      if (!keepReservations && reservations.length && hasBlob) {
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
