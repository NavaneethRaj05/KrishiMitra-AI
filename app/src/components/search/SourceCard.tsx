import React from 'react'
import { StyleSheet, View, TouchableOpacity, Linking } from 'react-native'
import { ExternalLink } from 'lucide-react-native'
import { colors, spacing, radii } from '../ui/tokens'
import { KrishiMitraAIText } from '../ui/KrishiMitraAIText'

interface SourceCardProps {
  index: number
  source: string
  title: string
  url: string
  snippet: string
  authorityBadge?: string
  authorityTier?: 'gold' | 'silver' | 'bronze' | 'basic'
  relevanceScore?: number
}

const TIER_CONFIG: Record<string, { border: string; bg: string; icon: string; label: string }> = {
  gold:   { border: '#D4930A', bg: '#2A1E08', icon: '🏛️', label: 'Govt/ICAR' },
  silver: { border: '#7B8794', bg: '#1A1E22', icon: '🎓', label: 'KVK/APMC' },
  bronze: { border: '#A0694B', bg: '#1E1510', icon: '📄', label: 'Research' },
  basic:  { border: colors.border.default, bg: colors.bg.card, icon: '🌐', label: 'Web' },
}

export const SourceCard: React.FC<SourceCardProps> = ({
  index,
  source,
  title,
  url,
  snippet,
  authorityBadge,
  authorityTier = 'basic',
  relevanceScore = 0.7,
}) => {
  const config = TIER_CONFIG[authorityTier] || TIER_CONFIG.basic
  const relPercent = Math.round(relevanceScore * 100)

  const handleOpenLink = () => {
    if (url && url !== '#') {
      Linking.openURL(url).catch((err) => console.error('Failed to open link:', err))
    }
  }

  return (
    <TouchableOpacity
      onPress={handleOpenLink}
      activeOpacity={0.7}
      style={[styles.card, { borderColor: config.border, backgroundColor: config.bg }]}
    >
      {/* Header Row */}
      <View style={styles.header}>
        <View style={[styles.indexCircle, { backgroundColor: config.border }]}>
          <KrishiMitraAIText size="xs" weight="bold" color={colors.text.inverse}>
            {index}
          </KrishiMitraAIText>
        </View>

        <View style={styles.headerText}>
          <View style={styles.sourceRow}>
            <KrishiMitraAIText size="xs" weight="bold" color={config.border}>
              {config.icon} {authorityBadge || source}
            </KrishiMitraAIText>
            <View style={[styles.tierBadge, { backgroundColor: config.border + '22' }]}>
              <KrishiMitraAIText size="xs" weight="bold" color={config.border}>
                {config.label}
              </KrishiMitraAIText>
            </View>
          </View>
          <KrishiMitraAIText size="sm" weight="semibold" color={colors.text.primary} numberOfLines={1}>
            {title}
          </KrishiMitraAIText>
        </View>

        {url && url !== '#' && (
          <View style={styles.linkIcon}>
            <ExternalLink size={14} color={config.border} />
          </View>
        )}
      </View>

      {/* Snippet */}
      <KrishiMitraAIText size="xs" color={colors.text.secondary} numberOfLines={2} style={styles.snippet}>
        {snippet}
      </KrishiMitraAIText>

      {/* Relevance micro-bar */}
      <View style={styles.relevanceContainer}>
        <KrishiMitraAIText size="xs" color={colors.text.tertiary}>
          Relevance
        </KrishiMitraAIText>
        <View style={styles.relevanceTrack}>
          <View style={[styles.relevanceFill, { width: `${relPercent}%`, backgroundColor: config.border }]} />
        </View>
        <KrishiMitraAIText size="xs" color={colors.text.tertiary}>
          {relPercent}%
        </KrishiMitraAIText>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  indexCircle: {
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    marginTop: 2,
  },
  headerText: {
    flex: 1,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  tierBadge: {
    borderRadius: radii.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    marginLeft: spacing.sm,
  },
  linkIcon: {
    padding: spacing.xs,
  },
  snippet: {
    fontStyle: 'italic',
    paddingLeft: 28,
    marginBottom: spacing.sm,
  },
  relevanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 28,
  },
  relevanceTrack: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: radii.full,
    height: 3,
    flex: 1,
    marginHorizontal: spacing.sm,
    overflow: 'hidden',
  },
  relevanceFill: {
    borderRadius: radii.full,
    height: '100%',
  },
})
export default SourceCard
