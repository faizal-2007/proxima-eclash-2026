import { createClient } from '@supabase/supabase-js';
import { ALLOW_MULTIPLE_GAMES } from '../../src/config/eventConfig.js';

// Auto-load .env in Node runtime if running locally
if (typeof process !== 'undefined' && typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile('.env');
  } catch {
    // ignore
  }
}

let supabaseInstance = null;

/**
 * Returns a singleton Supabase client using Service Role credentials
 * for secure serverless API execution.
 */
export function getSupabaseClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  if (!supabaseInstance) {
    supabaseInstance = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return supabaseInstance;
}

// ==============================================================================
// REGISTRATIONS HELPERS
// ==============================================================================

/**
 * Maps Supabase row (snake_case) to standard app camelCase registration object
 */
export function mapRegistrationRow(row) {
  if (!row) return null;
  return {
    registrationId: row.registration_id || '',
    registeredAt: row.registered_at || '',
    registeredAtIST: row.registered_at_ist || '',
    fullName: row.full_name || '',
    phone: row.phone || '',
    campusId: row.campus_id || '',
    campusEmail: row.campus_email || '',
    year: row.year || '',
    game: row.game || '',
    status: row.status || 'CONFIRMED',
    checkedIn: Boolean(row.checked_in),
    checkedInAt: row.checked_in_at || '',
    checkedInBy: row.checked_in_by || '',
    paymentUtr: row.payment_utr || '',
    paymentScreenshot: row.payment_screenshot || '',
    paymentStatus: row.payment_status || 'PENDING',
    paidAt: row.paid_at || '',
    amount: row.amount ?? 49,
    paymentMode: row.payment_mode || 'UPI',
    verificationStatus: row.verification_status || 'VERIFIED',
    verifiedBy: row.verified_by || 'SYSTEM',
    verifiedAt: row.verified_at || '',
    note: row.note || '',
    createdAt: row.created_at || '',
  };
}

/**
 * Fetch all registrations from Supabase
 */
export async function getAllRegistrations(client = getSupabaseClient()) {
  if (!client) return [];

  const { data, error } = await client
    .from('registrations')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Supabase] getAllRegistrations error:', error);
    throw error;
  }

  return (data || []).map(mapRegistrationRow);
}

/**
 * Find single registration by registrationId (e.g. ECL-2026-0001)
 */
export async function findRegistrationById(client = getSupabaseClient(), registrationId) {
  if (!client || !registrationId) return null;

  const target = String(registrationId).trim().toUpperCase();
  const { data, error } = await client
    .from('registrations')
    .select('*')
    .ilike('registration_id', target)
    .maybeSingle();

  if (error) {
    console.error('[Supabase] findRegistrationById error:', error);
    return null;
  }

  return mapRegistrationRow(data);
}

/**
 * Find registration for ticket retrieval by Campus ID and email
 */
export async function getRegistrationForTicket(client = getSupabaseClient(), campusId, email) {
  if (!client || !campusId || !email) return null;

  const cleanCampusId = String(campusId).trim();
  const cleanEmail = String(email).trim().toLowerCase();

  const { data, error } = await client
    .from('registrations')
    .select('*')
    .eq('campus_id', cleanCampusId)
    .ilike('campus_email', cleanEmail)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[Supabase] getRegistrationForTicket error:', error);
    return null;
  }

  return mapRegistrationRow(data);
}

/**
 * Check if a Campus ID, Email, or UTR is already registered
 */
export async function checkPaymentDuplicates(client = getSupabaseClient(), campusId, campusEmail, utr) {
  if (!client) return { isDuplicate: false };

  // 1. Check UTR
  if (utr) {
    const { data: utrMatch } = await client
      .from('registrations')
      .select('registration_id, payment_utr')
      .ilike('payment_utr', String(utr).trim())
      .maybeSingle();

    if (utrMatch) {
      return { isDuplicate: true, conflictField: 'utr', existingRegistrationId: utrMatch.registration_id };
    }
  }

  // 2. Check Campus ID and Email if multiple games not allowed
  if (!ALLOW_MULTIPLE_GAMES) {
    if (campusId) {
      const { data: idMatch } = await client
        .from('registrations')
        .select('registration_id')
        .eq('campus_id', String(campusId).trim())
        .maybeSingle();

      if (idMatch) {
        return { isDuplicate: true, conflictField: 'campusId', existingRegistrationId: idMatch.registration_id };
      }
    }

    if (campusEmail) {
      const { data: emailMatch } = await client
        .from('registrations')
        .select('registration_id')
        .ilike('campus_email', String(campusEmail).trim())
        .maybeSingle();

      if (emailMatch) {
        return { isDuplicate: true, conflictField: 'campusEmail', existingRegistrationId: emailMatch.registration_id };
      }
    }
  }

  return { isDuplicate: false };
}

/**
 * Append or save a new payment registration in Supabase
 */
export async function appendPaymentRegistration(client = getSupabaseClient(), registrationData) {
  if (!client) throw new Error('Supabase client not configured.');

  let regId = registrationData.registrationId;
  if (!regId) {
    const { count } = await client.from('registrations').select('*', { count: 'exact', head: true });
    const nextSeq = (count || 0) + 1;
    regId = `ECL-2026-${String(nextSeq).padStart(4, '0')}`;
  }

  const now = new Date();
  const registeredAt = registrationData.registeredAt || now.toISOString();
  const registeredAtIST = registrationData.registeredAtIST || now.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'medium',
  });

  const row = {
    registration_id: regId,
    registered_at: registeredAt,
    registered_at_ist: registeredAtIST,
    full_name: registrationData.fullName,
    phone: registrationData.phone,
    campus_id: registrationData.campusId,
    campus_email: String(registrationData.campusEmail || '').toLowerCase(),
    year: registrationData.year,
    game: registrationData.game || registrationData.selection,
    status: registrationData.status || ((registrationData.paymentMode || '').toUpperCase() === 'CASH' ? 'PENDING' : 'CONFIRMED'),
    checked_in: Boolean(registrationData.checkedIn),
    checked_in_at: registrationData.checkedInAt || null,
    checked_in_by: registrationData.checkedInBy || '',
    payment_utr: registrationData.paymentUtr || registrationData.utr || null,
    payment_screenshot: registrationData.paymentScreenshot || registrationData.screenshotUrl || '',
    payment_status: registrationData.paymentStatus || 'PENDING',
    paid_at: registrationData.paidAt || '',
    amount: registrationData.amount || 49,
    payment_mode: registrationData.paymentMode || 'UPI',
    verification_status: registrationData.verificationStatus || 'VERIFIED',
    verified_by: registrationData.verifiedBy || 'SYSTEM',
    verified_at: registrationData.verifiedAt || null,
    note: registrationData.note || '',
  };

  const { data, error } = await client
    .from('registrations')
    .insert([row])
    .select()
    .single();

  if (error) {
    console.error('[Supabase] appendPaymentRegistration error:', error);
    throw error;
  }

  return mapRegistrationRow(data);
}

/**
 * Delete a registration from Supabase
 */
export async function deleteRegistration(client = getSupabaseClient(), registrationId) {
  if (!client) throw new Error('Supabase client not configured.');

  const { error } = await client
    .from('registrations')
    .delete()
    .eq('registration_id', String(registrationId).trim().toUpperCase());

  if (error) {
    console.error('[Supabase] deleteRegistration error:', error);
    throw error;
  }

  return { success: true, deleted: registrationId };
}

/**
 * Update payment mode and/or status for a registration
 */
export async function updateRegistrationPayment(client = getSupabaseClient(), registrationId, updates = {}) {
  if (!client) throw new Error('Supabase client not configured.');

  const updateFields = {};
  if (updates.paymentMode !== undefined) {
    updateFields.payment_mode = String(updates.paymentMode).toUpperCase() === 'CASH' ? 'CASH' : 'UPI';
  }
  if (updates.paymentStatus !== undefined) {
    const isAccepted = String(updates.paymentStatus).toUpperCase() === 'PAID' || String(updates.paymentStatus).toUpperCase() === 'ACCEPTED';
    updateFields.payment_status = isAccepted ? 'PAID' : 'PENDING';
    if (isAccepted) {
      updateFields.paid_at = new Date().toISOString();
      updateFields.status = 'CONFIRMED';
    } else {
      updateFields.paid_at = null;
      updateFields.status = 'PENDING';
    }
  }
  if (updates.status !== undefined) {
    updateFields.status = String(updates.status).toUpperCase();
  }
  if (updates.note !== undefined) {
    updateFields.note = updates.note;
  }

  const { data, error } = await client
    .from('registrations')
    .update(updateFields)
    .eq('registration_id', String(registrationId).trim().toUpperCase())
    .select()
    .single();

  if (error) {
    console.error('[Supabase] updateRegistrationPayment error:', error);
    throw error;
  }

  return mapRegistrationRow(data);
}

/**
 * Append an entry to payment_audit_logs
 */
export async function appendPaymentAuditEvent(client = getSupabaseClient(), auditData) {
  if (!client) return;

  const row = {
    timestamp: auditData.timestamp || new Date().toISOString(),
    event: auditData.event || 'UNKNOWN',
    registration_id: auditData.registrationId || null,
    campus_id: auditData.campusId || null,
    utr: auditData.utr || null,
    actor: auditData.actor || 'SYSTEM',
    note: auditData.note || '',
  };

  const { error } = await client.from('payment_audit_logs').insert([row]);
  if (error) {
    console.error('[Supabase] appendPaymentAuditEvent error:', error);
  }
}

// ==============================================================================
// VOLUNTEERS HELPERS
// ==============================================================================

export function mapVolunteerRow(row) {
  if (!row) return null;
  return {
    volunteerId: row.volunteer_id,
    name: row.name,
    username: (row.username || '').toLowerCase(),
    campusId: row.username,
    passwordHash: row.password_hash,
    role: row.role || 'volunteer',
    station: row.station || 'All',
    active: Boolean(row.active),
    createdAt: row.created_at || '',
  };
}

/**
 * Fetch all volunteers from Supabase
 */
export async function getVolunteers(client = getSupabaseClient()) {
  if (!client) return [];

  const { data, error } = await client
    .from('volunteers')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[Supabase] getVolunteers error:', error);
    throw error;
  }

  return (data || []).map(mapVolunteerRow);
}

/**
 * Find volunteer by username (Campus ID)
 */
export async function getVolunteerByUsername(client = getSupabaseClient(), usernameOrId) {
  if (!client || !usernameOrId) return null;

  const clean = String(usernameOrId).trim().toLowerCase();
  const { data, error } = await client
    .from('volunteers')
    .select('*')
    .or(`username.eq.${clean},volunteer_id.ilike.${clean}`)
    .maybeSingle();

  if (error) {
    console.error('[Supabase] getVolunteerByUsername error:', error);
    return null;
  }

  return mapVolunteerRow(data);
}

/**
 * Save or update volunteer in Supabase
 */
export async function saveVolunteer(client = getSupabaseClient(), volunteerData) {
  if (!client) throw new Error('Supabase client not configured.');

  const cleanUsername = String(volunteerData.username).trim().toLowerCase();
  const row = {
    volunteer_id: volunteerData.volunteerId,
    name: volunteerData.name.trim(),
    username: cleanUsername,
    password_hash: volunteerData.passwordHash,
    role: volunteerData.role || 'volunteer',
    station: volunteerData.station || 'All',
    active: volunteerData.active !== false,
  };

  const { data, error } = await client
    .from('volunteers')
    .upsert(row, { onConflict: 'username' })
    .select()
    .single();

  if (error) {
    console.error('[Supabase] saveVolunteer error:', error);
    throw error;
  }

  return mapVolunteerRow(data);
}

/**
 * Delete a volunteer by ID or username
 */
export async function deleteVolunteer(client = getSupabaseClient(), volunteerIdOrUsername) {
  if (!client) throw new Error('Supabase client not configured.');

  const target = String(volunteerIdOrUsername).trim();
  const { error } = await client
    .from('volunteers')
    .delete()
    .or(`volunteer_id.eq.${target},username.eq.${target.toLowerCase()}`);

  if (error) {
    console.error('[Supabase] deleteVolunteer error:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ==============================================================================
// CHECK-IN & STATS HELPERS
// ==============================================================================

/**
 * Append entry to checkin_logs
 */
export async function appendCheckInLog(client = getSupabaseClient(), logData) {
  if (!client) return;

  const row = {
    timestamp: logData.timestamp || new Date().toISOString(),
    registration_id: logData.registrationId,
    game: logData.game || '',
    result: logData.result || 'CHECKED_IN',
    volunteer_id: logData.volunteerId || '',
    volunteer_name: logData.volunteerName || '',
    station: logData.station || '',
    note: logData.note || '',
  };

  const { error } = await client.from('checkin_logs').insert([row]);
  if (error) {
    console.error('[Supabase] appendCheckInLog error:', error);
  }
}

/**
 * Atomic Check-In Handler
 */
export async function performParticipantCheckIn(
  client = getSupabaseClient(),
  { registrationId, station, volunteer, override = false, note = '' }
) {
  if (!client) throw new Error('Supabase client not configured.');

  const participant = await findRegistrationById(client, registrationId);
  if (!participant) {
    return {
      success: false,
      status: 'notFound',
      error: `Participant ${registrationId} not found in database.`,
    };
  }

  const volunteerSign = `${volunteer.name || volunteer.username} (${volunteer.volunteerId || volunteer.username})`;

  // Race condition check: already checked in?
  if (participant.checkedIn) {
    await appendCheckInLog(client, {
      timestamp: new Date().toISOString(),
      registrationId: participant.registrationId,
      game: participant.game,
      result: 'ALREADY_CHECKED_IN',
      volunteerId: volunteer.volunteerId || volunteer.username,
      volunteerName: volunteer.name || volunteer.username,
      station: station || 'All',
      note: `Attempted duplicate check-in at station ${station}. Original check-in was at ${participant.checkedInAt} by ${participant.checkedInBy}.`,
    });

    return {
      success: false,
      status: 'alreadyCheckedIn',
      participant,
      message: `Already checked in by ${participant.checkedInBy || 'Staff'}${
        participant.checkedInAt
          ? ` at ${new Date(participant.checkedInAt).toLocaleTimeString('en-IN')}`
          : ''
      }.`,
    };
  }

  const nowIso = new Date().toISOString();

  // Perform atomic update
  const { error: updateError } = await client
    .from('registrations')
    .update({
      checked_in: true,
      checked_in_at: nowIso,
      checked_in_by: volunteerSign,
    })
    .eq('registration_id', participant.registrationId);

  if (updateError) {
    console.error('[Supabase] performParticipantCheckIn update error:', updateError);
    throw updateError;
  }

  // Audit log
  await appendCheckInLog(client, {
    timestamp: nowIso,
    registrationId: participant.registrationId,
    game: participant.game,
    result: override ? 'WRONG_STATION_OVERRIDE' : 'CHECKED_IN',
    volunteerId: volunteer.volunteerId || volunteer.username,
    volunteerName: volunteer.name || volunteer.username,
    station: station || 'All',
    note: override
      ? `Station override: Assigned ${participant.game}, checked in at ${station}. ${note || ''}`.trim()
      : note,
  });

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
}

/**
 * Retrieve CheckInLog entries, optionally filtered by volunteerId
 */
export async function getCheckInLogs(client = getSupabaseClient(), limit = 50, volunteerId = null) {
  if (!client) return [];

  let query = client
    .from('checkin_logs')
    .select('*')
    .order('timestamp', { ascending: false });

  if (volunteerId) {
    const vTarget = String(volunteerId).trim().toLowerCase();
    query = query.or(`volunteer_id.ilike.%${vTarget}%,volunteer_name.ilike.%${vTarget}%`);
  }

  if (limit && limit > 0) {
    query = query.limit(limit);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[Supabase] getCheckInLogs error:', error);
    return [];
  }

  return (data || []).map((row, index) => ({
    id: row.id || `log-${index + 1}`,
    timestamp: row.timestamp || '',
    registrationId: row.registration_id || '',
    game: row.game || '',
    result: row.result || '',
    volunteerId: row.volunteer_id || '',
    volunteerName: row.volunteer_name || '',
    station: row.station || '',
    note: row.note || '',
  }));
}

/**
 * Calculate live stats from registrations
 */
export async function getTournamentStats(client = getSupabaseClient(), volunteerId = null) {
  const registrations = await getAllRegistrations(client);

  const stats = {
    total: registrations.length,
    checkedIn: 0,
    pending: 0,
    byGame: {
      'Free Fire': { total: 0, checkedIn: 0, pending: 0 },
      'BGMI': { total: 0, checkedIn: 0, pending: 0 },
      'Mini Militia': { total: 0, checkedIn: 0, pending: 0 },
      'eFootball': { total: 0, checkedIn: 0, pending: 0 },
      'Carrom': { total: 0, checkedIn: 0, pending: 0 },
    },
    byYear: {
      '1st Year': 0,
      '2nd Year': 0,
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

    if (p.year && stats.byYear[p.year] !== undefined) {
      stats.byYear[p.year] += 1;
    }

    const gameList = (p.game || '').split(',').map((g) => g.trim()).filter(Boolean);
    gameList.forEach((gameItem) => {
      const standardName = Object.keys(stats.byGame).find(
        (k) => k.toLowerCase() === gameItem.toLowerCase()
      ) || gameItem;

      if (!stats.byGame[standardName]) {
        stats.byGame[standardName] = { total: 0, checkedIn: 0, pending: 0 };
      }
      stats.byGame[standardName].total += 1;
      if (isChecked) {
        stats.byGame[standardName].checkedIn += 1;
      } else {
        stats.byGame[standardName].pending += 1;
      }
    });

    if (volunteerId && p.checkedInBy) {
      const vTarget = String(volunteerId).toLowerCase();
      if (p.checkedInBy.toLowerCase().includes(vTarget)) {
        stats.volunteerScanCount += 1;
      }
    }
  });

  return stats;
}
