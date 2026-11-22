import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';
import * as schema from './schema';

const sqlite = openDatabaseSync('areti.db', { enableChangeListener: true });
console.log(sqlite.getAllSync("SELECT name FROM sqlite_master WHERE type='table'"));
export const db = drizzle(sqlite, { schema });
