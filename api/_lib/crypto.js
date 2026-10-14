import crypto from 'node:crypto';

/**
 * Default fallback secret used in local development if QR_SECRET is unset.
 */
export const DEFAULT_QR_SECRET = 'proxima-eclash-dev-qr-secret-2026';

/**
 * Generate a cryptographically signed QR ticket token.
 * Format: "<REGISTRATION_ID>.<HMAC-SHA256-HEX>"
 * e.g. "ECL-2026-0007.8f3d1b9a4c..."
 *
 * @param {string} registrationId - Unique ID of the registration (e.g. ECL-2026-0001)
 * @param {string} [secret] - Cryptographic secret key (defaults to QR_SECRET env or fallback)
 * @returns {string} - Signed qrToken
 */
export function signQrToken(registrationId, secret = process.env.QR_SECRET || DEFAULT_QR_SECRET) {
  if (!registrationId || typeof registrationId !== 'string') {
    throw new Error('registrationId must be a non-empty string');
  }
  const cleanId = registrationId.trim();
  const signature = crypto
    .createHmac('sha256', secret)
    .update(cleanId)
    .digest('hex');

  return `${cleanId}.${signature}`;
}

/**
 * Verify a QR ticket token using constant-time signature comparison.
 * Prevents timing side-channel attacks.
 *
 * @param {string} qrToken - Raw string scanned from the QR code
 * @param {string} [secret] - Cryptographic secret key (defaults to QR_SECRET env or fallback)
 * @returns {{ valid: boolean, registrationId: string, error?: string, isLegacy?: boolean }}
 */
export function verifyQrToken(qrToken, secret = process.env.QR_SECRET || DEFAULT_QR_SECRET) {
  if (!qrToken || typeof qrToken !== 'string') {
    return { valid: false, registrationId: '', error: 'Empty or invalid QR code format.' };
  }

  const trimmed = qrToken.trim();

  // Handle potential JSON string from legacy ticket passes
  let tokenCandidate = trimmed;
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.qrToken) {
        tokenCandidate = parsed.qrToken;
      } else if (parsed.id) {
        // Legacy unsigned ticket payload
        return {
          valid: false,
          isLegacy: true,
          registrationId: parsed.id,
          error: 'Legacy unsigned ticket detected. Please perform manual check-in verification.',
        };
      }
    } catch {
      // not JSON, continue with raw string
    }
  }

  // Expect format: <REGISTRATION_ID>.<SIGNATURE>
  const dotIndex = tokenCandidate.indexOf('.');
  if (dotIndex === -1) {
    // Check if it's a raw registration ID (legacy backward-compatibility)
    if (/^ECL-2026-\d{4,}$/i.test(tokenCandidate)) {
      return {
        valid: false,
        isLegacy: true,
        registrationId: tokenCandidate.toUpperCase(),
        error: 'Legacy ticket (missing signature). Please verify participant manually in lookup.',
      };
    }
    return { valid: false, registrationId: '', error: 'Invalid ticket format: missing signature.' };
  }

  const registrationId = tokenCandidate.substring(0, dotIndex).trim();
  const signature = tokenCandidate.substring(dotIndex + 1).trim();

  if (!registrationId || !signature) {
    return { valid: false, registrationId, error: 'Malformed ticket token structure.' };
  }

  // Calculate expected signature
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(registrationId)
    .digest('hex');

  const sigBuffer = Buffer.from(signature, 'hex');
  const expectedBuffer = Buffer.from(expectedSignature, 'hex');

  // Length check before timingSafeEqual
  if (sigBuffer.length !== expectedBuffer.length) {
    return { valid: false, registrationId, error: 'Invalid ticket: signature verification failed.' };
  }

  const matches = crypto.timingSafeEqual(sigBuffer, expectedBuffer);
  if (!matches) {
    return { valid: false, registrationId, error: 'Invalid ticket: signature mismatch or tampered code.' };
  }

  return {
    valid: true,
    registrationId,
  };
}
