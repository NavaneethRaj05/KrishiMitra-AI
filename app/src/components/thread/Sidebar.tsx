import React, { useState, useEffect } from 'react'
import { StyleSheet, View, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native'
import { Plus, MapPin, Clock, Trash2, LogOut, Sun, Moon } from 'lucide-react-native'
import { useNavigation } from '@react-navigation/native'
import { colors, spacing, radii, shadows } from '../ui/tokens'
import { VaaniText } from '../ui/VaaniText'
import { useAuthStore } from '../../store/useAuthStore'
import { useThemeStore } from '../../store/useThemeStore'
import { database } from '../../db/database'
import { Q } from '@nozbe/watermelondb'
import { t } from '../../i18n'

interface SidebarProps {
  activeThreadId?: string | null
  onThreadPress: (thread: any) => void
  onNewSearchPress: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeThreadId,
  onThreadPress,
  onNewSearchPress,
}) => {
  const farmer = useAuthStore((state) => state.farmer)
  const { mode, toggleTheme } = useThemeStore()
  const navigation = useNavigation<any>()
  const [recentThreads, setRecentThreads] = useState<any[]>([])

  useEffect(() => {
    fetchRecentThreads()
  }, [activeThreadId])

  const fetchRecentThreads = async () => {
    try {
      const threadsCollection = database.get('threads')
      const records = await threadsCollection
        .query(Q.sortBy('updated_at', Q.desc), Q.take(5))
        .fetch()
      setRecentThreads(records)
    } catch (e) {
      console.warn('Failed to query threads for sidebar:', e)
    }
  }

  const handleClearRecentThreads = async () => {
    const doClear = async () => {
      try {
        const threadsCollection = database.get('threads')
        const records = await threadsCollection.query().fetch()
        await database.write(async () => {
          for (const record of records) {
            await record.destroyPermanently()
          }
        })
        setRecentThreads([])
        onNewSearchPress()
      } catch (e) {
        console.warn('Failed to clear threads:', e)
      }
    }

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(t('sidebar.clear_confirm'))
      if (confirmed) {
        doClear()
      }
    } else {
      Alert.alert(
        t('sidebar.clear_recent'),
        t('sidebar.clear_confirm'),
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: t('sidebar.clear_recent'),
            style: 'destructive',
            onPress: doClear
          }
        ]
      )
    }
  }

  const handleLogout = async () => {
    const doLogout = async () => {
      await useAuthStore.getState().logout()
      navigation.replace('Welcome')
    }

    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to log out?')
      if (confirmed) {
        doLogout()
      }
    } else {
      Alert.alert(
        t('sidebar.log_out'),
        'Are you sure you want to log out?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: t('sidebar.log_out'),
            style: 'destructive',
            onPress: doLogout
          }
        ]
      )
    }
  }

  const getRelativeTime = (date: any): string => {
    const now = Date.now()
    const ts = date instanceof Date ? date.getTime() : date
    const diff = now - ts
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'now'
    if (minutes < 60) return `${minutes}m`
    if (hours < 24) return `${hours}h`
    return `${days}d`
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* New Search Button */}
        <TouchableOpacity onPress={onNewSearchPress} style={styles.newSearchBtn}>
          <Plus size={14} color={colors.text.secondary} />
          <VaaniText size="sm" color={colors.text.secondary} weight="semibold" style={styles.newSearchText}>
            {t('sidebar.new_search')}
          </VaaniText>
        </TouchableOpacity>

        {/* Recent Threads Label Row */}
        <View style={styles.recentHeaderRow}>
          <VaaniText size="xs" weight="bold" color={colors.text.tertiary} style={styles.sectionLabel}>
            {t('sidebar.recent_threads')}
          </VaaniText>
          {recentThreads.length > 0 && (
            <TouchableOpacity onPress={handleClearRecentThreads} style={styles.clearBtn} activeOpacity={0.7}>
              <Trash2 size={12} color={colors.text.tertiary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Threads List */}
        {recentThreads.map((thread) => {
          const isActive = thread.id === activeThreadId
          return (
            <TouchableOpacity
              key={thread.id}
              onPress={() => onThreadPress(thread)}
              style={[styles.threadItem, isActive && styles.threadItemActive]}
              activeOpacity={0.7}
            >
              <View style={[styles.threadDot, isActive && styles.threadDotActive]} />
              <VaaniText
                size="sm"
                color={isActive ? colors.green.dark : colors.text.secondary}
                weight={isActive ? 'bold' : 'regular'}
                numberOfLines={1}
                style={styles.threadText}
              >
                {thread.title}
              </VaaniText>
              <VaaniText size="xs" color={colors.text.tertiary} style={styles.threadTime}>
                {getRelativeTime(thread.updatedAt)}
              </VaaniText>
            </TouchableOpacity>
          )
        })}

        {recentThreads.length === 0 && (
          <VaaniText size="xs" color={colors.text.tertiary} style={styles.emptyText}>
            {t('sidebar.no_recent_threads')}
          </VaaniText>
        )}
      </ScrollView>

      {/* Farm Profile Card & Theme Toggle & Logout Button */}
      <View style={styles.profileSection}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs }}>
          <VaaniText size="xs" weight="bold" color={colors.text.tertiary} style={styles.sectionLabel}>
            {t('sidebar.farm_profile')}
          </VaaniText>
          <TouchableOpacity onPress={toggleTheme} style={styles.themeToggleBtn} activeOpacity={0.7}>
            {mode === 'dark' ? <Sun size={14} color="#F59E0B" /> : <Moon size={14} color={colors.text.secondary} />}
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          onPress={() => navigation.navigate('FarmerSetup')} 
          style={styles.farmerCard}
          activeOpacity={0.8}
        >
          <VaaniText size="sm" weight="bold" color={colors.green.dark}>
            {farmer?.name || 'Farmer'}
          </VaaniText>
          <View style={styles.metaRow}>
            <MapPin size={11} color={colors.green.dark} style={{ marginRight: 2 }} />
            <VaaniText size="xs" color={colors.green.dark}>
              {t('districts.' + (farmer?.district || 'Mandya'))}, {t('states.' + (farmer?.state || 'Karnataka'))}
            </VaaniText>
          </View>
          <View style={styles.tagsContainer}>
            {(farmer?.registeredCrops || ['Paddy']).map((crop, idx) => (
              <View key={idx} style={styles.tag}>
                <VaaniText size="xs" color={colors.green.dark} weight="semibold">
                  {t('crops.' + crop)}
                </VaaniText>
              </View>
            ))}
            <View style={styles.tag}>
              <VaaniText size="xs" color={colors.green.dark} weight="semibold">
                {farmer?.soilType || 'Sandy soil'}
              </VaaniText>
            </View>
            <View style={styles.tag}>
              <VaaniText size="xs" color={colors.green.dark} weight="semibold">
                {t('sidebar.acres', { count: farmer?.landAcres || 2 })}
              </VaaniText>
            </View>
          </View>
          <VaaniText size="xs" color={colors.text.tertiary} style={styles.tapToEdit}>
            {t('sidebar.tap_to_edit')}
          </VaaniText>
        </TouchableOpacity>

        {/* Log Out Action */}
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn} activeOpacity={0.7}>
          <LogOut size={14} color={colors.text.secondary} />
          <VaaniText size="sm" color={colors.text.secondary} weight="semibold" style={styles.logoutText}>
            {t('sidebar.log_out')}
          </VaaniText>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: 220,
    borderRightWidth: 1,
    borderRightColor: colors.border.default,
    backgroundColor: colors.bg.base,
    height: '100%',
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.md,
  },
  newSearchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border.default,
    marginBottom: spacing.base,
  },
  newSearchText: {
    marginLeft: spacing.sm,
  },
  recentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  clearBtn: {
    padding: 4,
  },
  sectionLabel: {
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 0,
    paddingHorizontal: spacing.xs,
  },
  threadItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    marginBottom: spacing.xs,
  },
  threadItemActive: {
    backgroundColor: colors.green.dim,
  },
  threadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border.strong,
    marginRight: spacing.sm,
  },
  threadDotActive: {
    backgroundColor: colors.green.bright,
  },
  threadText: {
    flex: 1,
    marginRight: spacing.xs,
  },
  threadTime: {
    marginLeft: 'auto',
  },
  emptyText: {
    paddingHorizontal: spacing.sm,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  profileSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
    paddingTop: spacing.base,
    marginTop: spacing.md,
  },
  farmerCard: {
    backgroundColor: colors.green.dim,
    borderColor: '#9FE1CB',
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.sm,
    marginTop: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: spacing.xs,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: spacing.xs,
  },
  tag: {
    backgroundColor: '#FFFFFF',
    borderColor: '#5DCAA5',
    borderWidth: 1,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  tapToEdit: {
    fontSize: 9,
    textAlign: 'center',
    textDecorationLine: 'underline',
    marginTop: spacing.xs,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border.default,
    marginTop: spacing.md,
  },
  logoutText: {
    marginLeft: spacing.sm,
  },
  themeToggleBtn: {
    padding: 4,
    borderRadius: radii.sm,
  },
})

export default Sidebar
