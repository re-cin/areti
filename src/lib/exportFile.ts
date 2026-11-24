import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Share } from 'react-native';

/**
 * Saves text as a file (in the app's cache) and opens the phone's share sheet with it,
 * so the user can save it to Files / Drive, email it, etc.
 * Falls back to sharing the text itself where file sharing isn't available.
 */
export async function shareTextFile(fileName: string, contents: string, mimeType = 'application/json') {
  if (await Sharing.isAvailableAsync()) {
    const file = new File(Paths.cache, fileName);
    if (file.exists) file.delete();
    file.create();
    file.write(contents);
    await Sharing.shareAsync(file.uri, {
      mimeType,
      dialogTitle: 'Export areti data',
      UTI: mimeType === 'application/json' ? 'public.json' : undefined,
    });
    return;
  }
  await Share.share({ title: fileName, message: contents });
}
