import React from 'react'
import { StyleSheet, View, TouchableOpacity, Linking } from 'react-native'
import { colors, spacing, radii } from '../ui/tokens'
import { VaaniText } from '../ui/VaaniText'
import { ExternalLink } from 'lucide-react-native'

interface Citation {
  index: number
  source: string
  title: string
  url: string
  snippet: string
}

interface CitationRowProps {
  citations: Citation[]
}

export const CitationRow: React.FC<CitationRowProps> = ({ citations }) => {
  const handleOpenLink = (url: string) => {
    if (url && url !== '#') {
      Linking.openURL(url).catch((err) => console.error('Failed to open link:', err))
    }
  }

  return (
    <View style={styles.container}>
      <VaaniText size="base" weight="semibold" color={colors.text.secondary} style={styles.title}>
        Sources & Citations
      </VaaniText>
      
      {citations.map((cite) => (
        <View key={cite.index} style={styles.card}>
          <View style={styles.header}>
            <View style={styles.indexCircle}>
              <VaaniText size="xs" weight="bold" color={colors.text.inverse}>
                {cite.index}
              </VaaniText>
            </View>
            
            <View style={styles.headerText}>
              <VaaniText size="sm" weight="semibold" color={colors.sand.bright}>
                {cite.source}
              </VaaniText>
              <VaaniText size="xs" color={colors.text.secondary} numberOfLines={1}>
                {cite.title}
              </VaaniText>
            </View>

            {cite.url && cite.url !== '#' && (
              <TouchableOpacity onPress={() => handleOpenLink(cite.url)} style={styles.linkIcon}>
                <ExternalLink size={16} color={colors.green.bright} />
              </TouchableOpacity>
            )}
          </View>
          
          <VaaniText size="sm" color={colors.text.secondary} style={styles.snippet}>
            "{cite.snippet}"
          </VaaniText>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.md,
    width: '100%',
  },
  title: {
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.bg.card,
    borderColor: colors.border.default,
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  indexCircle: {
    backgroundColor: colors.green.bright,
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  headerText: {
    flex: 1,
  },
  linkIcon: {
    padding: spacing.xs,
  },
  snippet: {
    fontStyle: 'italic',
    paddingLeft: 28,
  },
})
export default CitationRow;
