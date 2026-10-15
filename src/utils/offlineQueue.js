/**
 * Offline Sync Queue Utility for PROXIMA Volunteer Portal
 * Stores check-ins recorded when internet connectivity drops
 * and automatically drains/syncs to Supabase when back online.
 */

const STORAGE_KEY = 'proxima_volunteer_offline_queue_v1';

export function getOfflineQueue() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function enqueueOfflineCheckIn(item) {
  try {
    const queue = getOfflineQueue();
    const id = `offline-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const queuedItem = {
      id,
      ...item,
      queuedAt: new Date().toISOString(),
    };
    queue.push(queuedItem);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    return queuedItem;
  } catch (err) {
    console.error('Failed to enqueue offline check-in:', err);
    return null;
  }
}

export function removeOfflineItem(id) {
  try {
    const queue = getOfflineQueue().filter((q) => q.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    return queue;
  } catch {
    return [];
  }
}

export function clearOfflineQueue() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

/**
 * Flush and synchronize all queued items with the server
 */
export async function syncOfflineQueue(token, onProgress) {
  const queue = getOfflineQueue();
  if (!queue.length) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;

  for (const item of queue) {
    try {
      const res = await fetch('/api/volunteer/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          registrationId: item.registrationId,
          station: item.station || 'All',
          override: Boolean(item.override),
          note: `Synced from offline queue (originally captured at ${item.queuedAt})`,
        }),
      });

      if (res.ok) {
        removeOfflineItem(item.id);
        synced += 1;
        onProgress?.({ synced, remaining: queue.length - synced });
      } else {
        failed += 1;
      }
    } catch {
      failed += 1;
    }
  }

  return { synced, failed, remaining: getOfflineQueue().length };
}
