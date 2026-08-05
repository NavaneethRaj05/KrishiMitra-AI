import React, { useState } from 'react'
import { StyleSheet, View, TouchableOpacity } from 'react-native'
import { ChevronDown, ChevronUp, Cpu, Database, Globe, ArrowRight } from 'lucide-react-native'
import { colors, spacing, radii } from '../ui/tokens'
import { KrishiMitraAIText } from '../ui/KrishiMitraAIText'

interface SourceBreakdown {
  rag: number
  kag: number
  web: number
}

interface GenerationExplainerProps {
  sourceBreakdown: SourceBreakdown
  intent?: string
  sourcesUsed?: string[]
}

const PIPELINE_STEPS = [
  { label: 'Your Query', icon: '💬' },
  { label: 'Intent Detection', icon: '🎯' },
  { label: 'Source Routing', icon: '🔀' },
  { label: 'Retrieval & Ranking', icon: '📚' },
  { label: 'LLM Synthesis', icon: '🧠' },
]

export const GenerationExplainer: React.FC<GenerationExplainerProps> = ({
  sourceBreakdown,
  intent,
  sourcesUsed,
}) => {
  const [expanded, setExpanded] = useState(false)

  const total = sourceBreakdown.rag + sourceBreakdown.kag + sourceBreakdown.web
  const ragPct = total > 0 ? Math.round((sourceBreakdown.rag / total) * 100) : 0
  const kagPct = total > 0 ? Math.round((sourceBreakdown.kag / total) * 100) : 0
  const webPct = total > 0 ? Math.round((sourceBreakdown.web / total) * 100) : 0

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => setExpanded(!expanded)}
        style={styles.toggleButton}
        activeOpacity={0.7}
      >
        <KrishiMitraAIText size="xs" weight="semibold" color={colors.text.tertiary}>
          How was this answer generated?
        </KrishiMitraAIText>
        {expanded ? (
          <ChevronUp size={14} color={colors.text.tertiary} />
        ) : (
          <ChevronDown size={14} color={colors.text.tertiary} />
        )}
      </TouchableOpacity>

      {expanded && (
        <View style={styles.content}>
          {/* Source contribution bars */}
          <View style={styles.breakdownSection}>
            <KrishiMitraAIText size="xs" weight="semibold" color={colors.text.secondary} style={styles.sectionLabel}>
              Source Contribution
            </KrishiMitraAIText>

            {/* RAG */}
            <View style={styles.breakdownRow}>
              <View style={styles.breakdownLabel}>
                <Database size={12} color={colors.green.bright} />
                <KrishiMitraAIText size="xs" color={colors.text.secondary} style={styles.breakdownLabelText}>
                  RAG (Local KB)
                </KrishiMitraAIText>
              </View>
              <View style={styles.breakdownBarTrack}>
                <View style={[styles.breakdownBarFill, { width: `${ragPct}%`, backgroundColor: colors.green.bright }]} />
              </View>
              <KrishiMitraAIText size="xs" weight="bold" color={colors.green.bright} style={styles.breakdownPct}>
                {ragPct}%
              </KrishiMitraAIText>
            </View>

            {/* KAG */}
            <View style={styles.breakdownRow}>
              <View style={styles.breakdownLabel}>
                <Cpu size={12} color={colors.sky.bright} />
                <KrishiMitraAIText size="xs" color={colors.text.secondary} style={styles.breakdownLabelText}>
                  KAG (Graph)
                </KrishiMitraAIText>
              </View>
              <View style={styles.breakdownBarTrack}>
                <View style={[styles.breakdownBarFill, { width: `${kagPct}%`, backgroundColor: colors.sky.bright }]} />
              </View>
              <KrishiMitraAIText size="xs" weight="bold" color={colors.sky.bright} style={styles.breakdownPct}>
                {kagPct}%
              </KrishiMitraAIText>
            </View>

            {/* Web */}
            <View style={styles.breakdownRow}>
              <View style={styles.breakdownLabel}>
                <Globe size={12} color={colors.sand.bright} />
                <KrishiMitraAIText size="xs" color={colors.text.secondary} style={styles.breakdownLabelText}>
                  Web Search
                </KrishiMitraAIText>
              </View>
              <View style={styles.breakdownBarTrack}>
                <View style={[styles.breakdownBarFill, { width: `${webPct}%`, backgroundColor: colors.sand.bright }]} />
              </View>
              <KrishiMitraAIText size="xs" weight="bold" color={colors.sand.bright} style={styles.breakdownPct}>
                {webPct}%
              </KrishiMitraAIText>
            </View>
          </View>

          {/* Pipeline steps */}
          <View style={styles.pipelineSection}>
            <KrishiMitraAIText size="xs" weight="semibold" color={colors.text.secondary} style={styles.sectionLabel}>
              Answer Pipeline
            </KrishiMitraAIText>
            <View style={styles.pipelineRow}>
              {PIPELINE_STEPS.map((step, i) => (
                <React.Fragment key={step.label}>
                  <View style={styles.pipelineStep}>
                    <KrishiMitraAIText size="sm">{step.icon}</KrishiMitraAIText>
                    <KrishiMitraAIText size="xs" color={colors.text.tertiary} align="center" style={styles.pipelineLabel}>
                      {step.label}
                    </KrishiMitraAIText>
                  </View>
                  {i < PIPELINE_STEPS.length - 1 && (
                    <ArrowRight size={10} color={colors.text.tertiary} style={styles.pipelineArrow} />
                  )}
                </React.Fragment>
              ))}
            </View>
          </View>

          {/* Intent detected */}
          {intent && (
            <View style={styles.intentRow}>
              <KrishiMitraAIText size="xs" color={colors.text.tertiary}>
                Detected Intent:
              </KrishiMitraAIText>
              <View style={styles.intentBadge}>
                <KrishiMitraAIText size="xs" weight="bold" color={colors.sky.bright}>
                  {intent.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </KrishiMitraAIText>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderTopColor: colors.border.default,
    borderTopWidth: 1,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
  },
  toggleButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  content: {
    marginTop: spacing.md,
  },
  breakdownSection: {
    marginBottom: spacing.md,
  },
  sectionLabel: {
    marginBottom: spacing.sm,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  breakdownLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 100,
  },
  breakdownLabelText: {
    marginLeft: spacing.xs,
  },
  breakdownBarTrack: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: radii.full,
    height: 4,
    overflow: 'hidden',
    marginHorizontal: spacing.sm,
  },
  breakdownBarFill: {
    borderRadius: radii.full,
    height: '100%',
  },
  breakdownPct: {
    width: 32,
    textAlign: 'right',
  },
  pipelineSection: {
    marginBottom: spacing.md,
  },
  pipelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  pipelineStep: {
    alignItems: 'center',
    maxWidth: 56,
  },
  pipelineLabel: {
    marginTop: 2,
  },
  pipelineArrow: {
    marginHorizontal: 2,
    marginTop: -10,
  },
  intentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  intentBadge: {
    backgroundColor: colors.sky.dim,
    borderRadius: radii.sm,
    marginLeft: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
})
export default GenerationExplainer
