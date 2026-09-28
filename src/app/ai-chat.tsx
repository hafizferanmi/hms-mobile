import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { isUnverified, type ChatMessageDto } from '@/api/chat';
import { colors, fonts, radii } from '@/design/theme';
import { useChatHistory, useSendChatMessage } from '@/hooks/use-chat';

// -----------------------------------------------------------------------
// The mobile counterpart to hms-frontend-react's floating AiChat widget
// (src/components/misc/AiChat/), as a full screen instead of a floating
// panel — reached from Home's "PMS AI Assistant" card, which used to be
// inert. Same backend (GET /chat/history, POST /chat/message — one
// continuous thread per staff member, no streaming, no conversation
// list), same suggested prompts and "unverified reply" disclaimer as web.
// -----------------------------------------------------------------------

const EXAMPLE_PROMPTS = ["How many rooms are available today?", "Who's checking out today?", "What's this week's revenue?"];

function BackIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 18l-6-6 6-6" />
    </Svg>
  );
}
function SparkleIcon({ color = '#FFFFFF', size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
      <Circle cx={12} cy={12} r={3} />
    </Svg>
  );
}
function SendIcon() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M22 2 11 13" />
      <Path d="M22 2 15 22l-4-9-9-4z" />
    </Svg>
  );
}
function InfoIcon({ color }: { color: string }) {
  return (
    <Svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4}>
      <Circle cx={12} cy={12} r={9} />
      <Path d="M12 16v-5" strokeLinecap="round" />
      <Circle cx={12} cy={8.2} r={0.9} fill={color} stroke="none" />
    </Svg>
  );
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function TypingDot({ delay }: { delay: number }) {
  const opacity = useSharedValue(0.3);
  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(withSequence(withTiming(1, { duration: 400, easing: Easing.ease }), withTiming(0.3, { duration: 400, easing: Easing.ease })), -1),
    );
  }, [delay, opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[styles.typingDot, style]} />;
}

function TypingBubble() {
  return (
    <View style={[styles.bubbleRow, styles.bubbleRowAssistant]}>
      <View style={[styles.bubble, styles.bubbleAssistant, styles.typingBubble]}>
        <TypingDot delay={0} />
        <TypingDot delay={150} />
        <TypingDot delay={300} />
      </View>
    </View>
  );
}

function MessageBubble({ message }: { message: ChatMessageDto }) {
  const isUser = message.role === 'user';
  const flagged = isUnverified(message);
  return (
    <View style={[styles.bubbleRow, isUser ? styles.bubbleRowUser : styles.bubbleRowAssistant]}>
      <View
        style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleAssistant,
          message.isError && styles.bubbleError,
        ]}>
        <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>{message.content}</Text>
        <Text style={[styles.bubbleTime, isUser && styles.bubbleTimeUser]}>{formatTime(message.createdAt)}</Text>
        {flagged && (
          <View style={styles.unverifiedRow}>
            <InfoIcon color={colors.textFaint} />
            <Text style={styles.unverifiedText}>Suites is AI and can make mistakes</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function EmptyState({ onPromptPress }: { onPromptPress: (prompt: string) => void }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <SparkleIcon color={colors.navy} size={26} />
      </View>
      <Text style={styles.emptyTitle}>Ask me anything about today</Text>
      <Text style={styles.emptyHint}>Occupancy, arrivals, a specific guest, housekeeping, and more.</Text>
      <View style={styles.promptList}>
        {EXAMPLE_PROMPTS.map((prompt) => (
          <Pressable key={prompt} style={styles.promptChip} onPress={() => onPromptPress(prompt)}>
            <Text style={styles.promptChipText}>{prompt}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function AiChatScreen() {
  const { data: messages, isLoading, isError, error } = useChatHistory();
  const sendMutation = useSendChatMessage();
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sendMutation.isPending) return;
    setDraft('');
    sendMutation.mutate(trimmed);
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <BackIcon />
        </Pressable>
        <View style={styles.headerCenter}>
          <View style={styles.headerIcon}>
            <SparkleIcon color={colors.navy} size={16} />
          </View>
          <View>
            <Text style={styles.headerTitle}>AI Assistant</Text>
            <Text style={styles.headerSubtitle}>Ask about occupancy, guests, rooms & more</Text>
          </View>
        </View>
        <View style={{ width: 20 }} />
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.messagesScroll}
        contentContainerStyle={styles.messagesContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
        {isLoading ? (
          <ActivityIndicator color={colors.navy} style={styles.loading} />
        ) : isError ? (
          <Text style={styles.errorText}>{error.message}</Text>
        ) : !messages || messages.length === 0 ? (
          <EmptyState onPromptPress={send} />
        ) : (
          messages.map((m) => <MessageBubble key={m._id} message={m} />)
        )}
        {sendMutation.isPending && <TypingBubble />}
      </ScrollView>

      <View style={styles.inputRow}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Ask a question..."
          placeholderTextColor={colors.textFaint}
          style={styles.input}
          multiline
          editable={!sendMutation.isPending}
          onSubmitEditing={() => send(draft)}
        />
        <Pressable
          style={[styles.sendButton, (!draft.trim() || sendMutation.isPending) && styles.sendButtonDisabled]}
          disabled={!draft.trim() || sendMutation.isPending}
          onPress={() => send(draft)}>
          <SendIcon />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.navySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fonts.headingBold,
    fontSize: 15.5,
    color: colors.navyInk,
  },
  headerSubtitle: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  messagesScroll: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 10,
    flexGrow: 1,
  },
  loading: {
    marginTop: 40,
  },
  errorText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.danger,
    textAlign: 'center',
    marginTop: 40,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.navySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle: {
    fontFamily: fonts.headingBold,
    fontSize: 16,
    color: colors.navyInk,
  },
  emptyHint: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: colors.textMuted,
    textAlign: 'center',
  },
  promptList: {
    marginTop: 14,
    gap: 8,
    width: '100%',
  },
  promptChip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  promptChipText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 13,
    color: colors.navy,
    textAlign: 'center',
  },
  bubbleRow: {
    flexDirection: 'row',
  },
  bubbleRowUser: {
    justifyContent: 'flex-end',
  },
  bubbleRowAssistant: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  bubbleUser: {
    backgroundColor: colors.navy,
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 4,
  },
  bubbleError: {
    borderColor: colors.dangerSoft,
    backgroundColor: colors.dangerSoft,
  },
  bubbleText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  bubbleTextUser: {
    color: '#FFFFFF',
  },
  bubbleTime: {
    fontFamily: fonts.body,
    fontSize: 9.5,
    color: colors.textFaint,
    marginTop: 4,
    textAlign: 'right',
  },
  bubbleTimeUser: {
    color: 'rgba(255,255,255,0.6)',
  },
  unverifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  unverifiedText: {
    fontFamily: fonts.body,
    fontStyle: 'italic',
    fontSize: 9.5,
    color: colors.textFaint,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 13,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textFaint,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 20,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
