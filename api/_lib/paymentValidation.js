const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const IMAGE_SIGNATURES = {
  png: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  jpeg: Buffer.from([0xff, 0xd8, 0xff]),
};

export const decodePaymentImage = (value) => {
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/i.exec(String(value || ''));
  if (!match) {
    return { valid: false, error: 'Upload a valid JPG, PNG, or WebP payment screenshot.' };
  }

  const format = match[1].toLowerCase();
  const encoded = match[2];
  const bytes = Buffer.from(encoded, 'base64');
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) {
    return { valid: false, error: 'The compressed screenshot must be no larger than 2 MB.' };
  }
  if (bytes.toString('base64') !== encoded) {
    return { valid: false, error: 'The payment screenshot data is malformed. Please upload it again.' };
  }

  const isPng = format === 'png' && bytes.subarray(0, IMAGE_SIGNATURES.png.length).equals(IMAGE_SIGNATURES.png);
  const isValidPng =
    isPng &&
    bytes.length >= 33 &&
    bytes.readUInt32BE(8) === 13 &&
    bytes.toString('ascii', 12, 16) === 'IHDR' &&
    bytes.readUInt32BE(16) > 0 &&
    bytes.readUInt32BE(20) > 0;
  const isJpeg =
    format === 'jpeg' &&
    bytes.length >= 4 &&
    bytes.subarray(0, IMAGE_SIGNATURES.jpeg.length).equals(IMAGE_SIGNATURES.jpeg) &&
    bytes[bytes.length - 2] === 0xff &&
    bytes[bytes.length - 1] === 0xd9;
  const isWebp =
    format === 'webp' &&
    bytes.length >= 12 &&
    bytes.toString('ascii', 0, 4) === 'RIFF' &&
    bytes.readUInt32LE(4) + 8 === bytes.length &&
    bytes.toString('ascii', 8, 12) === 'WEBP';
  if (!isValidPng && !isJpeg && !isWebp) {
    return { valid: false, error: 'The screenshot file type does not match its image contents.' };
  }

  return {
    valid: true,
    format,
    contentType: format === 'jpeg' ? 'image/jpeg' : `image/${format}`,
    bytes,
  };
};

export const validatePaymentFields = (body, { emailConfig, validGames, groupOne, groupTwo }) => {
  const values = {
    fullName: String(body.fullName || '').trim(),
    phone: String(body.phone || '').trim(),
    campusId: String(body.campusId || '').trim(),
    campusEmail: String(body.campusEmail || '').trim().toLowerCase(),
    year: String(body.year || '').trim(),
    selection: Array.isArray(body.selection)
      ? body.selection.map((value) => String(value).trim())
      : typeof body.selection === 'string'
        ? body.selection.split(',').map((value) => value.trim()).filter(Boolean)
        : [],
    utr: String(body.utr || '').trim(),
  };
  const errors = {};

  if (values.fullName.length < 2 || !/^[a-zA-Z\s.'-]+$/.test(values.fullName)) {
    errors.fullName = 'Enter a valid name using letters and standard punctuation.';
  }
  if (!/^[6-9]\d{9}$/.test(values.phone)) {
    errors.phone = 'Enter a valid 10-digit Indian mobile number.';
  }
  if (values.campusId.length < 3 || values.campusId.length > 40) {
    errors.campusId = 'Enter a valid Campus ID.';
  }
  const emailParts = values.campusEmail.split('@');
  if (
    emailParts.length !== 2 ||
    emailParts[1] !== emailConfig.ALLOWED_EMAIL_DOMAIN ||
    (emailConfig.REQUIRE_EMAIL_PREFIX_MATCH &&
      emailParts[0] !== values.campusId.toLowerCase().replace(/\s+/g, ''))
  ) {
    errors.campusEmail = `Use your Campus ID followed by @${emailConfig.ALLOWED_EMAIL_DOMAIN}.`;
  }
  if (!['1st Year', '2nd Year'].includes(values.year)) {
    errors.year = 'Select a valid academic year.';
  }
  const uniqueGames = new Set(values.selection);
  const firstGroupCount = values.selection.filter((game) => groupOne.includes(game)).length;
  const secondGroupCount = values.selection.filter((game) => groupTwo.includes(game)).length;
  const isValidSelection =
    values.selection.length >= 1 &&
    values.selection.length <= 2 &&
    uniqueGames.size === values.selection.length &&
    values.selection.every((game) => validGames.includes(game)) &&
    (
      (values.selection.length === 1 && secondGroupCount === 1) ||
      (values.selection.length === 2 && firstGroupCount === 1 && secondGroupCount === 1) ||
      (values.selection.length === 2 && firstGroupCount === 0 && secondGroupCount === 2)
    );

  if (!isValidSelection) {
    errors.selection = 'Invalid game selection. You can select 1 game from Group 2, or 2 games (1 from Group 1 and 1 from Group 2, or both from Group 2).';
  }
  if (!/^\d{12}$/.test(values.utr)) {
    errors.utr = 'Enter a valid 12-digit UTR / Transaction ID.';
  }
  if (!body.agreeToTerms) {
    errors.agreeToTerms = 'Accept the payment terms before submitting.';
  }

  return { valid: Object.keys(errors).length === 0, values, errors };
};
