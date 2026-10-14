import handler from './api/register/eclash.js';

function createMockReqRes(body = {}, method = 'POST') {
  const req = {
    method,
    body,
    headers: {},
  };
  const res = {
    statusCode: 200,
    headers: {},
    data: null,
    setHeader(key, val) {
      this.headers[key] = val;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.data = payload;
      return this;
    },
    end() {
      return this;
    },
  };
  return { req, res };
}

async function runTests() {
  console.log('[TEST 1] Registration Without Payment Proof Is Rejected:');
  const origSheetId = process.env.GOOGLE_SHEET_ID;
  process.env.GOOGLE_SHEET_ID = ''; // Prevent writing test data to live sheet
  const validPayload = {
    fullName: 'Rahul Sharma',
    phone: '9876543210',
    campusId: '11111',
    campusEmail: '11111@yenepoya.edu.in',
    year: '1st Year',
    selection: 'Free Fire',
    honeypot: '',
  };
  const t1 = createMockReqRes(validPayload);
  await handler(t1.req, t1.res);
  process.env.GOOGLE_SHEET_ID = origSheetId; // Restore sheet ID
  console.log('-> Status:', t1.res.statusCode);
  console.log('-> Error:', t1.res.data?.error);
  if (t1.res.statusCode !== 422) throw new Error('Test 1 failed: unpaid registration was not rejected');
  if (t1.res.data?.registrationId || t1.res.data?.qrToken) {
    throw new Error('Test 1 failed: unpaid registration received a ticket');
  }

  console.log('\n[TEST 2] Campus Email Prefix Mismatch:');
  const mismatchPayload = {
    ...validPayload,
    campusId: '11111',
    campusEmail: 'different@yenepoya.edu.in',
  };
  const t2 = createMockReqRes(mismatchPayload);
  await handler(t2.req, t2.res);
  console.log('-> Status:', t2.res.statusCode);
  console.log('-> Error message:', t2.res.data?.validationErrors?.campusEmail);
  if (t2.res.statusCode !== 422) throw new Error('Test 2 failed');

  console.log('\n[TEST 3] Invalid Phone Number:');
  const badPhonePayload = {
    ...validPayload,
    phone: '12345',
  };
  const t3 = createMockReqRes(badPhonePayload);
  await handler(t3.req, t3.res);
  console.log('-> Status:', t3.res.statusCode);
  console.log('-> Error message:', t3.res.data?.validationErrors?.phone);
  if (t3.res.statusCode !== 422) throw new Error('Test 3 failed');

  console.log('\n[TEST 4] Honeypot Anti-Bot Field:');
  const botPayload = {
    ...validPayload,
    honeypot: 'spam_bot_detected',
  };
  const t4 = createMockReqRes(botPayload);
  await handler(t4.req, t4.res);
  console.log('-> Status:', t4.res.statusCode);
  console.log('-> Result:', t4.res.data);
  if (t4.res.statusCode !== 202) throw new Error('Test 4 failed');

  console.log('\n[TEST 5] Healthcheck Endpoint:');
  const { default: healthHandler } = await import('./api/health.js');
  const t5 = createMockReqRes({}, 'GET');
  await healthHandler(t5.req, t5.res);
  console.log('-> Status:', t5.res.statusCode);
  console.log('-> Result:', t5.res.data);
  if (t5.res.statusCode !== 200) throw new Error('Test 5 failed');

  console.log('\n[TEST 6] QR Cryptographic Signature & Verification (Phase 1):');
  const { signQrToken, verifyQrToken } = await import('./api/_lib/crypto.js');
  const sampleRegId = 'ECL-2026-0042';
  const signedToken = signQrToken(sampleRegId);
  const verifyResult = verifyQrToken(signedToken);
  console.log('-> Sample Signed Token:', signedToken);
  console.log('-> Verification Valid:', verifyResult.valid);
  console.log('-> Extracted Reg ID:', verifyResult.registrationId);
  if (!verifyResult.valid || verifyResult.registrationId !== sampleRegId) {
    throw new Error('Test 6 failed: QR signature verification failed');
  }

  console.log('\n[TEST 7] Tampered QR Token Rejection (Phase 1):');
  const tamperedToken = `${sampleRegId}.badsignature1234567890abcdef1234567890abcdef1234567890abcdef12345678`;
  const tamperedResult = verifyQrToken(tamperedToken);
  console.log('-> Tampered Verification Valid:', tamperedResult.valid);
  console.log('-> Error Message:', tamperedResult.error);
  if (tamperedResult.valid) {
    throw new Error('Test 7 failed: Tampered token was incorrectly accepted');
  }

  console.log('\n[TEST 8] Legacy Unsigned Registration ID Fallback (Phase 1):');
  const legacyId = 'ECL-2026-0005';
  const legacyResult = verifyQrToken(legacyId);
  console.log('-> Legacy Result Valid:', legacyResult.valid);
  console.log('-> Legacy Flag:', legacyResult.isLegacy);
  console.log('-> Extracted Reg ID:', legacyResult.registrationId);
  if (!legacyResult.isLegacy || legacyResult.registrationId !== legacyId) {
    throw new Error('Test 8 failed: Legacy registration fallback failed');
  }

  console.log('\n[TEST 9] Google Sheets Schema & Headers Verification (Phase 1):');
  const { SHEET_HEADERS, VOLUNTEERS_HEADERS, CHECKIN_LOG_HEADERS } = await import('./api/_lib/googleSheets.js');
  console.log('-> Registrations Headers Count:', SHEET_HEADERS.length);
  console.log('-> Checked In Column Present:', SHEET_HEADERS.includes('Checked In'));
  console.log('-> Checked In At Column Present:', SHEET_HEADERS.includes('Checked In At'));
  console.log('-> Checked In By Column Present:', SHEET_HEADERS.includes('Checked In By'));
  console.log('-> Volunteers Headers Count:', VOLUNTEERS_HEADERS.length);
  console.log('-> CheckInLog Headers Count:', CHECKIN_LOG_HEADERS.length);

  if (!SHEET_HEADERS.includes('Checked In') || !SHEET_HEADERS.includes('Checked In At') || !SHEET_HEADERS.includes('Checked In By')) {
    throw new Error('Test 9 failed: Missing check-in columns in SHEET_HEADERS');
  }
  if (VOLUNTEERS_HEADERS.length !== 8 || CHECKIN_LOG_HEADERS.length !== 8) {
    throw new Error('Test 9 failed: Auxiliary tabs header count mismatch');
  }

  console.log('\n[TEST 10] Volunteer Login — Correct Credentials (Campus ID 11111 / 11111):');
  const { default: volunteerLoginHandler } = await import('./api/volunteer/login.js');
  const t10 = createMockReqRes({
    username: '11111',
    password: '11111',
  });
  t10.req.headers = { 'x-forwarded-for': '10.0.0.1' };
  await volunteerLoginHandler(t10.req, t10.res);
  console.log('-> Status:', t10.res.statusCode);
  console.log('-> Role:', t10.res.data?.volunteer?.role);
  console.log('-> Token Present:', Boolean(t10.res.data?.token));
  if (t10.res.statusCode !== 200 || !t10.res.data?.token || t10.res.data?.volunteer?.role !== 'volunteer') {
    throw new Error('Test 10 failed: Correct volunteer login failed');
  }
  const validVolunteerToken = t10.res.data?.token;

  console.log('\n[TEST 11] Volunteer Login — Wrong Password for Campus ID (Phase 2):');
  const t11 = createMockReqRes({
    username: '11111',
    password: 'WrongPassword999',
  });
  t11.req.headers = { 'x-forwarded-for': '10.0.0.2' };
  await volunteerLoginHandler(t11.req, t11.res);
  console.log('-> Status:', t11.res.statusCode);
  console.log('-> Error message:', t11.res.data?.error);
  console.log('-> Remaining attempts:', t11.res.data?.remainingAttempts);
  if (t11.res.statusCode !== 401 || t11.res.data?.error !== 'Invalid username or password.') {
    throw new Error('Test 11 failed: Wrong password did not return 401 with generic error');
  }

  console.log('\n[TEST 12] Volunteer Login — Inactive Volunteer Account Rejection (Campus ID 33333):');
  const t12 = createMockReqRes({
    username: '33333',
    password: '33333',
  });
  t12.req.headers = { 'x-forwarded-for': '10.0.0.3' };
  await volunteerLoginHandler(t12.req, t12.res);
  console.log('-> Status:', t12.res.statusCode);
  console.log('-> Error message:', t12.res.data?.error);
  if (t12.res.statusCode !== 403 || !t12.res.data?.error?.includes('deactivated')) {
    throw new Error('Test 12 failed: Inactive volunteer was not rejected with 403');
  }

  console.log('\n[TEST 13] Token Verification & Expired Token Rejection (Phase 2):');
  const { verifyVolunteerJwt } = await import('./api/_lib/auth.js');
  const jwt = (await import('jsonwebtoken')).default;
  const expiredToken = jwt.sign(
    { sub: 'VOL-001', username: '11111', role: 'volunteer' },
    process.env.VOLUNTEER_JWT_SECRET || 'proxima-volunteer-jwt-dev-secret-2026',
    { expiresIn: '-1s' }
  );
  const expiredVerify = verifyVolunteerJwt(expiredToken);
  console.log('-> Expired Token Valid:', expiredVerify.valid);
  console.log('-> Expired Error:', expiredVerify.error);
  if (expiredVerify.valid || !expiredVerify.error?.includes('expired')) {
    throw new Error('Test 13 failed: Expired token was not rejected');
  }

  const validVerify = verifyVolunteerJwt(validVolunteerToken);
  console.log('-> Valid Token Decoded:', validVerify.valid);
  console.log('-> Decoded Campus ID:', validVerify.payload?.username);
  if (!validVerify.valid || validVerify.payload?.username !== '11111') {
    throw new Error('Test 13 failed: Valid token verification failed');
  }

  console.log('\n[TEST 14] Login Rate Limiting — 5 Failures Trigger 429 Block (Phase 2):');
  const spamIp = '192.168.1.99';
  const spamUser = 'test_rate_limit_campus_id';
  let lastStatus = 0;
  let lastData = null;

  for (let i = 1; i <= 5; i++) {
    const tFail = createMockReqRes({ username: spamUser, password: 'WrongPassword' });
    tFail.req.headers = { 'x-forwarded-for': spamIp };
    await volunteerLoginHandler(tFail.req, tFail.res);
    lastStatus = tFail.res.statusCode;
    lastData = tFail.res.data;
  }

  // 6th attempt must return 429 Too Many Requests
  const tBlocked = createMockReqRes({ username: spamUser, password: 'WrongPassword' });
  tBlocked.req.headers = { 'x-forwarded-for': spamIp };
  await volunteerLoginHandler(tBlocked.req, tBlocked.res);
  console.log('-> 6th Attempt Status:', tBlocked.res.statusCode);
  console.log('-> 6th Attempt Error:', tBlocked.res.data?.error);
  console.log('-> Retry After Seconds:', tBlocked.res.data?.retryAfterSeconds);
  if (tBlocked.res.statusCode !== 429 || !tBlocked.res.data?.error?.includes('Too many failed login attempts')) {
    throw new Error('Test 14 failed: Rate limiter did not return 429 after 5 failed attempts');
  }

  console.log('\n[TEST 15] GET /api/volunteer/me Session Endpoint (Phase 2):');
  const { default: volunteerMeHandler } = await import('./api/volunteer/me.js');
  const t15 = createMockReqRes({}, 'GET');
  t15.req.headers = { authorization: `Bearer ${validVolunteerToken}` };
  await volunteerMeHandler(t15.req, t15.res);
  console.log('-> Status:', t15.res.statusCode);
  console.log('-> Volunteer Name:', t15.res.data?.volunteer?.name);
  if (t15.res.statusCode !== 200 || t15.res.data?.volunteer?.username !== '11111') {
    throw new Error('Test 15 failed: GET /api/volunteer/me session check failed');
  }

  // Ensure test participant ECL-2026-0001 exists and reset to checkedIn: false so tests remain 100% idempotent
  const { getSheetsClient, getAllRegistrations, appendRegistration, invalidateRegistrationsCache } = await import('./api/_lib/googleSheets.js');
  const sheetsClient = getSheetsClient();
  if (sheetsClient && process.env.GOOGLE_SHEET_ID) {
    const list = await getAllRegistrations(sheetsClient, process.env.GOOGLE_SHEET_ID, 'E-CLASH_REGISTRATIONS');
    const existing = list.find((r) => r.registrationId === 'ECL-2026-0001');
    if (!existing) {
      await appendRegistration(sheetsClient, process.env.GOOGLE_SHEET_ID, 'E-CLASH_REGISTRATIONS', {
        registrationId: 'ECL-2026-0001',
        registeredAt: new Date().toISOString(),
        registeredAtIST: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        fullName: 'Aarav Patel',
        phone: '9876543210',
        campusId: '22222',
        campusEmail: '22222@yenepoya.edu.in',
        year: '1st Year',
        selection: 'BGMI',
        game: 'BGMI',
        status: 'CONFIRMED',
      });
    } else {
      await sheetsClient.spreadsheets.values.update({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: `E-CLASH_REGISTRATIONS!I${existing.rowIndex}:M${existing.rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [['BGMI', 'CONFIRMED', 'FALSE', '', '']] },
      });
    }
    invalidateRegistrationsCache();
  }

  console.log('\n[TEST 16] POST /api/volunteer/scan — Valid QR Token at Matching Station (Phase 3):');
  const { default: volunteerScanHandler } = await import('./api/volunteer/scan.js');
  const test16Qr = signQrToken('ECL-2026-0001');
  const t16 = createMockReqRes({
    qrToken: test16Qr,
    station: 'BGMI', // ECL-2026-0001 is registered for BGMI
    autoCheckIn: false,
  });
  t16.req.headers = { authorization: `Bearer ${validVolunteerToken}` };
  await volunteerScanHandler(t16.req, t16.res);
  console.log('-> Status:', t16.res.statusCode);
  console.log('-> Result Status:', t16.res.data?.status);
  console.log('-> Player Game:', t16.res.data?.participant?.game);
  if (t16.res.statusCode !== 200 || t16.res.data?.status !== 'valid' || t16.res.data?.participant?.game !== 'BGMI') {
    throw new Error('Test 16 failed: Valid scan at matching station failed');
  }

  console.log('\n[TEST 17] POST /api/volunteer/scan — Wrong Station Detection (Phase 3):');
  const t17 = createMockReqRes({
    qrToken: test16Qr,
    station: 'Valorant', // Player is registered for BGMI!
    autoCheckIn: false,
  });
  t17.req.headers = { authorization: `Bearer ${validVolunteerToken}` };
  await volunteerScanHandler(t17.req, t17.res);
  console.log('-> Status:', t17.res.statusCode);
  console.log('-> Result Status:', t17.res.data?.status);
  console.log('-> Mismatch Message:', t17.res.data?.message);
  if (t17.res.statusCode !== 200 || t17.res.data?.status !== 'wrongStation') {
    throw new Error('Test 17 failed: Station mismatch was not detected');
  }

  console.log('\n[TEST 18] POST /api/volunteer/scan — Tampered / Forged QR Token (Phase 3):');
  const t18 = createMockReqRes({
    qrToken: 'ECL-2026-0001.0000000000000000000000000000000000000000000000000000000000000000',
    station: 'All',
  });
  t18.req.headers = { authorization: `Bearer ${validVolunteerToken}` };
  await volunteerScanHandler(t18.req, t18.res);
  console.log('-> Status:', t18.res.statusCode);
  console.log('-> Result Status:', t18.res.data?.status);
  console.log('-> Error:', t18.res.data?.error);
  if (t18.res.statusCode !== 200 || t18.res.data?.status !== 'invalid') {
    throw new Error('Test 18 failed: Tampered QR token was not rejected with invalid status');
  }

  console.log('\n[TEST 19] POST /api/volunteer/checkin — Station Override & Check In (Phase 3):');
  const { default: volunteerCheckinHandler } = await import('./api/volunteer/checkin.js');
  const t19 = createMockReqRes({
    registrationId: 'ECL-2026-0001',
    station: 'Valorant',
    override: true,
    note: 'Station override verified by lead',
  });
  t19.req.headers = { authorization: `Bearer ${validVolunteerToken}` };
  await volunteerCheckinHandler(t19.req, t19.res);
  console.log('-> Status:', t19.res.statusCode);
  console.log('-> Check-in Status:', t19.res.data?.status);
  console.log('-> Participant Checked In:', t19.res.data?.participant?.checkedIn);
  if (t19.res.statusCode !== 200 || t19.res.data?.status !== 'checkedIn') {
    throw new Error('Test 19 failed: Manual check-in / station override failed');
  }

  console.log('\n[TEST 20] POST /api/volunteer/scan — Already Checked-In Detection (Phase 3):');
  // ECL-2026-0001 was checked in by Test 19
  const test20Qr = signQrToken('ECL-2026-0001');
  const t20 = createMockReqRes({
    qrToken: test20Qr,
    station: 'All',
    autoCheckIn: false,
  });
  t20.req.headers = { authorization: `Bearer ${validVolunteerToken}` };
  await volunteerScanHandler(t20.req, t20.res);
  console.log('-> Status:', t20.res.statusCode);
  console.log('-> Result Status:', t20.res.data?.status);
  console.log('-> Message:', t20.res.data?.message);
  if (t20.res.statusCode !== 200 || t20.res.data?.status !== 'alreadyCheckedIn') {
    throw new Error('Test 20 failed: Already checked in participant was not flagged as alreadyCheckedIn');
  }

  console.log('\n[TEST 21] GET /api/volunteer/stats — Live Game & Station Check-in Counters (Phase 4):');
  const { default: volunteerStatsHandler } = await import('./api/volunteer/stats.js');
  const t21 = createMockReqRes({}, 'GET');
  t21.req.headers = { authorization: `Bearer ${validVolunteerToken}` };
  await volunteerStatsHandler(t21.req, t21.res);
  console.log('-> Status:', t21.res.statusCode);
  console.log('-> Total Registrations:', t21.res.data?.stats?.total);
  console.log('-> Checked In Count:', t21.res.data?.stats?.checkedIn);
  console.log('-> Free Fire Station Stats:', t21.res.data?.stats?.byGame?.['Free Fire']);
  if (t21.res.statusCode !== 200 || !t21.res.data?.success || typeof t21.res.data?.stats?.total !== 'number') {
    throw new Error('Test 21 failed: Volunteer stats endpoint returned invalid data');
  }

  console.log('\n[TEST 22] GET /api/volunteer/search — Search by Participant Name (Phase 4):');
  const { default: volunteerSearchHandler } = await import('./api/volunteer/search.js');
  const t22 = createMockReqRes({}, 'GET');
  t22.req.headers = { authorization: `Bearer ${validVolunteerToken}` };
  t22.req.query = { q: 'Aarav' };
  await volunteerSearchHandler(t22.req, t22.res);
  console.log('-> Status:', t22.res.statusCode);
  console.log('-> Matched Count:', t22.res.data?.count);
  console.log('-> First Match Name:', t22.res.data?.results?.[0]?.fullName);
  console.log('-> First Match Game:', t22.res.data?.results?.[0]?.game);
  if (t22.res.statusCode !== 200 || !t22.res.data?.results?.some((r) => r.fullName.includes('Aarav'))) {
    throw new Error('Test 22 failed: Search by name did not return expected participant');
  }

  console.log('\n[TEST 23] GET /api/volunteer/search — Search by Campus ID (Phase 4):');
  const t23 = createMockReqRes({}, 'GET');
  t23.req.headers = { authorization: `Bearer ${validVolunteerToken}` };
  t23.req.query = { q: '22222' };
  await volunteerSearchHandler(t23.req, t23.res);
  console.log('-> Status:', t23.res.statusCode);
  console.log('-> Matched Reg ID:', t23.res.data?.results?.[0]?.registrationId);
  if (t23.res.statusCode !== 200 || t23.res.data?.results?.[0]?.campusId !== '22222') {
    throw new Error('Test 23 failed: Search by Campus ID failed');
  }

  console.log('\n[TEST 24] GET /api/volunteer/history — Audit Logs Feed (Phase 4):');
  const { default: volunteerHistoryHandler } = await import('./api/volunteer/history.js');
  const t24 = createMockReqRes({}, 'GET');
  t24.req.headers = { authorization: `Bearer ${validVolunteerToken}` };
  t24.req.query = { limit: '10', filter: 'all' };
  await volunteerHistoryHandler(t24.req, t24.res);
  console.log('-> Status:', t24.res.statusCode);
  console.log('-> Logs Count:', t24.res.data?.count);
  console.log('-> Most Recent Log Result:', t24.res.data?.logs?.[0]?.result);
  console.log('-> Most Recent Volunteer:', t24.res.data?.logs?.[0]?.volunteerName);
  if (t24.res.statusCode !== 200 || !Array.isArray(t24.res.data?.logs) || t24.res.data?.logs.length === 0) {
    throw new Error('Test 24 failed: History audit log endpoint returned no logs');
  }

  console.log('\n[TEST 25] GET /api/volunteer/history?filter=my — Volunteer Scans Filter (Phase 4):');
  const t25 = createMockReqRes({}, 'GET');
  t25.req.headers = { authorization: `Bearer ${validVolunteerToken}` };
  t25.req.query = { limit: '10', filter: 'my' };
  await volunteerHistoryHandler(t25.req, t25.res);
  console.log('-> Status:', t25.res.statusCode);
  console.log('-> My Scans Count:', t25.res.data?.count);
  if (t25.res.statusCode !== 200 || !Array.isArray(t25.res.data?.logs)) {
    throw new Error('Test 25 failed: Filtered history endpoint failed');
  }

  console.log('\n[TEST 26] GET /api/admin/volunteers — Admin Volunteer Roster (Phase 5):');
  const { default: adminVolunteersHandler } = await import('./api/admin/volunteers.js');
  const t26 = createMockReqRes({}, 'GET');
  t26.req.headers = { authorization: 'Bearer admin-authenticated' };
  await adminVolunteersHandler(t26.req, t26.res);
  console.log('-> Status:', t26.res.statusCode);
  console.log('-> Total Volunteers in Roster:', t26.res.data?.count);
  console.log('-> Password Hash Leaked:', Boolean(t26.res.data?.volunteers?.[0]?.passwordHash));
  if (t26.res.statusCode !== 200 || !t26.res.data?.success || t26.res.data?.volunteers?.[0]?.passwordHash) {
    throw new Error('Test 26 failed: Admin volunteers endpoint failed or leaked password hashes');
  }

  console.log('\n[TEST 27] POST /api/admin/volunteers — Admin Creates Volunteer with Assigned Password (Phase 5):');
  const testCampusId = `test_adm_${Date.now().toString().slice(-4)}`;
  const testPassword = 'InitialSecretPass123';
  const t27 = createMockReqRes({
    name: 'Admin Created Test Volunteer',
    campusId: testCampusId,
    password: testPassword,
    station: 'Free Fire',
    active: true,
  }, 'POST');
  t27.req.headers = { authorization: 'Bearer admin-authenticated' };
  await adminVolunteersHandler(t27.req, t27.res);
  console.log('-> Status:', t27.res.statusCode);
  console.log('-> Created Volunteer ID:', t27.res.data?.volunteer?.volunteerId);
  console.log('-> Created Campus ID:', t27.res.data?.volunteer?.username);
  if (t27.res.statusCode !== 201 || !t27.res.data?.volunteer?.volunteerId) {
    throw new Error('Test 27 failed: Admin could not create volunteer');
  }

  const createdVolId = t27.res.data.volunteer.volunteerId;

  console.log('\n[TEST 28] Volunteer Login with Admin-Assigned Password (Phase 5):');
  const t28 = createMockReqRes({
    username: testCampusId,
    password: testPassword,
  });
  await volunteerLoginHandler(t28.req, t28.res);
  console.log('-> Status:', t28.res.statusCode);
  console.log('-> Login Succeeded:', Boolean(t28.res.data?.token));
  if (t28.res.statusCode !== 200 || !t28.res.data?.token) {
    throw new Error('Test 28 failed: Volunteer could not log in with admin-assigned password');
  }

  console.log('\n[TEST 29] PUT /api/admin/volunteers — Admin Alters Volunteer Password (Phase 5):');
  const newAlteredPassword = 'UpdatedNewSecret456';
  const t29 = createMockReqRes({
    volunteerId: createdVolId,
    campusId: testCampusId,
    name: 'Admin Created Test Volunteer (Updated)',
    station: 'Valorant',
    password: newAlteredPassword,
    active: true,
  }, 'PUT');
  t29.req.headers = { authorization: 'Bearer admin-authenticated' };
  await adminVolunteersHandler(t29.req, t29.res);
  console.log('-> Status:', t29.res.statusCode);
  console.log('-> Station Updated:', t29.res.data?.volunteer?.station);
  if (t29.res.statusCode !== 200 || t29.res.data?.volunteer?.station !== 'Valorant') {
    throw new Error('Test 29 failed: Admin could not alter volunteer password and station');
  }

  console.log('\n[TEST 30] Verify Old Password Rejected & New Altered Password Accepted (Phase 5):');
  // Attempt with old password must fail
  const t30Old = createMockReqRes({
    username: testCampusId,
    password: testPassword,
  });
  await volunteerLoginHandler(t30Old.req, t30Old.res);
  console.log('-> Old Password Status (Expected 401):', t30Old.res.statusCode);
  if (t30Old.res.statusCode !== 401) {
    throw new Error('Test 30 failed: Old password was still accepted after admin altered password');
  }

  // Attempt with new password must succeed
  const t30New = createMockReqRes({
    username: testCampusId,
    password: newAlteredPassword,
  });
  await volunteerLoginHandler(t30New.req, t30New.res);
  console.log('-> New Password Status (Expected 200):', t30New.res.statusCode);
  if (t30New.res.statusCode !== 200 || !t30New.res.data?.token) {
    throw new Error('Test 30 failed: New altered password was not accepted');
  }

  console.log('\n[TEST 31] DELETE /api/admin/volunteers — Admin Deletes Volunteer (Phase 5):');
  const t31 = createMockReqRes({}, 'DELETE');
  t31.req.headers = { authorization: 'Bearer admin-authenticated' };
  t31.req.query = { volunteerId: createdVolId };
  await adminVolunteersHandler(t31.req, t31.res);
  console.log('-> Status:', t31.res.statusCode);
  console.log('-> Message:', t31.res.data?.message);
  if (t31.res.statusCode !== 200) {
    throw new Error('Test 31 failed: Admin could not delete volunteer');
  }

  // Attempt login with deleted volunteer must fail with 401
  const t31Check = createMockReqRes({
    username: testCampusId,
    password: newAlteredPassword,
  });
  await volunteerLoginHandler(t31Check.req, t31Check.res);
  console.log('-> Deleted Volunteer Login Status (Expected 401):', t31Check.res.statusCode);
  if (t31Check.res.statusCode !== 401) {
    throw new Error('Test 31 failed: Deleted volunteer was still able to authenticate');
  }

  console.log('\n[TEST 32] DELETE /api/admin/registrations — Admin Deletes Player Registration:');
  const { default: adminRegistrationsHandler } = await import('./api/admin/registrations.js');

  // Subtest A: Missing admin auth receives 401
  const t32Unauth = createMockReqRes({}, 'DELETE');
  t32Unauth.req.query = { registrationId: 'ECL-TEST-9999' };
  await adminRegistrationsHandler(t32Unauth.req, t32Unauth.res);
  console.log('-> Missing Auth Status (Expected 401):', t32Unauth.res.statusCode);
  if (t32Unauth.res.statusCode !== 401) {
    throw new Error('Test 32 failed: Unauthorized DELETE was not blocked with 401');
  }

  // Subtest B: Missing registrationId receives 400
  const t32NoId = createMockReqRes({}, 'DELETE');
  t32NoId.req.headers = { authorization: 'Bearer admin-authenticated' };
  await adminRegistrationsHandler(t32NoId.req, t32NoId.res);
  console.log('-> Missing registrationId Status (Expected 400):', t32NoId.res.statusCode);
  if (t32NoId.res.statusCode !== 400) {
    throw new Error('Test 32 failed: Missing registrationId did not return 400');
  }

  // Subtest C: Create a test registration to safely delete
  const tempPlayerPayload = {
    fullName: 'Test Player To Delete',
    phone: '9876543210',
    campusId: '88888',
    campusEmail: '88888@yenepoya.edu.in',
    year: '2nd Year',
    selection: 'BGMI',
    honeypot: '',
  };
  const t32Create = createMockReqRes(tempPlayerPayload);
  await handler(t32Create.req, t32Create.res);
  const tempRegId = t32Create.res.data?.registrationId;
  console.log('-> Created Temporary Player Reg ID:', tempRegId);

  // Subtest D: Admin deletes the temporary registration
  const t32Delete = createMockReqRes({}, 'DELETE');
  t32Delete.req.headers = { authorization: 'Bearer admin-authenticated' };
  t32Delete.req.query = { registrationId: tempRegId };
  await adminRegistrationsHandler(t32Delete.req, t32Delete.res);
  console.log('-> Delete Status (Expected 200):', t32Delete.res.statusCode);
  console.log('-> Delete Message:', t32Delete.res.data?.message);
  if (t32Delete.res.statusCode !== 200 || !t32Delete.res.data?.success) {
    throw new Error('Test 32 failed: Admin could not delete registration');
  }

  // Subtest E: Repeated delete returns 404 since it's already removed
  const t32Repeat = createMockReqRes({}, 'DELETE');
  t32Repeat.req.headers = { authorization: 'Bearer admin-authenticated' };
  t32Repeat.req.query = { registrationId: tempRegId };
  await adminRegistrationsHandler(t32Repeat.req, t32Repeat.res);
  console.log('-> Repeated Delete Status (Expected 404):', t32Repeat.res.statusCode);
  if (t32Repeat.res.statusCode !== 404 && t32Repeat.res.statusCode !== 200) {
    throw new Error('Test 32 failed: Unexpected status on repeated delete');
  }

  console.log('\n[TEST 33] Registration with New Games (Ludo and Carrom):');
  const ludoPayload = {
    fullName: 'Ananya Rao',
    phone: '9876543211',
    campusId: '22222',
    campusEmail: '22222@yenepoya.edu.in',
    year: '3rd Year',
    selection: 'Ludo',
    honeypot: '',
  };
  const t33Ludo = createMockReqRes(ludoPayload);
  await handler(t33Ludo.req, t33Ludo.res);
  console.log('-> Ludo Registration Status:', t33Ludo.res.statusCode);
  console.log('-> Ludo Reg ID:', t33Ludo.res.data?.registrationId);
  if (t33Ludo.res.statusCode !== 201 || !t33Ludo.res.data?.qrToken) {
    throw new Error('Test 33 failed: Ludo registration was not accepted with 201');
  }

  const carromPayload = {
    fullName: 'Mohammed Zayd',
    phone: '9876543212',
    campusId: '33333',
    campusEmail: '33333@yenepoya.edu.in',
    year: '4th Year',
    selection: 'Carrom',
    honeypot: '',
  };
  const t33Carrom = createMockReqRes(carromPayload);
  await handler(t33Carrom.req, t33Carrom.res);
  console.log('-> Carrom Registration Status:', t33Carrom.res.statusCode);
  console.log('-> Carrom Reg ID:', t33Carrom.res.data?.registrationId);
  if (t33Carrom.res.statusCode !== 201 || !t33Carrom.res.data?.qrToken) {
    throw new Error('Test 33 failed: Carrom registration was not accepted with 201');
  }

  console.log('\n[TEST 34] Invalid Game Selection Rejection:');
  const invalidGamePayload = {
    fullName: 'Invalid Player',
    phone: '9876543213',
    campusId: '44444',
    campusEmail: '44444@yenepoya.edu.in',
    year: '1st Year',
    selection: 'Chess',
    honeypot: '',
  };
  const t34 = createMockReqRes(invalidGamePayload);
  await handler(t34.req, t34.res);
  console.log('-> Invalid Game Status (Expected 422):', t34.res.statusCode);
  console.log('-> Selection Error:', t34.res.data?.validationErrors?.selection);
  if (t34.res.statusCode !== 422 || !t34.res.data?.validationErrors?.selection) {
    throw new Error('Test 34 failed: Invalid game selection was not rejected with 422');
  }

  console.log('\n>>> ALL 34 BACKEND TESTS PASSED SUCCESSFULLY! (INCLUDING LUDO & CARROM EXPANSION) <<<');
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});

