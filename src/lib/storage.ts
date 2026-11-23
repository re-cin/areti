import Storage from 'expo-sqlite/kv-store';

/**
 * Tiny auth/session values and sync cursors use the existing SQLite KV database.
 * The sync native methods avoid the prepareAsync/async-context error seen in Expo
 * Go; Promise-returning wrappers keep Supabase and sync callers' storage contract.
 */
export const deviceStorage = {
  async getItem(key: string): Promise<string | null> { return Storage.getItemSync(key); },
  async setItem(key: string, value: string): Promise<void> { Storage.setItemSync(key, value); },
  async removeItem(key: string): Promise<void> { Storage.removeItemSync(key); },
};
