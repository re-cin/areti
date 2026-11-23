import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { DeleteAccountModal } from '@/components/settings/DeleteAccountModal';
import { SettingsScaffold } from '@/components/settings/SettingsScaffold';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { NeoBox } from '@/components/ui/NeoBox';
import { NeoButton } from '@/components/ui/NeoButton';
import { Text } from '@/components/ui/Text';
import { MONTHS } from '@/lib/dateHelpers';
import { useDbQuery } from '@/lib/useDbQuery';
import { showSignOutInfo } from '@/features/account/accountAlerts';
import { EmailTakenError, getProfile, updateProfile, type Profile } from '@/features/account/accountRepo';
import { AuthError, deleteAccount } from '@/lib/auth';
import { pickAndUploadAvatar, removeAvatar } from '@/lib/avatar';
import { bumpData } from '@/stores/dataVersion';
import { useTimer } from '@/features/timer/timerStore';
import { borders, colors, fonts, radii, spacing } from '@/theme';

const EMPTY_PROFILE: Profile = { id: '', name: '', email: '', pictureUri: null, plan: 'free', joinedAt: Date.now() };

export default function AccountSettingsScreen() {
  const profile = useDbQuery(getProfile, EMPTY_PROFILE);
  const [editingName, setEditingName] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [uploading, setUploading] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [previousProfile, setPreviousProfile] = useState(profile);
  if (previousProfile.name !== profile.name || previousProfile.email !== profile.email) {
    setPreviousProfile(profile);
    setName(profile.name);
    setEmail(profile.email);
  }

  const saveName = async () => {
    setEditingName(false);
    if (name.trim() !== profile.name) await updateProfile({ name: name.trim() });
  };

  const saveEmail = async () => {
    setEditingEmail(false);
    const value = email.trim();
    if (value && !/^\S+@\S+\.\S+$/.test(value)) {
      Alert.alert('Check your email', 'That does not look like an email address.');
      setEmail(profile.email);
      return;
    }
    if (!value) {
      // The email is what you sign in with, so it cannot be emptied.
      setEmail(profile.email);
      return;
    }
    if (value.toLowerCase() === profile.email.toLowerCase()) return;
    try {
      const result = await updateProfile({ email: value });
      // Supabase only switches the email once the new address is confirmed.
      setEmail(profile.email);
      if (result === 'confirm-email')
        Alert.alert('Check your inbox', `We sent a confirmation link to ${value}. Your email changes once you tap it.`);
    } catch (e) {
      setEmail(profile.email);
      if (e instanceof EmailTakenError) Alert.alert('Email already used', 'Another account already uses that email.');
      else if (e instanceof AuthError && e.code === 'offline')
        Alert.alert('No connection', 'Changing your email needs an internet connection.');
      else Alert.alert('Could not save', e instanceof Error ? e.message : String(e));
    }
  };

  // Profile picture: uploaded to Supabase Storage, link saved in the synced profile.
  const upload = async () => {
    if (!profile.id) return;
    setUploading(true);
    try {
      if (await pickAndUploadAvatar(profile.id)) bumpData();
    } catch {
      Alert.alert('Upload failed', 'Check your internet connection and try again.');
    } finally {
      setUploading(false);
    }
  };

  const editPhoto = () => {
    if (!profile.id || uploading) return;
    if (!profile.pictureUri) return void upload();
    Alert.alert('Profile picture', undefined, [
      { text: 'Choose a new photo', onPress: upload },
      {
        text: 'Remove photo',
        style: 'destructive',
        onPress: () =>
          removeAvatar(profile.id)
            .then(bumpData)
            .catch(() => Alert.alert('Could not remove the photo', 'Please try again.')),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // Deletes the Supabase account, all its synced data and this phone's copy (needs internet).
  const runDelete = async () => {
    setDeleting(true);
    try {
      useTimer.getState().reset();
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

  const joined = new Date(profile.joinedAt);

  return (
    <SettingsScaffold title="Account Settings">
      {/* Avatar, name, plan */}
      <View style={{ alignItems: 'center', gap: spacing.sm }}>
        <Pressable onPress={editPhoto} disabled={uploading} accessibilityRole="button" accessibilityLabel="Change profile photo">
          <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: colors.chartBg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {profile.pictureUri ? (
              <Image source={{ uri: profile.pictureUri }} style={{ width: 96, height: 96 }} contentFit="cover" transition={150} accessibilityLabel="Profile picture" />
            ) : (
              <Icon name="user" size={36} strokeWidth={1.8} />
            )}
            {uploading && (
              <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color={colors.white} />
              </View>
            )}
          </View>
          <View
            style={{
              position: 'absolute',
              right: 0,
              bottom: 4,
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: colors.teal,
              borderWidth: borders.thin,
              borderColor: colors.ink,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Icon name="camera" size={14} />
          </View>
        </Pressable>

        {editingName ? (
          <TextInput
            value={name}
            onChangeText={setName}
            onBlur={saveName}
            onSubmitEditing={saveName}
            autoFocus
            placeholder="Your name"
            returnKeyType="done"
            maxLength={40}
            style={{
              fontFamily: fonts.semiBold,
              fontSize: 22,
              color: colors.ink,
              minWidth: 180,
              textAlign: 'center',
              borderBottomWidth: 2,
              borderBottomColor: colors.ink,
              paddingVertical: 2,
            }}
          />
        ) : (
          <Pressable
            onPress={() => setEditingName(true)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
            accessibilityRole="button"
            accessibilityLabel="Edit name">
            <Text style={{ fontFamily: fonts.semiBold, fontSize: 22 }}>{profile.name || 'Add your name'}</Text>
            <Icon name="pencil" size={16} color={colors.muted} />
          </Pressable>
        )}

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            backgroundColor: colors.ink,
            borderRadius: radii.pill,
            paddingHorizontal: 10,
            paddingVertical: 2,
          }}>
          {profile.plan === 'pro' && <Icon name="crown" size={12} color={colors.gold} strokeWidth={1} />}
          <Text variant="label" color={colors.white}>
            {profile.plan === 'pro' ? 'PRO' : 'FREE'}
          </Text>
        </View>
        <Text variant="caption" color={colors.muted} style={{ fontSize: 13 }}>
          Joined {MONTHS[joined.getMonth()]} {joined.getFullYear()}
        </Text>
      </View>

      {/* Account information */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: fonts.semiBold }} color={colors.muted}>
          Account Information
        </Text>
        <View style={{ backgroundColor: colors.mutedSoft, borderRadius: radii.pill, borderWidth: borders.thin, borderColor: colors.ink, paddingHorizontal: 10, paddingVertical: 1 }}>
          <Text variant="caption" style={{ fontFamily: fonts.semiBold }}>
            Synced
          </Text>
        </View>
      </View>

      <Pressable onPress={() => setEditingEmail(true)} accessibilityRole="button" accessibilityLabel="Edit email" disabled={editingEmail}>
        <NeoBox backgroundColor={colors.surface} style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.lg }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="caption" color={colors.muted} style={{ fontFamily: fonts.semiBold }}>
              Email
            </Text>
            {editingEmail ? (
              <TextInput
                value={email}
                onChangeText={setEmail}
                onBlur={saveEmail}
                onSubmitEditing={saveEmail}
                autoFocus
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                placeholder="you@example.com"
                returnKeyType="done"
                style={{ fontFamily: fonts.semiBold, fontSize: 16, color: colors.ink, padding: 0 }}
              />
            ) : (
              <Text style={{ fontFamily: fonts.semiBold }}>{profile.email || 'Add your email'}</Text>
            )}
          </View>
          <Icon name="chevronRight" size={20} strokeWidth={2.5} />
        </NeoBox>
      </Pressable>

      <NeoBox style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.lg }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fonts.semiBold }}>Sign Out</Text>
          <Text variant="caption" color={colors.muted}>
            Switch accounts or end session
          </Text>
        </View>
        <IconButton icon="logout" backgroundColor={colors.dangerSoft} accessibilityLabel="Sign out" onPress={showSignOutInfo} />
      </NeoBox>

      {/* Danger zone */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm }}>
        <Icon name="warning" size={18} color={colors.dangerDark} strokeWidth={1} />
        <Text style={{ fontFamily: fonts.semiBold }} color={colors.dangerDark}>
          Danger Zone
        </Text>
      </View>
      <NeoBox style={{ padding: spacing.lg, gap: spacing.md }}>
        <View>
          <Text style={{ fontFamily: fonts.semiBold }}>Delete Account</Text>
          <Text variant="caption" color={colors.muted}>
            Permanently delete your account, profile, study streaks, and all logged focus cycles on every phone. This cannot be undone.
          </Text>
        </View>
        <NeoButton
          label={deleting ? 'DELETING…' : 'DELETE EVERYTHING'}
          backgroundColor={colors.danger}
          disabled={deleting}
          onPress={() => setConfirmingDelete(true)}
        />
      </NeoBox>

      <DeleteAccountModal
        visible={confirmingDelete}
        deleting={deleting}
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={runDelete}
      />
    </SettingsScaffold>
  );
}
