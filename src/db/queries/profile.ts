import { eq } from 'drizzle-orm';
import { db } from '../client';
import { profile } from '../schema';

/**
 * One profile row per account, with the Supabase user id as its id, so every phone
 * edits the same row and it syncs without duplicates (see src/sync/sync.ts).
 */
export const profileQuery = (userId: string) => db.select().from(profile).where(eq(profile.id, userId));

export async function saveDisplayName(userId: string, displayName: string) {
  await upsertProfile(userId, { displayName: displayName.trim() });
}

export async function savePictureUri(userId: string, pictureUri: string | null) {
  await upsertProfile(userId, { pictureUri });
}

async function upsertProfile(userId: string, changes: { displayName?: string; pictureUri?: string | null }) {
  const updatedAt = Date.now();
  await db
    .insert(profile)
    .values({ id: userId, updatedAt, ...changes })
    .onConflictDoUpdate({ target: profile.id, set: { ...changes, updatedAt } });
}
