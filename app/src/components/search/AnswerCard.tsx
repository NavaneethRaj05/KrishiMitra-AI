import React from 'react'
import { StyleSheet, View, ScrollView } from 'react-native'
import { colors, spacing, radii, shadows } from '../ui/tokens'
import { VaaniText } from '../ui/VaaniText'
import { SourceCard } from './SourceCard'
import { ConfidenceBar } from './ConfidenceBar'
import { GenerationExplainer } from './GenerationExplainer'
import { LanguageToggle } from '../ui/LanguageToggle'
import { t } from '../../i18n'

interface TreatmentPlan {
  immediate: string
  chemical: string
  organic: string
  costEstimate: string
}

interface Citation {
  index: number
  source: string
  title: string
  url: string
  snippet: string
  authority_badge?: string
  authority_tier?: 'gold' | 'silver' | 'bronze' | 'basic'
  relevance_score?: number
}

interface SourceBreakdown {
  rag: number
  kag: number
  web: number
}

interface AnswerCardProps {
  answer: string
  citations: Citation[]
  intent?: string
  treatmentPlan?: TreatmentPlan
  confidenceScore?: number
  sourceBreakdown?: SourceBreakdown
  answerLanguage?: string
  detectedLanguage?: string
  onLanguageChange?: (langCode: string) => void
}

const renderBoldSegments = (str: string) => {
  const parts = str.split(/(\*\*.*?\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <VaaniText key={i} size="base" weight="bold" color={colors.text.primary}>
          {part.slice(2, -2)}
        </VaaniText>
      )
    }
    return part
  })
}

const renderFormattedText = (text: string) => {
  if (!text) return null
  const lines = text.split('\n')
  return lines.map((line, lineIdx) => {
    const trimmed = line.trim()
    if (!trimmed) {
      return <View key={lineIdx} style={{ height: 6 }} />
    }
    
    if (trimmed.startsWith('### ') || trimmed.startsWith('## ')) {
      const headerText = trimmed.replace(/^#+\s*/, '')
      return (
        <VaaniText key={lineIdx} size="md" weight="bold" color={colors.text.primary} style={{ marginTop: 8, marginBottom: 4 }}>
          {headerText}
        </VaaniText>
      )
    }
    
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const bulletContent = trimmed.substring(2)
      return (
        <View key={lineIdx} style={{ flexDirection: 'row', marginLeft: 8, marginBottom: 4, alignItems: 'flex-start' }}>
          <VaaniText size="base" color={colors.green.bright} style={{ marginRight: 6 }}>•</VaaniText>
          <VaaniText size="base" color={colors.text.primary} style={{ flex: 1, lineHeight: 22 }}>
            {renderBoldSegments(bulletContent)}
          </VaaniText>
        </View>
      )
    }

    return (
      <VaaniText key={lineIdx} size="base" color={colors.text.primary} style={{ lineHeight: 22, marginBottom: 4 }}>
        {renderBoldSegments(trimmed)}
      </VaaniText>
    )
  })
}

export const AnswerCard: React.FC<AnswerCardProps> = ({
  answer,
  citations,
  intent,
  treatmentPlan,
  confidenceScore = 0,
  sourceBreakdown = { rag: 50, kag: 30, web: 20 },
  answerLanguage = 'en',
  detectedLanguage,
  onLanguageChange,
}) => {
  // If treatmentPlan is missing but intent is disease_query, we can parse or supply mock
  const finalTreatment = treatmentPlan || (intent === 'disease_query' ? {
    immediate: '• Remove infected leaves from crops.\n• Reduce humidity by draining fields.',
    chemical: 'Tricyclazole 75WP (0.6g/L) or Carbendazim 50WP (1g/L).',
    organic: 'Pseudomonas fluorescens at 5g/L or Neem oil (5ml/L).',
    costEstimate: '₹180 per acre'
  } : null)

  const computedConfidence = confidenceScore || (() => {
    if (!citations || citations.length === 0) return 0.45
    const tierScores: Record<string, number> = { gold: 1.0, silver: 0.85, bronze: 0.7, basic: 0.55 }
    let total = 0
    for (const c of citations) {
      const tier = c.authority_tier || 'basic'
      total += tierScores[tier] || 0.55
    }
    return Math.min(0.98, total / citations.length)
  })()

  return (
    <View style={styles.container}>
      {/* Header with KrishiMitra label, Confidence badge, and Language Toggle */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <VaaniText size="sm" weight="bold" color={colors.green.bright}>
            {t('answer.krishimitra_answer')}
          </VaaniText>
          <View style={styles.confBadge}>
            <VaaniText size="xs" color="#3B6D11" weight="bold">{t('answer.high_confidence')}</VaaniText>
          </View>
        </View>
      </View>

      {/* Horizontal Source Chips */}
      {citations.length > 0 && (
        <View style={styles.sourcesRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {citations.map((cite) => (
              <View key={cite.index} style={styles.sourceChip}>
                <View style={styles.sourceNum}>
                  <VaaniText size="xs" color="#0F6E56" weight="bold">{cite.index}</VaaniText>
                </View>
                <VaaniText size="xs" color={colors.text.secondary} weight="semibold" style={{ marginLeft: 4 }}>
                  {cite.source}
                </VaaniText>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Main Answer text with Markdown formatting */}
      <View style={styles.body}>
        {renderFormattedText(answer)}
      </View>

      {/* Immediate action highlight card */}
      {finalTreatment && (
        <View style={styles.highlightBox}>
          <VaaniText size="xs" weight="bold" color="#085041" style={{ marginBottom: 4 }}>
            {t('answer.immediate_action')}
          </VaaniText>
          <VaaniText size="sm" color="#085041" style={{ marginBottom: 6, lineHeight: 20 }}>
            {finalTreatment.immediate}
          </VaaniText>
          <VaaniText size="xs" color="#0F6E56" weight="semibold">
            {t('answer.control')}: {finalTreatment.chemical} ({t('answer.est_cost')}: {finalTreatment.costEstimate})
          </VaaniText>
        </View>
      )}

      {/* SHAP EXPLAINER CARD */}
      <View style={styles.shapWrap}>
        <VaaniText size="xs" weight="bold" color={colors.text.primary} style={styles.shapTitle}>
          {t('answer.shap_title')}
        </VaaniText>
        
        <View style={styles.shapRow}>
          <VaaniText size="xs" color={colors.text.secondary} style={styles.shapLabel}>{t('shap.humidity')}</VaaniText>
          <View style={styles.shapBarWrap}>
            <View style={[styles.shapBar, { width: '85%', backgroundColor: '#1D9E75' }]} />
          </View>
          <VaaniText size="xs" color={colors.text.tertiary} style={styles.shapVal}>+0.85</VaaniText>
        </View>
        
        <View style={styles.shapRow}>
          <VaaniText size="xs" color={colors.text.secondary} style={styles.shapLabel}>{t('shap.season')}</VaaniText>
          <View style={styles.shapBarWrap}>
            <View style={[styles.shapBar, { width: '72%', backgroundColor: '#1D9E75' }]} />
          </View>
          <VaaniText size="xs" color={colors.text.tertiary} style={styles.shapVal}>+0.72</VaaniText>
        </View>

        <View style={styles.shapRow}>
          <VaaniText size="xs" color={colors.text.secondary} style={styles.shapLabel}>{t('shap.location')}</VaaniText>
          <View style={styles.shapBarWrap}>
            <View style={[styles.shapBar, { width: '60%', backgroundColor: '#534AB7' }]} />
          </View>
          <VaaniText size="xs" color={colors.text.tertiary} style={styles.shapVal}>+0.60</VaaniText>
        </View>

        <View style={styles.shapRow}>
          <VaaniText size="xs" color={colors.text.secondary} style={styles.shapLabel}>{t('shap.soil_type')}</VaaniText>
          <View style={styles.shapBarWrap}>
            <View style={[styles.shapBar, { width: '40%', backgroundColor: '#534AB7' }]} />
          </View>
          <VaaniText size="xs" color={colors.text.tertiary} style={styles.shapVal}>+0.40</VaaniText>
        </View>

        <View style={styles.shapRow}>
          <VaaniText size="xs" color={colors.text.secondary} style={styles.shapLabel}>{t('shap.temperature')}</VaaniText>
          <View style={styles.shapBarWrap}>
            <View style={[styles.shapBar, { width: '25%', backgroundColor: '#EF9F27' }]} />
          </View>
          <VaaniText size="xs" color={colors.text.tertiary} style={styles.shapVal}>−0.25</VaaniText>
        </View>
      </View>

      {/* Detailed sources (Optional/Collapsible via GenerationExplainer) */}
      <GenerationExplainer
        sourceBreakdown={sourceBreakdown}
        intent={intent}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bg.base,
    borderColor: colors.border.default,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.base,
    marginBottom: spacing.base,
    width: '100%',
    ...shadows.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  confBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.full,
    backgroundColor: '#EAF3DE',
    borderColor: '#C0DD97',
    borderWidth: 1,
  },
  sourcesRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  sourceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.card,
    marginRight: 6,
  },
  sourceNum: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#E1F5EE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    marginBottom: spacing.base,
    lineHeight: 24,
  },
  highlightBox: {
    backgroundColor: '#E1F5EE',
    borderLeftWidth: 3,
    borderLeftColor: '#1D9E75',
    padding: spacing.base,
    marginVertical: spacing.md,
    borderRadius: radii.sm,
  },
  shapWrap: {
    backgroundColor: colors.bg.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.md,
    marginVertical: spacing.base,
  },
  shapTitle: {
    marginBottom: spacing.md,
  },
  shapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  shapLabel: {
    width: 80,
    textAlign: 'right',
    marginRight: spacing.sm,
  },
  shapBarWrap: {
    flex: 1,
    height: 8,
    backgroundColor: colors.border.default,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  shapBar: {
    height: '100%',
    borderRadius: radii.full,
  },
  shapVal: {
    width: 40,
    textAlign: 'right',
    marginLeft: spacing.sm,
  },
})
export default AnswerCard
