import * as ImagePicker from 'expo-image-picker';
import { savePictureUri } from '@/db/queries/profile';
import { supabase } from './supabase';

const BUCKET = 'avatars';

/**
 * Lets the user pick a photo (cropped to a square), uploads it to Supabase Storage at
 * avatars/<user id>/avatar.jpg, and saves its link in the profile (which syncs to other phones).
 * Returns false if the user cancelled. Throws if the upload fails (e.g. offline).
 */
export async function pickAndUploadAvatar(userId: string): Promise<boolean> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.6,
    base64: true,
  });
  if (result.canceled || !result.assets[0]?.base64) return false;
  const asset = result.assets[0];

  const path = `${userId}/avatar.jpg`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, base64ToBytes(asset.base64!), { contentType: asset.mimeType ?? 'image/jpeg', upsert: true });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  // The file name never changes, so add a version so phones load the new picture, not a cached one.
  await savePictureUri(userId, `${data.publicUrl}?v=${Date.now()}`);
  return true;
}

/** Removes the profile picture (file and link). */
export async function removeAvatar(userId: string) {
  await supabase.storage.from(BUCKET).remove([`${userId}/avatar.jpg`]);
  await savePictureUri(userId, null);
}

function base64ToBytes(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
