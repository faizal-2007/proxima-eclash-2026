/**
 * useLiveFixtures.js
 * Fetches public fixtures and player names, then keeps them current with
 * Supabase Realtime. Polls every 30 seconds while Realtime is unavailable.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { getPublicSupabase } from './supabaseClient.js';

const POLL_INTERVAL_MS = 30_000;
const FIXTURE_COLUMNS = 'id,game,format,round,match_no,players,winner';
const EMPTY_STATE = {
  fixtures: [],
  nameMap: {},
  isLoading: true,
  error: null,
  connectionStatus: 'connecting',
  flashIds: new Set(),
};

function createGameState(game) {
  return { game, ...EMPTY_STATE, flashIds: new Set() };
}

function updateGameState(previous, game, update) {
  const current = previous.game === game ? previous : createGameState(game);
  return update(current);
}

function fixtureOrder(a, b) {
  return a.round - b.round || a.match_no - b.match_no;
}

function getErrorMessage(error, fallback) {
  return error instanceof Error && error.message ? error.message : fallback;
}

async function fetchFixturesForGame(supabase, game) {
  const { data: rows, error: fixturesError } = await supabase
    .from('fixtures')
    .select(FIXTURE_COLUMNS)
    .eq('game', game)
    .order('round', { ascending: true })
    .order('match_no', { ascending: true });

  if (fixturesError) throw fixturesError;

  const regIds = [...new Set((rows ?? []).flatMap((row) => row.players ?? []).filter(Boolean))];
  const nameMap = {};

  if (regIds.length > 0) {
    const { data: players, error: playersError } = await supabase
      .from('public_players')
      .select('reg_id, player_name')
      .in('reg_id', regIds);

    if (playersError) throw playersError;
    for (const player of players ?? []) {
      nameMap[player.reg_id] = player.player_name;
    }
  }

  return { fixtures: rows ?? [], nameMap };
}

export function useLiveFixtures(game) {
  const supabase = getPublicSupabase();
  const [state, setState] = useState(() => createGameState(game));
  const requestIdRef = useRef(0);
  const currentState = state.game === game ? state : EMPTY_STATE;

  const refetch = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    if (!supabase) {
      setState((previous) =>
        updateGameState(previous, game, (current) => ({
          ...current,
          isLoading: false,
          error: 'Fixtures are unavailable because Supabase is not configured.',
        }))
      );
      return;
    }

    try {
      const result = await fetchFixturesForGame(supabase, game);
      if (requestId !== requestIdRef.current) return;

      setState((previous) =>
        updateGameState(previous, game, (current) => ({
          ...current,
          fixtures: result.fixtures,
          nameMap: result.nameMap,
          isLoading: false,
          error: null,
        }))
      );
    } catch (fetchError) {
      if (requestId !== requestIdRef.current) return;
      setState((previous) =>
        updateGameState(previous, game, (current) => ({
          ...current,
          isLoading: false,
          error: getErrorMessage(fetchError, 'Failed to load fixtures.'),
        }))
      );
    }
  }, [game, supabase]);

  useEffect(() => {
    let active = true;
    let initialFetchPending = true;
    let reconnectNeedsRefresh = false;
    let pollTimer = null;
    const pendingEvents = [];
    const flashTimers = new Map();

    const flash = (id) => {
      if (!active) return;
      setState((previous) =>
        updateGameState(previous, game, (current) => ({
          ...current,
          flashIds: new Set(current.flashIds).add(id),
        }))
      );
      clearTimeout(flashTimers.get(id));
      flashTimers.set(
        id,
        setTimeout(() => {
          if (!active) return;
          setState((previous) =>
            updateGameState(previous, game, (current) => {
              const next = new Set(current.flashIds);
              next.delete(id);
              return { ...current, flashIds: next };
            })
          );
          flashTimers.delete(id);
        }, 1500)
      );
    };

    const stopPolling = () => {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    };

    const startPolling = () => {
      stopPolling();
      pollTimer = setInterval(() => {
        if (active) refetch();
      }, POLL_INTERVAL_MS);
    };

    const applyEvent = async (payload) => {
      if (!active) return;
      const { eventType, new: newRow, old: oldRow } = payload;

      if (eventType === 'DELETE') {
        if (!oldRow?.id) return;
        requestIdRef.current += 1;
        setState((previous) =>
          updateGameState(previous, game, (current) => ({
            ...current,
            fixtures: current.fixtures.filter((fixture) => fixture.id !== oldRow.id),
          }))
        );
        return;
      }

      const row = newRow;
      if (!row?.id) return;
      requestIdRef.current += 1;

      if (row.game !== game) {
        setState((previous) =>
          updateGameState(previous, game, (current) => ({
            ...current,
            fixtures: current.fixtures.filter((fixture) => fixture.id !== row.id),
          }))
        );
        return;
      }

      setState((previous) =>
        updateGameState(previous, game, (current) => {
          const exists = current.fixtures.some((fixture) => fixture.id === row.id);
          const fixtures = exists
            ? current.fixtures.map((fixture) => (fixture.id === row.id ? row : fixture))
            : [...current.fixtures, row];
          return { ...current, fixtures: fixtures.sort(fixtureOrder) };
        })
      );
      flash(row.id);

      const regIds = [...new Set((row.players ?? []).filter(Boolean))];
      if (regIds.length === 0 || !supabase) return;

      try {
        const { data: players, error: playersError } = await supabase
          .from('public_players')
          .select('reg_id, player_name')
          .in('reg_id', regIds);

        if (playersError) throw playersError;
        if (!active) return;

        setState((previous) =>
          updateGameState(previous, game, (current) => {
            const nameMap = { ...current.nameMap };
            for (const player of players ?? []) {
              nameMap[player.reg_id] = player.player_name;
            }
            return { ...current, nameMap, error: null };
          })
        );
      } catch (nameError) {
        if (active) {
          setState((previous) =>
            updateGameState(previous, game, (current) => ({
              ...current,
              error: getErrorMessage(nameError, 'Failed to load player names.'),
            }))
          );
        }
      }
    };

    const loadInitialFixtures = async () => {
      await refetch();
      if (!active) return;
      initialFetchPending = false;
      for (const payload of pendingEvents.splice(0)) {
        applyEvent(payload);
      }
    };

    if (!supabase) {
      loadInitialFixtures();
      initialFetchPending = false;
      return () => {
        active = false;
        requestIdRef.current += 1;
      };
    }

    const channel = supabase
      .channel('public-fixtures')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fixtures' },
        (payload) => {
          if (initialFetchPending) {
            pendingEvents.push(payload);
          } else {
            applyEvent(payload);
          }
        }
      )
      .subscribe((status) => {
        if (!active) return;

        if (status === 'SUBSCRIBED') {
          setState((previous) =>
            updateGameState(previous, game, (current) => ({
              ...current,
              connectionStatus: 'connected',
            }))
          );
          stopPolling();
          if (reconnectNeedsRefresh) {
            reconnectNeedsRefresh = false;
            refetch();
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setState((previous) =>
            updateGameState(previous, game, (current) => ({
              ...current,
              connectionStatus: 'error',
            }))
          );
          reconnectNeedsRefresh = true;
          startPolling();
        } else {
          setState((previous) =>
            updateGameState(previous, game, (current) => ({
              ...current,
              connectionStatus: 'connecting',
            }))
          );
        }
      });

    loadInitialFixtures();

    return () => {
      active = false;
      requestIdRef.current += 1;
      stopPolling();
      for (const timer of flashTimers.values()) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [game, refetch, supabase]);

  return {
    fixtures: currentState.fixtures,
    nameMap: currentState.nameMap,
    isLoading: currentState.isLoading,
    error: currentState.error,
    connectionStatus: supabase ? currentState.connectionStatus : 'error',
    flashIds: currentState.flashIds,
    refetch,
  };
}
