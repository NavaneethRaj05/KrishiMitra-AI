/**
 * MessageBubble — themed chat message for user and assistant.
 */

import React from 'react'
import { StyleSheet, View, Image } from 'react-native'
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
          {imageUri && (
            <Image
              source={{ uri: imageUri }}
              style={[styles.image, { borderColor: theme.bubble.user }]}
            />
          )}
          {content ? (
            <KMText size="base" color={theme.bubble.userText} style={{ lineHeight: 22 }}>
              {content}
            </KMText>
          ) : null}
        </View>
      </View>
    )
  }

  // Assistant message
  return (
    <View style={[styles.assistantBubble, {
      backgroundColor: theme.bubble.assistant,
      borderColor: theme.bubble.assistantBorder,
    }]}>
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
})

export default MessageBubble
