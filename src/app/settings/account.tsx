import { useState } from 'react';
import { router } from 'expo-router';
import { Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AccountInfoSection } from '@/components/settings/AccountInfoSection';
import { DangerZone } from '@/components/settings/DangerZone';
import { DeleteAccountModal } from '@/components/settings/DeleteAccountModal';
import { EditNameModal } from '@/components/settings/EditNameModal';
import { ProfileHeader } from '@/components/settings/ProfileHeader';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { saveDisplayName } from '@/db/queries/profile';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { AuthError, deleteAccount } from '@/lib/auth';
import { pickAndUploadAvatar, removeAvatar } from '@/lib/avatar';
import { confirmSignOut } from '@/lib/confirmSignOut';
import { mockUser } from '@/mocks/ui';
import { colors, spacing } from '@/theme';

// Name, profile picture, Sign Out and Delete Account all work.
export default function AccountSettingsScreen() {
  const user = useCurrentUser();
  const [editingName, setEditingName] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const runDelete = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      setConfirmingDelete(false);
      if (router.canDismiss()) router.dismissAll();
      router.replace('/auth');
    } catch (e) {
      setDeleting(false);
      setConfirmingDelete(false);
      Alert.alert(
        'Could not delete your account',
        e instanceof AuthError && e.code === 'offline'
          ? 'Deleting needs an internet connection. Check your connection and try again.'
          : 'Something went wrong. Please try again.',
      );
    }
  };

  const saveName = async (name: string) => {
    if (!user) return;
    setEditingName(false);
    await saveDisplayName(user.id, name); // syncs to other phones
  };

  const upload = async () => {
    if (!user) return;
    setUploading(true);
    try {
      await pickAndUploadAvatar(user.id);
    } catch {
      Alert.alert('Upload failed', 'Check your internet connection and try again.');
    } finally {
      setUploading(false);
    }
  };

  const editPhoto = () => {
    if (!user) return;
    if (!user.pictureUri) return upload();
    Alert.alert('Profile picture', undefined, [
      { text: 'Choose a new photo', onPress: upload },
      {
        text: 'Remove photo',
        style: 'destructive',
        onPress: () => removeAvatar(user.id).catch(() => Alert.alert('Could not remove the photo', 'Please try again.')),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.xxl, gap: spacing.xl }}
        showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Account Settings" leading="back" />
        <ProfileHeader
          name={user?.name ?? ''}
          joined={user?.joined ?? ''}
          isPro={mockUser.isPro}
          pictureUri={user?.pictureUri}
          uploading={uploading}
          onEditPhoto={editPhoto}
          onEditName={() => setEditingName(true)}
        />
        <AccountInfoSection email={user?.email ?? ''} synced onSignOut={confirmSignOut} />
        <DangerZone onDelete={() => setConfirmingDelete(true)} deleting={deleting} />
      </ScrollView>

      <DeleteAccountModal
        visible={confirmingDelete}
        deleting={deleting}
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={runDelete}
      />

      <EditNameModal
        visible={editingName}
        initialName={user?.hasCustomName ? user.name : ''}
        onCancel={() => setEditingName(false)}
        onSave={saveName}
      />
    </SafeAreaView>
  );
}
