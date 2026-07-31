import React from 'react'
import { StyleSheet, View, Image } from 'react-native'
import { colors, spacing, radii } from '../ui/tokens'
import { VaaniText } from '../ui/VaaniText'
import { AnswerCard } from '../search/AnswerCard'

interface SourceBreakdown {
  rag: number
  kag: number
  web: number
}

interface MessageBubbleProps {
  role: 'user' | 'assistant'
  content: string
  citations?: any[]
  intent?: string
  offlineFallback?: boolean
  imageUri?: string
  confidenceScore?: number
  sourceBreakdown?: SourceBreakdown
  answerLanguage?: string
  detectedLanguage?: string
  onLanguageChange?: (langCode: string) => void
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  role,
  content,
  citations = [],
  intent,
  offlineFallback,
  imageUri,
  confidenceScore,
  sourceBreakdown,
  answerLanguage,
  detectedLanguage,
  onLanguageChange,
}) => {
  const isUser = role === 'user'

  if (!isUser) {
    return (
      <View style={styles.assistantContainer}>
        {offlineFallback && (
          <View style={styles.fallbackIndicator}>
            <VaaniText size="xs" color={colors.amber.bright} weight="bold">
              ⚡ Local Knowledge Response (Offline)
            </VaaniText>
          </View>
        )}
        <AnswerCard
          answer={content}
          citations={citations}
          intent={intent}
          confidenceScore={confidenceScore}
          sourceBreakdown={sourceBreakdown}
          answerLanguage={answerLanguage}
          detectedLanguage={detectedLanguage}
          onLanguageChange={onLanguageChange}
        />
      </View>
    )
  }

  return (
    <View style={styles.userContainer}>
      <View style={styles.userBubble}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.bubbleImage} resizeMode="cover" />
        ) : null}
        <VaaniText size="base" color={colors.text.primary}>
          {content}
        </VaaniText>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  assistantContainer: {
    alignSelf: 'flex-start',
    width: '100%',
    marginVertical: spacing.sm,
  },
  fallbackIndicator: {
    backgroundColor: colors.amber.dim,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.sm,
    marginBottom: spacing.xs,
  },
  userContainer: {
    alignSelf: 'flex-end',
    maxWidth: '80%',
    marginVertical: spacing.sm,
  },
  userBubble: {
    backgroundColor: colors.green.dim,
    borderColor: colors.green.dark,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  bubbleImage: {
    width: 200,
    height: 150,
    borderRadius: radii.sm,
    marginBottom: spacing.sm,
  },
})
export default MessageBubble
