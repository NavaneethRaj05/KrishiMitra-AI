/**
 * WeatherCard — compact weather + farm advisory card for HomeScreen.
 */

import React from 'react'
import { View, StyleSheet, TouchableOpacity } from 'react-native'
import { Cloud, Wind, Droplets, AlertTriangle, Sun, CloudRain } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import { spacing, radii, shadows } from '../../theme/tokens'
import { KMText } from '../ui/Text'

interface WeatherData {
  location:    string
  temp:        string
  humidity:    string
  condition:   string
  forecast?:   string
  blastRisk?:  'Low' | 'Moderate' | 'High' | 'Very High'
  advisory?:   string
}

interface WeatherCardProps {
  data?: WeatherData
  onPress?: () => void
}

const RISK_VARIANT: Record<string, { bg: string, text: string, icon: string }> = {
  Low:         { bg: 'successBg', text: 'success', icon: 'shield-check' },
  Moderate:    { bg: 'warningBg', text: 'warning', icon: 'alert-circle' },
  High:        { bg: 'errorBg',   text: 'error',   icon: 'alert-triangle' },
  'Very High': { bg: 'errorBg',   text: 'error',   icon: 'alert-triangle' },
}

export const WeatherCard: React.FC<WeatherCardProps> = ({ data, onPress }) => {
  const { theme, isDark } = useTheme()

  const d = data ?? {
    location:   'Your Farm',
    temp:       '—',
    humidity:   '—',
    condition:  'Unavailable',
    blastRisk:  undefined,
    advisory:   'Weather data unavailable. Check back when online.',
  }

  const risk = d.blastRisk ? RISK_VARIANT[d.blastRisk] : null
  const riskColor = risk ? (theme.status as any)[risk.text] : theme.text.tertiary
  const riskBg = risk ? (theme.status as any)[risk.bg] : theme.bg.subtle

  // Fake rain probability for UI purposes since it's not in the mock data structure yet
  const rainProb = d.condition.includes('Rain') ? 80 : d.condition.includes('Cloud') ? 30 : 5

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.card, {
        backgroundColor: theme.bg.surface,
        borderColor:     theme.border.default,
        ...shadows.md,
      }]}
    >
      {/* Blue gradient accent header */}
      <View style={[styles.cardHeader, {
        backgroundColor: isDark ? '#0a1f2e' : '#e0f2fe',
        borderBottomColor: isDark ? '#1e3a4a' : '#bae6fd',
      }]}>
        {/* Header row */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <KMText size="xs" weight="semibold" color={theme.text.tertiary} style={{ letterSpacing: 0.5, textTransform: 'uppercase' }}>
              {d.location}
            </KMText>
            <View style={styles.tempRow}>
              {d.condition.includes('Sun') || d.condition === 'Clear' ? (
                <Sun size={28} color="#EAB308" style={{ marginRight: 8 }} />
              ) : d.condition.includes('Rain') ? (
                <CloudRain size={28} color={theme.status.info} style={{ marginRight: 8 }} />
              ) : (
                <Cloud size={28} color={theme.text.secondary} style={{ marginRight: 8 }} />
              )}
              <KMText size="3xl" weight="bold">{d.temp}</KMText>
            </View>
            <KMText size="sm" weight="medium" color={theme.text.secondary}>{d.condition}</KMText>
          </View>

          {/* Risk Badge */}
          {d.blastRisk && (
            <View style={[styles.riskBadge, { backgroundColor: riskBg, borderColor: riskColor + '40' }]}>
              <KMText size="xs" weight="bold" color={riskColor} align="center">
                CROP RISK
              </KMText>
              <KMText size="sm" weight="bold" color={riskColor} align="center" style={{ marginTop: 2 }}>
                {d.blastRisk}
              </KMText>
            </View>
          )}
        </View>
      </View>

      {/* Body */}
      <View style={styles.cardBody}>
        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Droplets size={14} color={theme.status.info} />
            <KMText size="xs" weight="medium" color={theme.text.secondary} style={{ marginLeft: 6 }}>
              {d.humidity}
            </KMText>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Wind size={14} color={theme.text.tertiary} />
            <KMText size="xs" weight="medium" color={theme.text.secondary} style={{ marginLeft: 6 }}>
              12 km/h
            </KMText>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <CloudRain size={14} color={theme.status.info} />
            <KMText size="xs" weight="medium" color={theme.text.secondary} style={{ marginLeft: 6 }}>
              {rainProb}%
            </KMText>
          </View>
        </View>

        {/* Rain Probability Bar */}
        <View style={styles.probTrackWrap}>
          <View style={[styles.probTrack, { backgroundColor: theme.border.default }]}>
            <View style={[styles.probFill, { width: `${rainProb}%`, backgroundColor: theme.status.info }]} />
          </View>
        </View>

        {/* Advisory */}
        {d.advisory && (
          <View style={[styles.advisory, {
            backgroundColor: isDark ? '#2A2012' : '#FEF3C7',
            borderColor:     isDark ? '#4A351A' : '#FDE68A',
          }]}>
            <AlertTriangle size={14} color="#D97706" style={{ marginTop: 2 }} />
            <KMText size="xs" weight="medium" color={isDark ? '#FCD34D' : '#92400E'} style={{ marginLeft: 8, flex: 1, lineHeight: 18 }}>
              {d.advisory}
            </KMText>
          </View>
        )}
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii['2xl'],
    borderWidth: 1,
    marginBottom: spacing.xl,
    overflow: 'hidden',
  },
  cardHeader: {
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  cardBody: {
    padding: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  tempRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    marginBottom: 2,
  },
  riskBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.md,
    borderBottomWidth: 0,
    marginBottom: spacing.sm,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(150,150,150,0.2)',
  },
  probTrackWrap: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  probTrack: {
    height: 6,
    borderRadius: radii.full,
    overflow: 'hidden',
    width: '100%',
  },
  probFill: {
    height: '100%',
    borderRadius: radii.full,
  },
  advisory: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
})

export default WeatherCard
