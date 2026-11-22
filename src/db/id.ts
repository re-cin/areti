import { randomUUID } from 'expo-crypto';

/** Create a record id on the device. Never use auto-increment ids (they collide when syncing). */
export const newId = () => randomUUID();
