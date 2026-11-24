
import { ScrollView, View } from 'react-native';

import { SettingsScaffold } from '@/components/settings/SettingsScaffold';
import { NeoBox } from '@/components/ui/NeoBox';
import { Text } from '@/components/ui/Text';
import { colors, fonts, spacing } from '@/theme';

const sections = [
  {
    title: '1. Acceptance of Terms',
    content:
      'By accessing and using Areté, you agree to follow these Terms and Conditions. If you do not agree with these terms, please discontinue using the application.',
  },
  {
    title: '2. About Areté',
    content:
      'Areté is a productivity and study companion application designed to help users manage their study sessions, organize tasks, track progress, and develop better study habits through its available features.',
  },
  {
    title: '3. User Accounts',
    content:
      'You are responsible for maintaining the accuracy of the information associated with your account and keeping your login credentials secure. You should notify the appropriate support channel if you become aware of unauthorized access to your account.',
  },
  {
    title: '4. Acceptable Use',
    content:
      'You agree to use Areté for its intended purposes and not misuse, disrupt, or attempt to interfere with the application, its services, or other users.',
  },
  {
    title: '5. Application Features',
    content:
      'Areté provides productivity tools such as focus timers, planners, subject management, and progress tracking. Features and functionality may change, improve, or become temporarily unavailable as the application is updated.',
  },
  {
    title: '6. User Information and Content',
    content:
      'You are responsible for the information and content you enter into Areté. Please avoid submitting information that you do not have permission to share. The handling of personal information is described in the application’s Data & Privacy section.',
  },
  {
    title: '7. Service Availability',
    content:
      'Although we aim to keep Areté available and functioning properly, uninterrupted access cannot be guaranteed. Maintenance, technical issues, or updates may temporarily affect certain features.',
  },
  {
    title: '8. Updates to These Terms',
    content:
      'These Terms and Conditions may be revised as Areté develops. Updated terms will be made available within the application. Continued use of the application after changes are published indicates acceptance of the revised terms.',
  },
  {
    title: '9. Contact and Support',
    content:
      'If you have questions or concerns regarding these Terms and Conditions, please refer to the Help & Support section of Areté.',
  },
];

export default function TermsScreen() {
  return (
    <SettingsScaffold title="Terms & Conditions">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          gap: spacing.lg,
          paddingBottom: spacing.xl,
        }}
      >
        <NeoBox
          backgroundColor={colors.terracotta}
          style={{ padding: spacing.lg, gap: spacing.sm }}
        >
          <Text
            style={{
              fontFamily: fonts.semiBold,
              fontSize: 20,
            }}
          >
            Welcome to Areté!
          </Text>

          <Text>
            Please read these Terms and Conditions carefully before using
            the application. They explain the general rules and expectations
            when using Areté.
          </Text>

          <Text variant="caption" color={colors.ink}>
            Version 1.0.0
          </Text>
        </NeoBox>

        {sections.map((section) => (
          <NeoBox
            key={section.title}
            style={{
              padding: spacing.lg,
              gap: spacing.sm,
            }}
          >
            <Text
              style={{
                fontFamily: fonts.semiBold,
                fontSize: 17,
              }}
            >
              {section.title}
            </Text>

            <Text
              style={{
                fontSize: 14,
                lineHeight: 22,
              }}
              color={colors.ink}
            >
              {section.content}
            </Text>
          </NeoBox>
        ))}

        <View style={{ alignItems: 'center', paddingTop: spacing.md }}>
          <Text variant="caption" color={colors.muted}>
            Areté · Version 1.0.0
          </Text>
        </View>
      </ScrollView>
    </SettingsScaffold>
  );
}
