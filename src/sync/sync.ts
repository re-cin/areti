import { getTableColumns, getTableName, gt, sql } from 'drizzle-orm';
import type { SQLiteColumn, SQLiteTable } from 'drizzle-orm/sqlite-core';
import Storage from 'expo-sqlite/kv-store';
import { addDatabaseChangeListener } from 'expo-sqlite';
import { AppState } from 'react-native';
import { db } from '@/db/client';
import {
  focusSessions,
  ghostState,
  plannedSessions,
  profile,
  settings,
  studyPlans,
  subjects,
  tasks,
} from '@/db/schema';
import { supabase, supabaseConfigured } from '@/lib/supabase';

/**
 * Offline-first sync between the phone's SQLite database and Supabase.
 *
 * SQLite stays the source of truth: the app reads and writes it as before, even offline.
 * When online and signed in:
 *  - push: rows changed on the phone since the last push are upserted to Supabase.
 *    Supabase keeps whichever version has the newest updated_at (see the trigger in
 *    supabase/migrations), so an older edit never overwrites a newer one.
 *  - pull: rows the server received since the last pull (by server_updated_at, the
 *    server's own clock) are written into SQLite, again only if they are newer.
 * Deletes are soft (deletedAt), so they sync like any other change.
 *
 * Sync runs on sign in, when the app comes to the foreground, a moment after any local
 * change, and every minute while the app is open.
 */

type SyncedTable = {
  table: SQLiteTable;
  /** Primary key column(s) on the server, for upsert conflicts. */
  conflict: string;
  /** Local column holding the primary key. */
  key: SQLiteColumn;
  updatedAt: SQLiteColumn;
};

const TABLES: SyncedTable[] = [
  { table: subjects, conflict: 'id', key: subjects.id, updatedAt: subjects.updatedAt },
  { table: studyPlans, conflict: 'id', key: studyPlans.id, updatedAt: studyPlans.updatedAt },
  { table: plannedSessions, conflict: 'id', key: plannedSessions.id, updatedAt: plannedSessions.updatedAt },
  { table: focusSessions, conflict: 'id', key: focusSessions.id, updatedAt: focusSessions.updatedAt },
  { table: ghostState, conflict: 'id', key: ghostState.id, updatedAt: ghostState.updatedAt },
  { table: tasks, conflict: 'id', key: tasks.id, updatedAt: tasks.updatedAt },
  { table: profile, conflict: 'id', key: profile.id, updatedAt: profile.updatedAt },
  { table: settings, conflict: 'user_id,key', key: settings.key, updatedAt: settings.updatedAt },
];

/** Settings that belong to this phone only and are never uploaded. */
const LOCAL_ONLY_SETTINGS = new Set(['session']);

const PAGE = 500;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

let running: Promise<void> | null = null;
let again = false;

/** Runs one sync now (or right after the one in progress). Never throws. */
export function syncNow(): Promise<void> {
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    do {
      again = false;
      try {
        await syncOnce();
      } catch (e) {
        if (__DEV__) console.warn('[sync] failed (will retry later):', e);
      }
    } while (again);
  })().finally(() => {
    running = null;
  });
  return running;
}

/** Starts automatic syncing. Call once when the app starts; returns a stop function. */
export function startAutoSync(): () => void {
  if (!supabaseConfigured) {
    if (__DEV__) console.warn('[sync] Supabase is not configured (.env); sync is off.');
    return () => {};
  }

  let debounce: ReturnType<typeof setTimeout> | undefined;
  const soon = () => {
    if (pulling) return; // our own writes while pulling
    clearTimeout(debounce);
    debounce = setTimeout(syncNow, 2000);
  };

  const auth = supabase.auth.onAuthStateChange((event) => {
    // Start just after the event, not inside it: Supabase holds a lock while it
    // notifies listeners, so calling it from here would make sign-in wait for sync.
    if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') setTimeout(syncNow, 0);
  });
  const appState = AppState.addEventListener('change', (s) => s === 'active' && syncNow());
  const changes = addDatabaseChangeListener(soon);
  const timer = setInterval(() => AppState.currentState === 'active' && syncNow(), 60_000);

  return () => {
    clearTimeout(debounce);
    clearInterval(timer);
    auth.data.subscription.unsubscribe();
    appState.remove();
    changes.remove();
  };
}

/**
 * Before signing out: upload what's left, then wipe this user's data from the phone,
 * so the next person to sign in on this phone starts clean (their data comes from the cloud).
 */
export async function finishAndClearLocalData() {
  if (supabaseConfigured) await syncNow();
  pulling = true;
  try {
    for (const { table } of TABLES) await db.delete(table);
  } finally {
    pulling = false;
  }
}

// ---------------------------------------------------------------------------
// One sync pass
// ---------------------------------------------------------------------------

let pulling = false;

async function syncOnce() {
  if (!supabaseConfigured) return;
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) return;

  const started = Date.now();
  // All tables at the same time (each: upload, then download).
  await Promise.all(
    TABLES.map(async (t) => {
      await push(t, userId);
      await pull(t, userId);
    }),
  );
  if (__DEV__) console.log(`[sync] done in ${Date.now() - started} ms`);
}

async function push({ table, conflict, updatedAt }: SyncedTable, userId: string) {
  const name = getTableName(table);
  const cursorKey = `areti.sync.${userId}.${name}.pushedUpTo`;
  let cursor = Number((await Storage.getItem(cursorKey)) ?? 0);

  for (;;) {
    const rows = (await db
      .select()
      .from(table)
      .where(gt(updatedAt, cursor))
      .orderBy(updatedAt)
      .limit(PAGE)) as Record<string, unknown>[];
    if (rows.length === 0) return;

    const upload = rows
      .filter((r) => !(name === 'settings' && LOCAL_ONLY_SETTINGS.has(String(r.key))))
      .map((r) => ({ ...toRemote(table, r), user_id: userId }));
    if (upload.length) {
      const { error } = await supabase.from(name).upsert(upload, { onConflict: conflict });
      if (error) throw error;
    }

    cursor = Number(rows[rows.length - 1].updatedAt);
    await Storage.setItem(cursorKey, String(cursor));
    if (rows.length < PAGE) return;
  }
}

async function pull({ table, key, updatedAt }: SyncedTable, userId: string) {
  const name = getTableName(table);
  const cursorKey = `areti.sync.${userId}.${name}.pulledUpTo`;
  let cursor = (await Storage.getItem(cursorKey)) ?? '1970-01-01T00:00:00Z';

  for (;;) {
    const { data, error } = await supabase
      .from(name)
      .select('*')
      .gte('server_updated_at', cursor)
      .order('server_updated_at')
      .limit(PAGE);
    if (error) throw error;
    if (!data || data.length === 0) return;

    pulling = true;
    try {
      // One statement for the whole page: insert new rows, and overwrite existing ones
      // only where the incoming row is newer than ours.
      await db
        .insert(table)
        .values((data as Record<string, unknown>[]).map((r) => toLocal(table, r)) as never)
        .onConflictDoUpdate({
          target: key,
          set: fromExcluded(table, key) as never,
          setWhere: sql`${updatedAt} < excluded.${sql.identifier(updatedAt.name)}`,
        });
    } finally {
      pulling = false;
    }

    const last = String((data[data.length - 1] as Record<string, unknown>).server_updated_at);
    // Same timestamp again means everything at it is already applied; stop to avoid looping.
    if (last === cursor) return;
    cursor = last;
    await Storage.setItem(cursorKey, cursor);
    if (data.length < PAGE) return;
  }
}

// ---------------------------------------------------------------------------
// Row mapping: drizzle (camelCase JS) <-> Supabase (snake_case columns)
// ---------------------------------------------------------------------------

function toRemote(table: SQLiteTable, row: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [prop, column] of Object.entries(getTableColumns(table))) out[column.name] = row[prop];
  return out;
}

function toLocal(table: SQLiteTable, row: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [prop, column] of Object.entries(getTableColumns(table))) {
    if (column.name in row) out[prop] = row[column.name];
  }
  return out;
}

/** SET clause for an upsert: every column except the key takes the incoming (excluded) value. */
function fromExcluded(table: SQLiteTable, key: SQLiteColumn) {
  const set: Record<string, unknown> = {};
  for (const [prop, column] of Object.entries(getTableColumns(table))) {
    if (column !== key) set[prop] = sql.raw(`excluded."${column.name}"`);
  }
  return set;
}
