/**
 * MandiCard — mandi/market price card.
 */

import React from 'react'
import { View, StyleSheet } from 'react-native'
import { TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import { spacing, radii, shadows } from '../../theme/tokens'
import { KMText } from '../ui/Text'

interface MandiPrice {
  crop:    string
  price:   string
  change:  string
  trend:   'up' | 'down' | 'flat'
  market:  string
}

export type { MandiPrice }

interface MandiCardProps {
  items: MandiPrice[]
}

const CROP_ICONS: Record<string, string> = {
  Tomato: '🍅',
  Potato: '🥔',
  Onion: '🧅',
  Paddy: '🌾',
  Wheat: '🌾',
  Cotton: '☁️',
}

export const MandiCard: React.FC<MandiCardProps> = ({ items }) => {
  const { theme } = useTheme()

  return (
    <View style={[styles.card, {
      backgroundColor: theme.bg.surface,
      borderColor:     theme.border.default,
      ...shadows.sm,
    }]}>
      {items.map((item, i) => {
        // Price goes UP = Good for farmer = Green
        // Price goes DOWN = Bad for farmer = Amber/Red
        const trendColor = item.trend === 'up'
          ? theme.status.success
          : item.trend === 'down'
          ? theme.status.warning
          : theme.text.tertiary

        const TrendIcon = item.trend === 'up'
          ? ArrowUpRight
          : item.trend === 'down'
          ? ArrowDownRight
          : Minus

        const icon = CROP_ICONS[item.crop] || '🌱'

        return (
          <View
            key={i}
            style={[
              styles.row,
              i < items.length - 1 && { borderBottomColor: theme.border.subtle, borderBottomWidth: 1 },
            ]}
          >
            {/* Left: Icon & Crop Name */}
            <View style={styles.cropCol}>
              <View style={[styles.iconWrap, { backgroundColor: theme.bg.subtle }]}>
                <KMText size="lg">{icon}</KMText>
              </View>
              <View>
                <KMText size="sm" weight="semibold">{item.crop}</KMText>
                <KMText size="xs" color={theme.text.tertiary} style={{ marginTop: 2 }}>{item.market}</KMText>
              </View>
            </View>
            
            {/* Right: Price & Trend */}
            <View style={styles.priceCol}>
              <KMText size="base" weight="bold">{item.price}</KMText>
              <View style={styles.changeRow}>
                <TrendIcon size={14} color={trendColor} />
                <KMText size="xs" weight="medium" color={trendColor} style={{ marginLeft: 2 }}>
                  {item.change}
                </KMText>
              </View>
            </View>
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii['2xl'],
    borderWidth:  1,
    overflow:     'hidden',
  },
  row: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    paddingHorizontal: spacing.lg,
    paddingVertical:   spacing.md,
  },
  cropCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  priceCol: {
    alignItems: 'flex-end',
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
})

export default MandiCard
