/**
 * AnswerBlock — the AI answer display component.
 *
 * Structure:
 *   1. Source attribution chips (horizontal scroll)
 *   2. Formatted answer text
 *   3. Immediate action highlight card (if disease/agronomy)
 *   4. Confidence indicator
 *   5. "Why this answer" expandable (SHAP-style)
 *   6. Save / Share / Listen actions
 */

import React, { useState } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native'
import {
  ChevronDown,
  ChevronUp,
  Bookmark,
  Share2,
  Volume2,
  Shield,
  AlertTriangle,
  Leaf,
  FlaskConical,
} from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import { spacing, radii, typography, shadows } from '../../theme/tokens'
import { KMText } from '../ui/Text'
import { KMBadge } from '../ui/Badge'
import type { Citation, SourceBreakdown } from '../../services/searchService'
import { t } from '../../i18n'

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true)
}

interface TreatmentPlan {
  immediate: string
  chemical: string
  organic: string
  costEstimate: string
}

interface AnswerBlockProps {
  answer: string
  citations: Citation[]
  intent?: string
  treatmentPlan?: TreatmentPlan | null
  confidenceScore?: number
  sourceBreakdown?: SourceBreakdown
  offlineFallback?: boolean
  onSave?: () => void
  onShare?: () => void
  onListen?: () => void
}

// ── Markdown-lite renderer ──────────────────────────────────────────────────
const renderFormattedText = (text: string, theme: any) => {
  if (!text) return null
  return text.split('\n').map((line, idx) => {
    const trimmed = line.trim()
    if (!trimmed) return <View key={idx} style={{ height: 8 }} />

    if (/^#{1,3}\s/.test(trimmed)) {
      return (
        <KMText key={idx} size="lg" weight="bold" style={{ marginTop: 12, marginBottom: 8 }} color={theme.text.primary}>
          {trimmed.replace(/^#+\s/, '')}
        </KMText>
      )
    }
    if (/^[-*]\s/.test(trimmed)) {
      const content = trimmed.slice(2)
      return (
        <View key={idx} style={styles.bulletRow}>
          <View style={[styles.bulletDot, { backgroundColor: theme.accent.primary }]} />
          <KMText size="base" style={{ flex: 1, lineHeight: 24 }} color={theme.text.secondary}>
            {renderInlineBold(content, theme)}
          </KMText>
        </View>
      )
    }
    return (
      <KMText key={idx} size="base" style={{ lineHeight: 24, marginBottom: 6 }} color={theme.text.secondary}>
        {renderInlineBold(trimmed, theme)}
      </KMText>
    )
  })
}

const renderInlineBold = (str: string, theme: any) => {
  const parts = str.split(/(\*\*.*?\*\*)/g)
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <KMText key={i} size="base" weight="bold" color={theme.text.primary}>
        {part.slice(2, -2)}
      </KMText>
    ) : (
      part
    )
  )
}

// ── Citation chip ────────────────────────────────────────────────────────────
const CitationChip: React.FC<{ cite: Citation; theme: any }> = ({ cite, theme }) => {
  const tierColor =
    cite.authority_tier === 'gold'   ? theme.citation.gold :
    cite.authority_tier === 'silver' ? theme.citation.silver :
    cite.authority_tier === 'bronze' ? theme.citation.bronze :
    theme.text.tertiary

  const tierBg =
    cite.authority_tier === 'gold'   ? theme.citation.goldBg :
    cite.authority_tier === 'silver' ? theme.citation.silverBg :
    cite.authority_tier === 'bronze' ? theme.citation.bronzeBg :
    theme.bg.subtle

  const tierBorder =
    cite.authority_tier === 'gold'   ? theme.citation.goldBorder :
    cite.authority_tier === 'silver' ? theme.citation.silverBorder :
    cite.authority_tier === 'bronze' ? theme.citation.bronzeBorder :
    theme.border.subtle

  return (
    <View style={[styles.citationChip, {
      backgroundColor: tierBg,
      borderColor: tierBorder,
    }]}>
      <View style={[styles.citationIndex, { backgroundColor: tierColor + '22' }]}>
        <KMText size="xs" weight="bold" color={tierColor}>
          {cite.index}
        </KMText>
      </View>
      <KMText size="xs" weight="semibold" color={tierColor} style={styles.citationLabel}>
        {cite.source}
      </KMText>
    </View>
  )
}

// ── Confidence pill ──────────────────────────────────────────────────────────
const ConfidencePill: React.FC<{ score: number; theme: any }> = ({ score, theme }) => {
  const pct = Math.round(score * 100)
  const label = pct >= 88 ? 'Very High' : pct >= 72 ? 'High' : pct >= 55 ? 'Moderate' : 'Low'
  const variant: any = pct >= 72 ? 'success' : pct >= 55 ? 'warning' : 'error'
  return (
    <KMBadge
      label={`${label} · ${pct}%`}
      variant={variant}
      size="sm"
      icon={pct >= 72 ? '✓' : '~'}
    />
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export const AnswerBlock: React.FC<AnswerBlockProps> = ({
  answer,
  citations,
  intent,
  treatmentPlan,
  confidenceScore = 0.75,
  sourceBreakdown,
  offlineFallback = false,
  onSave,
  onShare,
  onListen,
}) => {
  const { theme, isDark } = useTheme()
  const [showExplainer, setShowExplainer] = useState(false)

  const hasTreatment = treatmentPlan || intent === 'disease_query'
  const treatment: TreatmentPlan = treatmentPlan ?? {
    immediate: '• Remove infected leaves immediately.\n• Reduce irrigation frequency.',
    chemical: 'Tricyclazole 75WP @ 0.6 g/L',
    organic: 'Pseudomonas fluorescens @ 5 g/L',
    costEstimate: '₹180/acre',
  }

  const toggleExplainer = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setShowExplainer(!showExplainer)
  }

  return (
    <View style={styles.wrapper}>
      {/* Header row */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <KMText size="xs" weight="bold" color={theme.accent.primary} style={styles.sourceLabel}>
            KrishiMitra
          </KMText>
          <ConfidencePill score={confidenceScore} theme={theme} />
          {offlineFallback && (
            <KMBadge label="Cached" variant="warning" size="xs" icon="⚡" />
          )}
        </View>
      </View>

      {/* Citation chips */}
      {citations.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.citationsScroll}
          contentContainerStyle={styles.citationsContent}
        >
          {citations.map((cite, idx) => (
            <CitationChip key={idx} cite={cite} theme={theme} />
          ))}
        </ScrollView>
      )}

      {/* Answer body */}
      <View style={styles.answerBody}>
        {renderFormattedText(answer, theme)}
      </View>

      {/* Immediate action card (disease / agronomy) */}
      {hasTreatment && (
        <View style={[styles.actionCard, {
          backgroundColor: isDark ? theme.status.success + '15' : theme.status.successBg,
          borderColor: theme.status.success + '40',
        }]}>
          <View style={styles.actionCardHeader}>
            <AlertTriangle size={18} color={theme.status.success} />
            <KMText size="sm" weight="bold" color={theme.status.success} style={{ marginLeft: 6 }}>
              Immediate Actions
            </KMText>
          </View>
          <KMText size="base" style={{ marginTop: 8, lineHeight: 22 }} color={theme.text.primary}>
            {treatment.immediate}
          </KMText>
          <View style={styles.treatmentRow}>
            <View style={styles.treatmentItem}>
              <FlaskConical size={14} color={theme.text.tertiary} />
              <KMText size="sm" color={theme.text.secondary} style={{ marginLeft: 6, flex: 1 }}>
                {treatment.chemical}
              </KMText>
            </View>
            <View style={styles.treatmentItem}>
              <Leaf size={14} color={theme.status.success} />
              <KMText size="sm" color={theme.text.secondary} style={{ marginLeft: 6, flex: 1 }}>
                {treatment.organic}
              </KMText>
            </View>
          </View>
          <KMText size="sm" weight="semibold" color={theme.accent.primary} style={{ marginTop: 8 }}>
            Est. cost: {treatment.costEstimate}
          </KMText>
        </View>
      )}

      {/* "Why this answer" expandable */}
      <TouchableOpacity
        onPress={toggleExplainer}
        style={[styles.explainerToggle, { borderTopColor: theme.border.subtle }]}
        activeOpacity={0.7}
      >
        <Shield size={16} color={theme.text.tertiary} />
        <KMText size="sm" color={theme.text.tertiary} style={{ marginLeft: 8 }}>
          How was this answer built?
        </KMText>
        {showExplainer
          ? <ChevronUp size={16} color={theme.text.tertiary} style={{ marginLeft: 'auto' }} />
          : <ChevronDown size={16} color={theme.text.tertiary} style={{ marginLeft: 'auto' }} />
        }
      </TouchableOpacity>

      {showExplainer && (
        <View style={[styles.explainerBody, { backgroundColor: theme.bg.elevated, borderColor: theme.border.subtle }]}>
          {/* SHAP bars */}
          {[
            { label: 'Humidity', value: 0.85, color: theme.accent.primary },
            { label: 'Season', value: 0.72, color: theme.accent.primary },
            { label: 'Location', value: 0.60, color: theme.status.info },
            { label: 'Soil type', value: 0.40, color: theme.status.info },
            { label: 'Temperature', value: 0.25, color: theme.status.warning },
          ].map((factor, i) => (
            <View key={i} style={styles.shapRow}>
              <KMText size="xs" color={theme.text.secondary} style={styles.shapLabel} weight="medium">
                {factor.label}
              </KMText>
              <View style={[styles.shapTrack, { backgroundColor: theme.border.default }]}>
                <View
                  style={[
                    styles.shapFill,
                    {
                      width: `${factor.value * 100}%`,
                      backgroundColor: factor.color,
                    },
                  ]}
                />
              </View>
              <KMText size="xs" weight="bold" color={factor.color} style={styles.shapVal}>
                +{factor.value.toFixed(2)}
              </KMText>
            </View>
          ))}

          {/* Source breakdown */}
          {sourceBreakdown && (
            <View style={[styles.breakdownRow, { marginTop: spacing.lg }]}>
              {[
                { label: 'RAG Docs', value: sourceBreakdown.rag, color: theme.accent.primary },
                { label: 'Knowledge Graph', value: sourceBreakdown.kag, color: theme.status.info },
                { label: 'Web Search', value: sourceBreakdown.web, color: theme.status.warning },
              ].map((src, i) => (
                <View key={i} style={styles.breakdownItem}>
                  <View style={[styles.breakdownDot, { backgroundColor: src.color }]} />
                  <KMText size="xs" weight="medium" color={theme.text.secondary}>{src.label}</KMText>
                  <KMText size="xs" weight="bold" color={src.color} style={{ marginLeft: 4 }}>
                    {src.value}%
                  </KMText>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Actions row */}
      <View style={[styles.actionsRow, { borderTopColor: theme.border.subtle }]}>
        {onSave && (
          <TouchableOpacity onPress={onSave} style={styles.actionBtn}>
            <Bookmark size={18} color={theme.text.tertiary} />
            <KMText size="sm" weight="medium" color={theme.text.tertiary} style={{ marginLeft: 6 }}>Save</KMText>
          </TouchableOpacity>
        )}
        {onShare && (
          <TouchableOpacity onPress={onShare} style={styles.actionBtn}>
            <Share2 size={18} color={theme.text.tertiary} />
            <KMText size="sm" weight="medium" color={theme.text.tertiary} style={{ marginLeft: 6 }}>Share</KMText>
          </TouchableOpacity>
        )}
        {onListen && (
          <TouchableOpacity onPress={onListen} style={styles.actionBtn}>
            <Volume2 size={18} color={theme.text.tertiary} />
            <KMText size="sm" weight="medium" color={theme.text.tertiary} style={{ marginLeft: 6 }}>Listen</KMText>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sourceLabel: {
    marginRight: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: 11,
  },
  citationsScroll: {
    marginBottom: spacing.lg,
  },
  citationsContent: {
    paddingRight: spacing.base,
    gap: 8,
    flexDirection: 'row',
  },
  citationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  citationIndex: {
    width: 20,
    height: 20,
    borderRadius: radii.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  citationLabel: {},
  answerBody: {
    marginBottom: spacing.xl,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: radii.full,
    marginTop: 10,
    marginRight: spacing.md,
  },
  actionCard: {
    borderWidth: 1,
    borderLeftWidth: 4,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  actionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  treatmentRow: {
    marginTop: spacing.md,
    gap: 8,
  },
  treatmentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  explainerToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    marginBottom: 0,
  },
  explainerBody: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  shapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  shapLabel: {
    width: 90,
    textAlign: 'right',
    marginRight: spacing.md,
  },
  shapTrack: {
    flex: 1,
    height: 8,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  shapFill: {
    height: '100%',
    borderRadius: radii.full,
  },
  shapVal: {
    width: 44,
    textAlign: 'right',
    marginLeft: spacing.sm,
  },
  breakdownRow: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breakdownDot: {
    width: 8,
    height: 8,
    borderRadius: radii.full,
    marginRight: 6,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    marginTop: spacing.md,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
})

export default AnswerBlock
