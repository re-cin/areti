
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { SettingsScaffold } from '@/components/settings/SettingsScaffold';
import { NeoBox } from '@/components/ui/NeoBox';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { colors, fonts, spacing } from '@/theme';

const faqSections = [
  {
    title: 'Getting Started',
    questions: [
      {
        question: 'What is Areté?',
        answer:
          'Areté is a productivity and study companion application that helps you organize your academic activities, manage focus sessions, and monitor your study progress.',
      },
      {
        question: 'How do I get started?',
        answer:
          'Create or sign in to your account, set up your subjects, and start organizing your study activities. You can use the focus timer to begin tracking your study sessions.',
      },
    ],
  },
  {
    title: 'Focus Timer',
    questions: [
      {
        question: 'How do I start a focus session?',
        answer:
          'Open the focus timer, choose your preferred session duration, and start the timer when you are ready to study.',
      },
      {
        question: 'What happens if I cancel a focus session?',
        answer:
          'Your actual focused minutes may still count toward your progress even if you cancel a session. A session must reach at least 15 focused minutes to receive credit.',
      },
      {
        question: 'How are focus minutes credited?',
        answer:
          'A focus block earns credit based on the actual minutes spent focusing. Sessions below 15 minutes receive no credit. Credited minutes are rounded down to whole minutes.',
      },
    ],
  },
  {
    title: 'Subject Management',
    questions: [
      {
        question: 'How do I add a subject?',
        answer:
          'Go to User Settings and open Manage Subjects. Select Add Subject, enter the subject name, choose a color and difficulty level, and save it.',
      },
      {
        question: 'Can I edit or delete a subject?',
        answer:
          'Yes. In Manage Subjects, you can rename subjects, customize their colors, change their organization, and delete subjects you no longer need.',
      },
      {
        question: 'Can I organize my subjects?',
        answer:
          'Yes. You can rearrange subjects through drag and drop, search for a subject by name, and filter subjects according to difficulty.',
      },
    ],
  },
  {
    title: 'Planner and Study Goals',
    questions: [
      {
        question: 'What is the Planner for?',
        answer:
          'The Planner helps you organize your academic activities and keep track of your study schedule, tasks, and important dates.',
      },
      {
        question: 'What is the daily study goal?',
        answer:
          'Your daily study goal is the amount of credited focus time you aim to complete each day. Your progress is measured against the goal you have set.',
      },
    ],
  },
  {
    title: 'Ghost Companion',
    questions: [
      {
        question: 'How does my ghost gain experience?',
        answer:
          'Your ghost earns experience points through credited focus minutes. Under the current progression rules, each credited minute earns 1 EXP.',
      },
      {
        question: 'Why does my ghost change moods?',
        answer:
          'Your ghost’s mood is influenced by your study momentum and daily goal progress. Its expressions may also change depending on your focus sessions and other study activities.',
      },
    ],
  },
];

export default function HelpScreen() {
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);

  const toggleQuestion = (question: string) => {
    setExpandedQuestion((current) =>
      current === question ? null : question,
    );
  };

  return (
    <SettingsScaffold title="Help & Support">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          gap: spacing.lg,
          paddingBottom: spacing.xl,
        }}
      >
        <NeoBox
          backgroundColor={colors.terracotta}
          style={{
            padding: spacing.lg,
            gap: spacing.sm,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.semiBold,
              fontSize: 20,
            }}
          >
            How can we help?
          </Text>

          <Text>
            Find answers to common questions about Areté and learn more
            about its features.
          </Text>

          <Text variant="caption" color={colors.ink}>
            Frequently Asked Questions
          </Text>
        </NeoBox>

        {faqSections.map((section) => (
          <View key={section.title} style={{ gap: spacing.md }}>
            <Text
              style={{
                fontFamily: fonts.semiBold,
                fontSize: 19,
              }}
            >
              {section.title}
            </Text>

            {section.questions.map((item) => {
              const isExpanded = expandedQuestion === item.question;

              return (
                <NeoBox
                  key={item.question}
                  style={{
                    padding: spacing.lg,
                    gap: spacing.sm,
                  }}
                >
                  <Pressable
                    onPress={() => toggleQuestion(item.question)}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: isExpanded }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: spacing.md,
                    }}
                  >
                    <Text
                      style={{
                        flex: 1,
                        fontFamily: fonts.semiBold,
                        fontSize: 15,
                      }}
                    >
                      {item.question}
                    </Text>

                    <Icon
                      name={isExpanded ? 'chevronDown' : 'chevronRight'}
                      size={20}
                      strokeWidth={2.5}
                    />
                  </Pressable>

                  {isExpanded && (
                    <View
                      style={{
                        borderTopWidth: 1,
                        borderTopColor: colors.border,
                        paddingTop: spacing.md,
                      }}
                    >
                      <Text
                        color={colors.ink}
                        style={{
                          fontSize: 14,
                          lineHeight: 22,
                        }}
                      >
                        {item.answer}
                      </Text>
                    </View>
                  )}
                </NeoBox>
              );
            })}
          </View>
        ))}

        <NeoBox
          backgroundColor={colors.page}
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
            Still need help?
          </Text>

          <Text color={colors.ink}>
            If you encounter a problem that is not covered here, please
            contact the Areté development team through its official
            support channel.
          </Text>
        </NeoBox>

        <View style={{ alignItems: 'center', paddingTop: spacing.md }}>
          <Text variant="caption" color={colors.muted}>
            Areté · Version 1.0.0
          </Text>
        </View>
      </ScrollView>
    </SettingsScaffold>
  );
}
