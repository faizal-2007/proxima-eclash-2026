import { google } from 'googleapis';
import fs from 'node:fs';
import path from 'node:path';
import { ALLOW_MULTIPLE_GAMES, PAYMENT_CONFIG } from '../../src/config/eventConfig.js';

/**
 * Google Sheets API Helper for PROXIMA E-CLASH 2026
 * Handles Service Account authentication, exponential backoff retries,
 * duplicate checks, and row appends.
 */

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const DEFAULT_SHEET_TITLE = 'E-Clash';
export const quoteSheetRange = (sheetTitle, cellRange) =>
  `'${String(sheetTitle).replace(/'/g, "''")}'!${cellRange}`;
export const PAYMENT_AUDIT_TAB_NAME = 'Payments';
export const PAYMENT_AUDIT_HEADERS = [
  'Timestamp',
  'Event',
  'Registration ID',
  'Campus ID',
  'UTR',
  'Actor',
  'Note',
];

export const SHEET_HEADERS = [
  'Registration ID',
  'Timestamp (UTC)',
  'Timestamp (IST)',
  'Full Name',
  'Phone Number',
  'Campus ID',
  'Campus Email',
  'Academic Year',
  'Tournament Game',
  'Status',
  'Checked In',
  'Checked In At',
  'Checked In By',
  'Payment UTR',
  'Payment Screenshot',
  'Payment Status',
  'Paid At',
  'Amount',
  'Payment Mode',
  'UTR',
  'Screenshot URL',
  'Paid At (submitted time)',
  'Verification Status',
  'Verified By',
  'Verified At',
  'Note',
];

export const VOLUNTEERS_TAB_NAME = 'Volunteers';
export const VOLUNTEERS_HEADERS = [
  'Volunteer ID',
  'Name',
  'Username',
  'Password Hash',
  'Role',
  'Station',
  'Active',
  'Created At',
];

export const CHECKIN_LOG_TAB_NAME = 'CheckInLog';
export const CHECKIN_LOG_HEADERS = [
  'Timestamp',
  'Registration ID',
  'Game',
  'Result',
  'Volunteer ID',
  'Volunteer Name',
  'Station',
  'Note',
];

/**
 * Clean up private key string from environment variables:
 * - Replace escaped literal '\\n' with actual newlines
 * - Strip surrounding quotes if present
 */
function sanitizePrivateKey(key) {
  if (!key) return '';
  let cleaned = key.trim();
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1);
  }
  return cleaned.replace(/\\n/g, '\n');
}

/**
 * Auto-load .env file in Node runtime if running locally and process.loadEnvFile is available
 */
if (typeof process !== 'undefined' && typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile('.env');
  } catch {
    // .env not present or already loaded, safe to ignore
  }
}

/**
 * Returns an authenticated Google Sheets v4 client instance,
 * or null if credentials are not configured in environment.
 * Supports:
 * 1. GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY
 * 2. GOOGLE_SERVICE_ACCOUNT_JSON (entire JSON string from Google Cloud)
 * 3. GOOGLE_SHEETS_API_KEY (direct API Key)
 */
export function getSheetsClient() {
  let clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKeyRaw = process.env.GOOGLE_PRIVATE_KEY;

  // Check if service-account.json or credentials.json file exists in workspace
  try {
    const potentialPaths = [
      path.resolve(process.cwd(), 'service-account.json'),
      path.resolve(process.cwd(), 'credentials.json'),
    ];
    for (const p of potentialPaths) {
      if (fs.existsSync(p)) {
        const fileContent = fs.readFileSync(p, 'utf-8');
        const parsed = JSON.parse(fileContent);
        if (parsed.client_email && parsed.private_key) {
          clientEmail = parsed.client_email;
          privateKeyRaw = parsed.private_key;
          break;
        }
      }
    }
  } catch (err) {
    // Non-fatal if file cannot be read
  }

  // Support pasting the entire service account JSON file content into GOOGLE_SERVICE_ACCOUNT_JSON
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON && (!clientEmail || !privateKeyRaw)) {
    try {
      const parsed = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON.trim());
      clientEmail = parsed.client_email || clientEmail;
      privateKeyRaw = parsed.private_key || privateKeyRaw;
    } catch (err) {
      console.warn('[GoogleSheets] Could not parse GOOGLE_SERVICE_ACCOUNT_JSON:', err.message);
    }
  }

  // Option A: Service Account JWT (Required for writing rows to Google Sheets)
  if (clientEmail && privateKeyRaw) {
    const privateKey = sanitizePrivateKey(privateKeyRaw);
    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: SCOPES,
    });
    return google.sheets({ version: 'v4', auth });
  }

  // Option B: API Key (Supports read operations)
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY || process.env.GOOGLE_API_KEY;
  if (apiKey) {
    return google.sheets({ version: 'v4', auth: apiKey });
  }

  return null;
}

/**
 * Executes an async operation with exponential backoff for transient errors
 * (429 Rate Limit, 500, 502, 503, 504).
 */
export async function executeWithRetry(operation, maxRetries = 3) {
  let attempt = 0;
  let delay = 1000; // start with 1s

  while (attempt < maxRetries) {
    try {
      return await operation();
    } catch (error) {
      attempt++;
      const statusCode = error?.status || error?.response?.status || error?.code;
      const isTransient =
        statusCode === 429 ||
        statusCode === 500 ||
        statusCode === 502 ||
        statusCode === 503 ||
        statusCode === 504 ||
        error?.message?.includes('RESOURCE_EXHAUSTED') ||
        error?.message?.includes('Rate Limit');

      if (!isTransient || attempt >= maxRetries) {
        throw error;
      }

      // Add jitter
      const jitter = Math.random() * 300;
      const sleepTime = delay + jitter;
      console.warn(`[GoogleSheets API] Transient error ${statusCode}. Retrying in ${Math.round(sleepTime)}ms (Attempt ${attempt}/${maxRetries})...`);
      await new Promise((resolve) => setTimeout(resolve, sleepTime));
      delay *= 2; // exponential backoff
    }
  }
}

/**
 * Ensures a specific tab exists with the provided headers and frozen header row.
 */
export async function ensureTabWithHeaders(sheets, spreadsheetId, tabName, headers) {
  return executeWithRetry(async () => {
    const meta = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    const sheetExists = meta.data.sheets?.some(
      (s) => s.properties?.title?.toLowerCase() === tabName.toLowerCase()
    );

    if (!sheetExists) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: tabName,
                  gridProperties: {
                    frozenRowCount: 1,
                  },
                },
              },
            },
          ],
        },
      });

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: quoteSheetRange(tabName, 'A1'),
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [headers],
        },
      });
      return;
    }

    // Check if headers exist
    const headerCheck = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: quoteSheetRange(tabName, '1:1'),
    });

    const currentHeaders = headerCheck.data.values?.[0] || [];
    if (currentHeaders.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: quoteSheetRange(tabName, 'A1'),
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [headers],
        },
      });
    } else if (currentHeaders.length < headers.length) {
      // Append missing columns if header list expanded
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: quoteSheetRange(tabName, 'A1'),
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [headers],
        },
      });
    }
  });
}

/**
 * Ensure all required tabs exist:
 * 1. Main registrations tab (e.g. E-Clash) with registration and payment columns
 * 2. Volunteers tab
 * 3. CheckInLog tab
 */
export async function ensureSheetInitialized(sheets, spreadsheetId, sheetTitle = DEFAULT_SHEET_TITLE) {
  // Initialize main registration sheet
  await ensureTabWithHeaders(sheets, spreadsheetId, sheetTitle, SHEET_HEADERS);

  // Initialize append-only manual payment audit log
  await ensureTabWithHeaders(sheets, spreadsheetId, PAYMENT_AUDIT_TAB_NAME, PAYMENT_AUDIT_HEADERS);

  // Initialize Volunteers tab
  await ensureTabWithHeaders(sheets, spreadsheetId, VOLUNTEERS_TAB_NAME, VOLUNTEERS_HEADERS);

  // Initialize CheckInLog tab
  await ensureTabWithHeaders(sheets, spreadsheetId, CHECKIN_LOG_TAB_NAME, CHECKIN_LOG_HEADERS);
}

/**
 * Checks if a player with matching Campus ID or Campus Email already exists in the sheet.
 * Returns { isDuplicate: boolean, conflictField?: 'campusId' | 'campusEmail' }
 */
export async function checkDuplicateRegistration(sheets, spreadsheetId, sheetTitle = DEFAULT_SHEET_TITLE, campusId, campusEmail) {
  return executeWithRetry(async () => {
    // Read columns E (Campus ID) and F (Campus Email) starting from row 2
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: quoteSheetRange(sheetTitle, 'E2:F'),
    });

    const rows = res.data.values || [];
    const targetId = (campusId || '').trim().toLowerCase();
    const targetEmail = (campusEmail || '').trim().toLowerCase();

    for (let i = 0; i < rows.length; i++) {
      const [rowId, rowEmail] = rows[i];
      if (rowId && rowId.trim().toLowerCase() === targetId) {
        return { isDuplicate: true, conflictField: 'campusId', rowIndex: i + 2 };
      }
      if (rowEmail && rowEmail.trim().toLowerCase() === targetEmail) {
        return { isDuplicate: true, conflictField: 'campusEmail', rowIndex: i + 2 };
      }
    }

    return { isDuplicate: false };
  });
}

/**
 * Appends a new verified registration row to the Google Sheet.
 * Generates an official sequential or padded registration ID (e.g. ECL-2026-0101).
 */
export async function appendRegistration(sheets, spreadsheetId, sheetTitle = DEFAULT_SHEET_TITLE, registrationData) {
  return executeWithRetry(async () => {
    const countRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: quoteSheetRange(sheetTitle, 'A:A'),
    });

    const rowCount = countRes.data.values ? countRes.data.values.length : 1;
    const nextSeq = Math.max(1, rowCount);
    const paddedSeq = String(nextSeq).padStart(4, '0');
    const registrationId = `ECL-2026-${paddedSeq}`;

    const now = new Date();
    const utcTime = now.toISOString();
    const istTime = now.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'medium',
    });

    const rowValues = [
      registrationId,
      utcTime,
      istTime,
      registrationData.fullName.trim(),
      registrationData.phone.trim(),
      registrationData.campusId.trim(),
      registrationData.campusEmail.trim().toLowerCase(),
      registrationData.year,
      registrationData.selection,
      'CONFIRMED',
      'FALSE',
      '',
      '',
      '',
      '',
      'PENDING',
      '',
    ];

    const appendRes = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: quoteSheetRange(sheetTitle, 'A:Q'),
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [rowValues],
      },
    });

    return {
      registrationId,
      updatedRange: appendRes.data.updates?.updatedRange,
      registeredAt: utcTime,
      registeredAtIST: istTime,
    };
  });
}

export async function updatePaymentDetails(sheets, spreadsheetId, sheetTitle = DEFAULT_SHEET_TITLE, registrationId, paymentData) {
  return executeWithRetry(async () => {
    const getRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: quoteSheetRange(sheetTitle, 'A2:Q'),
    });

    const rows = getRes.data.values || [];
    const rowIndex = rows.findIndex((row) => (row[0] || '').trim() === (registrationId || '').trim());

    if (rowIndex === -1) {
      return { success: false, error: 'Registration not found for payment update.' };
    }

    const actualRowIndex = rowIndex + 2;
    const paymentStatus = paymentData.paymentStatus || 'PENDING';
    const updatedValues = [[
      paymentData.utr || '',
      paymentData.paymentScreenshot || '',
      paymentStatus,
      paymentData.paidAt || '',
    ]];

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: quoteSheetRange(sheetTitle, `N${actualRowIndex}:Q${actualRowIndex}`),
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: updatedValues,
      },
    });

    return {
      success: true,
      updatedRow: actualRowIndex,
      paymentStatus,
    };
  });
}

export async function checkPaymentDuplicates(sheets, spreadsheetId, sheetTitle, campusId, campusEmail, utr) {
  return executeWithRetry(async () => {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: quoteSheetRange(sheetTitle, 'A2:Z'),
    });
    const rows = response.data.values || [];
    const targetCampusId = String(campusId || '').trim().toLowerCase();
    const targetEmail = String(campusEmail || '').trim().toLowerCase();
    const targetUtr = String(utr || '').trim();

    for (const row of rows) {
      const existingCampusId = String(row[5] || '').trim().toLowerCase();
      const existingEmail = String(row[6] || '').trim().toLowerCase();
      const existingUtr = String(row[19] || row[13] || '').trim();

      if (existingUtr && existingUtr === targetUtr) {
        return { isDuplicate: true, conflictField: 'utr' };
      }

      if (!ALLOW_MULTIPLE_GAMES && targetCampusId && existingCampusId === targetCampusId) {
        return { isDuplicate: true, conflictField: 'campusId' };
      }

      if (!ALLOW_MULTIPLE_GAMES && targetEmail && existingEmail === targetEmail) {
        return { isDuplicate: true, conflictField: 'campusEmail' };
      }
    }

    return { isDuplicate: false };
  });
}

const removeRegistrationRow = async (sheets, spreadsheetId, sheetTitle, rowNumber) => {
  const metadata = await sheets.spreadsheets.get({ spreadsheetId });
  const sheet = (metadata.data.sheets || []).find(
    (item) => item.properties?.title?.toLowerCase() === sheetTitle.toLowerCase()
  );
  if (!sheet?.properties?.sheetId) {
    throw new Error(`Could not locate the '${sheetTitle}' sheet for transaction rollback.`);
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId: sheet.properties.sheetId,
            dimension: 'ROWS',
            startIndex: rowNumber - 1,
            endIndex: rowNumber,
          },
        },
      }],
    },
  });
};

export async function appendPaymentRegistration(sheets, spreadsheetId, sheetTitle, registrationData) {
  return executeWithRetry(async () => {
    const now = new Date();
    const utcTime = now.toISOString();
    const istTime = now.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'medium',
    });
    const rowValues = [
      '',
      utcTime,
      istTime,
      registrationData.fullName,
      registrationData.phone,
      registrationData.campusId,
      registrationData.campusEmail,
      registrationData.year,
      registrationData.selection,
      'CONFIRMED',
      'FALSE',
      '',
      '',
      registrationData.utr,
      registrationData.screenshotUrl,
      'PENDING',
      utcTime,
      PAYMENT_CONFIG.ENTRY_FEE,
      'UPI_MANUAL',
      registrationData.utr,
      registrationData.screenshotUrl,
      utcTime,
      'UNVERIFIED',
      '',
      '',
      '',
    ];

    const appendResponse = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: quoteSheetRange(sheetTitle, 'A:Z'),
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [rowValues] },
    });
    const updatedRange = appendResponse.data.updates?.updatedRange || '';
    const rowNumber = Number(updatedRange.match(/!A(\d+):Z\d+$/i)?.[1]);
    if (!Number.isInteger(rowNumber) || rowNumber < 2) {
      throw new Error('Google Sheets did not return the appended registration row.');
    }

    const registrationId = `ECL-2026-${String(rowNumber - 1).padStart(4, '0')}`;
    try {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: quoteSheetRange(sheetTitle, `A${rowNumber}:A${rowNumber}`),
        valueInputOption: 'RAW',
        requestBody: { values: [[registrationId]] },
      });
    } catch (error) {
      try {
        await removeRegistrationRow(sheets, spreadsheetId, sheetTitle, rowNumber);
      } catch (rollbackError) {
        console.error('[Payment Registration] Could not remove incomplete sheet row:', rollbackError);
        try {
          await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: quoteSheetRange(sheetTitle, `J${rowNumber}:J${rowNumber}`),
            valueInputOption: 'RAW',
            requestBody: { values: [['PAYMENT_WRITE_FAILED']] },
          });
          await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: quoteSheetRange(sheetTitle, `Z${rowNumber}:Z${rowNumber}`),
            valueInputOption: 'RAW',
            requestBody: { values: [['Incomplete payment registration; retry required.']] },
          });
        } catch (markError) {
          console.error('[Payment Registration] Could not mark incomplete sheet row:', markError);
        }
      }
      throw error;
    }

    return {
      registrationId,
      rowNumber,
      registeredAt: utcTime,
      registeredAtIST: istTime,
    };
  });
}

export async function getRegistrationForTicket(sheets, spreadsheetId, sheetTitle, campusId, campusEmail) {
  return executeWithRetry(async () => {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: quoteSheetRange(sheetTitle, 'A2:Z'),
    });
    const targetCampusId = String(campusId || '').trim().toLowerCase();
    const targetEmail = String(campusEmail || '').trim().toLowerCase();
    const row = (response.data.values || []).find((candidate) =>
      String(candidate[5] || '').trim().toLowerCase() === targetCampusId &&
      String(candidate[6] || '').trim().toLowerCase() === targetEmail
    );

    if (!row || !row[0]) return null;
    return {
      registrationId: row[0],
      registeredAt: row[1] || '',
      registeredAtIST: row[2] || '',
      fullName: row[3] || '',
      phone: row[4] || '',
      campusId: row[5] || '',
      campusEmail: row[6] || '',
      year: row[7] || '',
      game: row[8] || '',
      status: row[9] || 'CONFIRMED',
      paymentAmount: row[17] || '',
      paymentUtr: row[19] || row[13] || '',
      paymentStatus: row[22] || 'VERIFIED',
    };
  });
}

export async function removePaymentRegistration(sheets, spreadsheetId, sheetTitle, registrationId) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: quoteSheetRange(sheetTitle, 'A2:Z'),
  });
  const rowIndex = (response.data.values || []).findIndex(
    (row) => String(row[0] || '').trim() === String(registrationId || '').trim()
  );
  if (rowIndex === -1) return false;
  await removeRegistrationRow(sheets, spreadsheetId, sheetTitle, rowIndex + 2);
  return true;
}

export async function appendPaymentAuditEvent(sheets, spreadsheetId, eventData) {
  return executeWithRetry(async () => {
    await ensureTabWithHeaders(sheets, spreadsheetId, PAYMENT_AUDIT_TAB_NAME, PAYMENT_AUDIT_HEADERS);
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: quoteSheetRange(PAYMENT_AUDIT_TAB_NAME, 'A:G'),
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [[
          eventData.timestamp || new Date().toISOString(),
          eventData.event,
          eventData.registrationId || '',
          eventData.campusId || '',
          eventData.utr || '',
          eventData.actor || 'SYSTEM',
          eventData.note || '',
        ]],
      },
    });
  });
}

/**
 * In-memory cache for volunteers to prevent hitting Google Sheets rate limits on every scan/auth check.
 */
let volunteersCache = {
  data: null,
  fetchedAt: 0,
};
const VOLUNTEERS_CACHE_TTL_MS = 15000; // 15 seconds

export function invalidateVolunteersCache() {
  volunteersCache = { data: null, fetchedAt: 0 };
}

/**
 * Fetch all volunteers from the Volunteers tab.
 */
export async function getVolunteers(sheets, spreadsheetId, bypassCache = false) {
  const now = Date.now();
  if (!bypassCache && volunteersCache.data && now - volunteersCache.fetchedAt < VOLUNTEERS_CACHE_TTL_MS) {
    return volunteersCache.data;
  }

  return executeWithRetry(async () => {
    // Ensure tab exists
    await ensureTabWithHeaders(sheets, spreadsheetId, VOLUNTEERS_TAB_NAME, VOLUNTEERS_HEADERS);

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: quoteSheetRange(VOLUNTEERS_TAB_NAME, 'A2:H'),
    });

    const rows = res.data.values || [];
    const volunteers = rows
      .map((row, index) => ({
        rowIndex: index + 2,
        volunteerId: row[0] || '',
        name: row[1] || '',
        username: (row[2] || '').trim().toLowerCase(),
        passwordHash: row[3] || '',
        role: row[4] || 'volunteer',
        station: row[5] || 'All',
        active: String(row[6] || '').toUpperCase() === 'TRUE',
        createdAt: row[7] || '',
      }))
      .filter((v) => v.volunteerId && v.username);

    volunteersCache = { data: volunteers, fetchedAt: now };
    return volunteers;
  });
}

/**
 * Find volunteer by username (case-insensitive)
 */
export async function getVolunteerByUsername(sheets, spreadsheetId, username, bypassCache = false) {
  const volunteers = await getVolunteers(sheets, spreadsheetId, bypassCache);
  const target = (username || '').trim().toLowerCase();
  return volunteers.find((v) => v.username === target) || null;
}

/**
 * Upsert or insert a volunteer in the Volunteers tab
 */
export async function saveVolunteer(sheets, spreadsheetId, volunteerData) {
  return executeWithRetry(async () => {
    await ensureTabWithHeaders(sheets, spreadsheetId, VOLUNTEERS_TAB_NAME, VOLUNTEERS_HEADERS);
    const existing = await getVolunteers(sheets, spreadsheetId, true);
    const targetUsername = (volunteerData.username || '').trim().toLowerCase();
    const foundIndex = existing.findIndex((v) => v.username === targetUsername);

    const nowIso = new Date().toISOString();
    const rowValues = [
      volunteerData.volunteerId,
      volunteerData.name.trim(),
      targetUsername,
      volunteerData.passwordHash,
      volunteerData.role || 'volunteer',
      volunteerData.station || 'All',
      volunteerData.active ? 'TRUE' : 'FALSE',
      volunteerData.createdAt || nowIso,
    ];

    if (foundIndex >= 0) {
      const rowIndex = existing[foundIndex].rowIndex;
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: quoteSheetRange(VOLUNTEERS_TAB_NAME, `A${rowIndex}:H${rowIndex}`),
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [rowValues],
        },
      });
    } else {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: quoteSheetRange(VOLUNTEERS_TAB_NAME, 'A:H'),
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [rowValues],
        },
      });
    }

    invalidateVolunteersCache();
    return { success: true };
  });
}

/**
 * Delete a volunteer row from the Volunteers tab
 */
export async function deleteVolunteer(sheets, spreadsheetId, volunteerIdOrUsername) {
  return executeWithRetry(async () => {
    await ensureTabWithHeaders(sheets, spreadsheetId, VOLUNTEERS_TAB_NAME, VOLUNTEERS_HEADERS);
    const existing = await getVolunteers(sheets, spreadsheetId, true);
    const target = String(volunteerIdOrUsername || '').trim().toLowerCase();

    const volunteer = existing.find(
      (v) => v.volunteerId.toLowerCase() === target || v.username === target
    );

    if (!volunteer) {
      return { success: false, error: 'Volunteer not found.' };
    }

    const rowIndex = volunteer.rowIndex;

    // Get sheetId for Volunteers tab
    const metaRes = await sheets.spreadsheets.get({ spreadsheetId });
    const volunteerSheet = (metaRes.data.sheets || []).find(
      (s) => s.properties?.title === VOLUNTEERS_TAB_NAME
    );

    if (volunteerSheet) {
      const sheetId = volunteerSheet.properties.sheetId;
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId,
                  dimension: 'ROWS',
                  startIndex: rowIndex - 1, // 0-indexed
                  endIndex: rowIndex, // exclusive
                },
              },
            },
          ],
        },
      });
    }

    invalidateVolunteersCache();
    return { success: true, deleted: volunteer };
  });
}

/**
 * Delete a registration row from the Registrations tab
 */
export async function deleteRegistration(
  sheets,
  spreadsheetId,
  sheetTitle = DEFAULT_SHEET_TITLE,
  registrationId
) {
  return executeWithRetry(async () => {
    const list = await getAllRegistrations(sheets, spreadsheetId, sheetTitle, true);
    const target = String(registrationId || '').trim().toUpperCase();

    const registration = list.find((r) => r.registrationId.toUpperCase() === target);
    if (!registration) {
      return { success: false, error: `Registration '${registrationId}' not found.` };
    }

    const rowIndex = registration.rowIndex;

    // Get spreadsheet metadata to locate sheetId for target tab
    const metaRes = await sheets.spreadsheets.get({ spreadsheetId });
    const targetSheet = (metaRes.data.sheets || []).find(
      (s) => s.properties?.title?.toLowerCase() === sheetTitle.toLowerCase()
    ) || (metaRes.data.sheets || [])[0];

    if (targetSheet) {
      const sheetId = targetSheet.properties.sheetId;
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId,
                  dimension: 'ROWS',
                  startIndex: rowIndex - 1, // 0-indexed
                  endIndex: rowIndex, // exclusive
                },
              },
            },
          ],
        },
      });
    }

    invalidateRegistrationsCache();
    return { success: true, deleted: registration };
  });
}

/**
 * In-memory cache for registrations list (10s TTL) to reduce Google Sheets read quotas.
 */
let registrationsCache = {
  data: null,
  fetchedAt: 0,
};
const REGISTRATIONS_CACHE_TTL_MS = 10000;

export function invalidateRegistrationsCache() {
  registrationsCache = { data: null, fetchedAt: 0 };
}

/**
 * Fetch all registrations from Google Sheet.
 */
export async function getAllRegistrations(
  sheets,
  spreadsheetId,
  sheetTitle = DEFAULT_SHEET_TITLE,
  bypassCache = false
) {
  const now = Date.now();
  if (
    !bypassCache &&
    registrationsCache.data &&
    now - registrationsCache.fetchedAt < REGISTRATIONS_CACHE_TTL_MS
  ) {
    return registrationsCache.data;
  }

  return executeWithRetry(async () => {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: quoteSheetRange(sheetTitle, 'A2:M'),
    });

    const rows = res.data.values || [];
    const list = rows.map((row, index) => {
      // Defensively detect if this row was saved in legacy 8/9-column schema (where row[1] is Full Name instead of Timestamp)
      const isLegacy = row.length < 13 && (!row[1] || !/^\d{4}-\d{2}/.test(row[1]));

      if (isLegacy) {
        return {
          rowIndex: index + 2,
          registrationId: (row[0] || '').trim(),
          registeredAt: '',
          registeredAtIST: '',
          fullName: row[1] || '',
          phone: row[2] || '',
          campusId: row[3] || '',
          campusEmail: row[4] || '',
          year: row[5] || '',
          game: row[6] || '',
          status: row[7] || 'CONFIRMED',
          checkedIn: String(row[8] || '').toUpperCase() === 'TRUE',
          checkedInAt: row[9] || '',
          checkedInBy: row[10] || '',
        };
      }

      return {
        rowIndex: index + 2,
        registrationId: (row[0] || '').trim(),
        registeredAt: row[1] || '',
        registeredAtIST: row[2] || '',
        fullName: row[3] || '',
        phone: row[4] || '',
        campusId: row[5] || '',
        campusEmail: row[6] || '',
        year: row[7] || '',
        game: row[8] || '',
        status: row[9] || 'CONFIRMED',
        checkedIn: String(row[10] || '').toUpperCase() === 'TRUE',
        checkedInAt: row[11] || '',
        checkedInBy: row[12] || '',
      };
    }).filter((r) => r.registrationId);

    registrationsCache = { data: list, fetchedAt: now };
    return list;
  });
}

/**
 * Find a single registration by Registration ID.
 */
export async function findRegistrationById(
  sheets,
  spreadsheetId,
  sheetTitle = DEFAULT_SHEET_TITLE,
  registrationId,
  bypassCache = false
) {
  const list = await getAllRegistrations(sheets, spreadsheetId, sheetTitle, bypassCache);
  const target = (registrationId || '').trim().toUpperCase();
  return list.find((r) => r.registrationId.toUpperCase() === target) || null;
}

/**
 * Append an entry to the append-only CheckInLog tab.
 * Columns: Timestamp | Registration ID | Game | Result | Volunteer ID | Volunteer Name | Station | Note
 */
export async function appendCheckInLog(sheets, spreadsheetId, logData) {
  return executeWithRetry(async () => {
    await ensureTabWithHeaders(sheets, spreadsheetId, CHECKIN_LOG_TAB_NAME, CHECKIN_LOG_HEADERS);

    const row = [
      logData.timestamp || new Date().toISOString(),
      logData.registrationId || '',
      logData.game || '',
      logData.result || 'CHECKED_IN',
      logData.volunteerId || '',
      logData.volunteerName || '',
      logData.station || '',
      logData.note || '',
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: quoteSheetRange(CHECKIN_LOG_TAB_NAME, 'A:H'),
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [row],
      },
    });
  });
}

/**
 * Perform check-in with atomic race condition protection:
 * 1. Re-read the row's Checked In cell right before writing.
 * 2. If row is already TRUE, append ALREADY_CHECKED_IN to CheckInLog and return alreadyCheckedIn status without overwriting.
 * 3. Append CHECKED_IN (or WRONG_STATION_OVERRIDE) to CheckInLog.
 * 4. Write Checked In = TRUE, Checked In At, Checked In By to columns K, L, M.
 */
export async function performParticipantCheckIn(
  sheets,
  spreadsheetId,
  sheetTitle = DEFAULT_SHEET_TITLE,
  { registrationId, station, volunteer, override = false, note = '' }
) {
  return executeWithRetry(async () => {
    // 1. Find participant row index
    const participant = await findRegistrationById(
      sheets,
      spreadsheetId,
      sheetTitle,
      registrationId,
      true // bypass cache for latest state
    );

    if (!participant) {
      return {
        success: false,
        status: 'notFound',
        error: `Participant ${registrationId} not found in registration database.`,
      };
    }

    const rowIndex = participant.rowIndex;

    // 2. Race condition check: Re-read the row's exact Checked In status directly from Google Sheet
    const freshRowCheck = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: quoteSheetRange(sheetTitle, `K${rowIndex}:M${rowIndex}`),
    });

    const [checkedInRaw, existingCheckedInAt, existingCheckedInBy] =
      freshRowCheck.data.values?.[0] || [];

    const isAlreadyCheckedIn = String(checkedInRaw || '').toUpperCase() === 'TRUE';

    if (isAlreadyCheckedIn) {
      // Log duplicate attempt in CheckInLog
      await appendCheckInLog(sheets, spreadsheetId, {
        timestamp: new Date().toISOString(),
        registrationId: participant.registrationId,
        game: participant.game,
        result: 'ALREADY_CHECKED_IN',
        volunteerId: volunteer.volunteerId || volunteer.username,
        volunteerName: volunteer.name || volunteer.username,
        station: station || 'All',
        note: `Duplicate scan. Already checked in by ${existingCheckedInBy || 'Staff'} at ${existingCheckedInAt || 'earlier time'}`,
      });

      return {
        success: false,
        status: 'alreadyCheckedIn',
        participant: {
          ...participant,
          checkedIn: true,
          checkedInAt: existingCheckedInAt || participant.checkedInAt,
          checkedInBy: existingCheckedInBy || participant.checkedInBy,
        },
        message: `Already checked in by ${existingCheckedInBy || 'Staff'}${
          existingCheckedInAt ? ` at ${new Date(existingCheckedInAt).toLocaleTimeString('en-IN')}` : ''
        }.`,
      };
    }

    // 3. Log check-in action to CheckInLog audit table first
    const nowIso = new Date().toISOString();
    const resultType = override ? 'WRONG_STATION_OVERRIDE' : 'CHECKED_IN';
    const auditNote = override
      ? `Station override: Assigned ${participant.game}, checked in at ${station}. ${note}`.trim()
      : note;

    await appendCheckInLog(sheets, spreadsheetId, {
      timestamp: nowIso,
      registrationId: participant.registrationId,
      game: participant.game,
      result: resultType,
      volunteerId: volunteer.volunteerId || volunteer.username,
      volunteerName: volunteer.name || volunteer.username,
      station: station || 'All',
      note: auditNote,
    });

    // 4. Write Checked In status to the sheet (Columns K:M)
    const volunteerSign = `${volunteer.name} (${volunteer.volunteerId || volunteer.username})`;
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: quoteSheetRange(sheetTitle, `K${rowIndex}:M${rowIndex}`),
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [['TRUE', nowIso, volunteerSign]],
      },
    });

    invalidateRegistrationsCache();

    return {
      success: true,
      status: 'checkedIn',
      participant: {
        ...participant,
        checkedIn: true,
        checkedInAt: nowIso,
        checkedInBy: volunteerSign,
      },
      checkedInAt: nowIso,
      checkedInBy: volunteerSign,
      message: override
        ? `Successfully checked in with station override (${participant.game} at ${station}).`
        : 'Successfully checked in to arena.',
    };
  });
}

/**
 * Retrieve CheckInLog entries, optionally filtered by volunteerId.
 */
export async function getCheckInLogs(
  sheets,
  spreadsheetId,
  limit = 50,
  volunteerId = null
) {
  return executeWithRetry(async () => {
    await ensureTabWithHeaders(sheets, spreadsheetId, CHECKIN_LOG_TAB_NAME, CHECKIN_LOG_HEADERS);

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: quoteSheetRange(CHECKIN_LOG_TAB_NAME, 'A2:H'),
    });

    const rows = res.data.values || [];
    let logs = rows.map((row, index) => ({
      id: `log-${index + 2}`,
      timestamp: row[0] || '',
      registrationId: row[1] || '',
      game: row[2] || '',
      result: row[3] || '',
      volunteerId: row[4] || '',
      volunteerName: row[5] || '',
      station: row[6] || '',
      note: row[7] || '',
    }));

    if (volunteerId) {
      const vTarget = String(volunteerId).trim().toLowerCase();
      logs = logs.filter(
        (l) =>
          l.volunteerId.toLowerCase() === vTarget ||
          l.volunteerName.toLowerCase().includes(vTarget)
      );
    }

    // Newest first
    logs.reverse();

    if (limit && limit > 0) {
      logs = logs.slice(0, limit);
    }

    return logs;
  });
}

/**
 * Calculate live stats from registrations and check-in logs
 */
export async function getTournamentStats(
  sheets,
  spreadsheetId,
  sheetTitle = DEFAULT_SHEET_TITLE,
  volunteerId = null
) {
  const registrations = await getAllRegistrations(sheets, spreadsheetId, sheetTitle);

  const stats = {
    total: registrations.length,
    checkedIn: 0,
    pending: 0,
    byGame: {
      'Free Fire': { total: 0, checkedIn: 0, pending: 0 },
      'BGMI': { total: 0, checkedIn: 0, pending: 0 },
      'Mini Militia': { total: 0, checkedIn: 0, pending: 0 },
      'Valorant': { total: 0, checkedIn: 0, pending: 0 },
    },
    volunteerScanCount: 0,
  };

  registrations.forEach((p) => {
    const isChecked = Boolean(p.checkedIn);
    if (isChecked) {
      stats.checkedIn += 1;
    } else {
      stats.pending += 1;
    }

    const game = p.game;
    if (stats.byGame[game]) {
      stats.byGame[game].total += 1;
      if (isChecked) {
        stats.byGame[game].checkedIn += 1;
      } else {
        stats.byGame[game].pending += 1;
      }
    } else if (game) {
      stats.byGame[game] = {
        total: 1,
        checkedIn: isChecked ? 1 : 0,
        pending: isChecked ? 0 : 1,
      };
    }

    if (volunteerId && p.checkedInBy) {
      const vTarget = String(volunteerId).toLowerCase();
      if (p.checkedInBy.toLowerCase().includes(vTarget)) {
        stats.volunteerScanCount += 1;
      }
    }
  });

  return stats;
}
