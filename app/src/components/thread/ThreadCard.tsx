import React from 'react'
import { StyleSheet, TouchableOpacity, View } from 'react-native'
import { MessageSquare, Calendar, ChevronRight, Sprout, TrendingUp, HelpCircle } from 'lucide-react-native'
import { colors, spacing, radii } from '../ui/tokens'
import { VaaniText } from '../ui/VaaniText'

interface ThreadCardProps {
  title: string
  intent: string
  date: Date
  messageCount: number
  onPress: () => void
}

export const ThreadCard: React.FC<ThreadCardProps> = ({
  title,
  intent,
  date,
  messageCount,
  onPress
}) => {
  const getIntentIcon = () => {
    switch (intent) {
      case 'disease_query':
      case 'agronomy_query':
        return <Sprout size={18} color={colors.green.bright} />
      case 'market_query':
        return <TrendingUp size={18} color={colors.sand.bright} />
      default:
        return <HelpCircle size={18} color={colors.sky.bright} />
    }
  }

  return (
    <TouchableOpacity onPress={onPress} style={styles.card} activeOpacity={0.8}>
      <View style={styles.iconWrapper}>
        {getIntentIcon()}
      </View>
      
      <View style={styles.content}>
        <VaaniText size="base" weight="semibold" numberOfLines={1}>
          {title}
        </VaaniText>
        
        <View style={styles.meta}>
          <Calendar size={12} color={colors.text.tertiary} style={styles.metaIcon} />
          <VaaniText size="xs" color={colors.text.secondary}>
            {new Date(date).toLocaleDateString()}
          </VaaniText>
          <View style={styles.separator} />
          <MessageSquare size={12} color={colors.text.tertiary} style={styles.metaIcon} />
          <VaaniText size="xs" color={colors.text.secondary}>
            {messageCount} message{messageCount !== 1 ? 's' : ''}
          </VaaniText>
        </View>
      </View>

      <ChevronRight size={18} color={colors.text.tertiary} />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: colors.bg.card,
    borderColor: colors.border.default,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: spacing.sm,
    padding: spacing.base,
    width: '100%',
  },
  iconWrapper: {
    marginRight: spacing.base,
  },
  content: {
    flex: 1,
  },
  meta: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: spacing.xs,
  },
  metaIcon: {
    marginRight: 4,
  },
  separator: {
    backgroundColor: colors.border.strong,
    height: 10,
    marginHorizontal: spacing.sm,
    width: 1,
  },
})
export default ThreadCard;
