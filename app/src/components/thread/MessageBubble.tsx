/**
 * MessageBubble — themed chat message for user and assistant.
 *
 * Shows a source badge on assistant messages:
 *   🟢 "Live Answer"   — came from the API right now
 *   🟡 "Cached Answer" — served from local cache (offline fallback)
 */

import React from 'react'
import { StyleSheet, View, Image } from 'react-native'
import { Wifi, Clock } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import { spacing, radii } from '../../theme/tokens'
import { KMText } from '../ui/Text'
import { AnswerBlock } from '../search/AnswerBlock'
import type { Citation, SourceBreakdown } from '../../services/searchService'

interface Props {
  role: 'user' | 'assistant'
  content: string
  imageUri?: string | null
  citations?: Citation[]
  intent?: string
  offlineFallback?: boolean
  confidenceScore?: number
  sourceBreakdown?: SourceBreakdown
  answerLanguage?: string
  detectedLanguage?: string
  onLanguageChange?: (lang: string) => void
}

export const MessageBubble: React.FC<Props> = ({
  role,
  content,
  imageUri,
  citations = [],
  intent,
  offlineFallback = false,
  confidenceScore = 0.75,
  sourceBreakdown,
  answerLanguage,
  detectedLanguage,
  onLanguageChange,
}) => {
  const { theme } = useTheme()
  const isUser = role === 'user'

  if (isUser) {
    return (
      <View style={styles.userRow}>
        <View style={[styles.userBubble, { backgroundColor: theme.bubble.user }]}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={[styles.image, { borderColor: theme.bubble.user }]} />
          ) : null}
          {content ? (
            <KMText size="base" color={theme.bubble.userText} style={{ lineHeight: 22 }}>
              {content}
            </KMText>
          ) : null}
        </View>
      </View>
    )
  }

  // Assistant bubble
  return (
    <View style={[styles.assistantBubble, {
      backgroundColor: theme.bubble.assistant,
      borderColor: theme.bubble.assistantBorder,
    }]}>
      {/* Source badge — clearly tells user where the answer came from */}
      <View style={[styles.sourceBadge, {
        backgroundColor: offlineFallback ? '#FEF3C7' : '#E6FBF3',
        borderColor:     offlineFallback ? '#FCD34D' : '#6EE7B7',
      }]}>
        {offlineFallback
          ? <Clock size={11} color="#D97706" strokeWidth={2.5} />
          : <Wifi  size={11} color="#059669" strokeWidth={2.5} />}
        <KMText
          size="xs"
          weight="semibold"
          color={offlineFallback ? '#D97706' : '#059669'}
          style={{ marginLeft: 4 }}
        >
          {offlineFallback ? 'Cached Answer' : 'Live Answer'}
        </KMText>
      </View>

      <AnswerBlock
        answer={content}
        citations={citations}
        intent={intent}
        confidenceScore={confidenceScore}
        sourceBreakdown={sourceBreakdown}
        offlineFallback={offlineFallback}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  userRow: {
    alignItems: 'flex-end',
    marginBottom: spacing.md,
  },
  userBubble: {
    borderRadius: radii.xl,
    borderBottomRightRadius: radii.xs,
    padding: spacing.md,
    maxWidth: '82%',
    gap: spacing.sm,
  },
  image: {
    width: 160,
    height: 120,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  assistantBubble: {
    borderRadius: radii.xl,
    borderBottomLeftRadius: radii.xs,
    borderWidth: 1,
    padding: spacing.base,
    marginBottom: spacing.md,
    width: '100%',
  },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 99,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
})

export default MessageBubble
