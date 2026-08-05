/**
 * TasksScreen — farm task & reminder management.
 * Shows pending treatments, irrigation reminders, follow-up checks.
 */

import React, { useState } from 'react'
import {
  StyleSheet,
  View,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native'
import {
  CheckCircle2, Circle, Clock, AlertTriangle,
  Droplet, Leaf, Calendar, ChevronRight,
} from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import { spacing, radii, shadows } from '../../theme/tokens'
import { KMText } from '../../components/ui/Text'
import { KMCard } from '../../components/ui/Card'
import { KMBadge } from '../../components/ui/Badge'
import { KMStatusBar } from '../../components/ui/StatusBar'
import { useAuthStore } from '../../store/useAuthStore'

type TaskStatus = 'pending' | 'done' | 'delayed' | 'offline'
type TaskType = 'treatment' | 'irrigation' | 'spray' | 'checkup' | 'harvest'

interface Task {
  id: string
  title: string
  description: string
  dueDate: string
  type: TaskType
  status: TaskStatus
  crop?: string
}

// Sample tasks — in production these come from WatermelonDB
const SAMPLE_TASKS: Task[] = [
  {
    id: '1',
    title: 'Apply Tricyclazole spray',
    description: 'Paddy blast control — spray Tricyclazole 75WP @ 0.6g/L on affected fields.',
    dueDate: 'Today',
    type: 'spray',
    status: 'pending',
    crop: 'Paddy',
  },
  {
    id: '2',
    title: 'Irrigation — North Field',
    description: 'Next drip irrigation cycle due for sugarcane (2 hours).',
    dueDate: 'Tomorrow',
    type: 'irrigation',
    status: 'pending',
    crop: 'Sugarcane',
  },
  {
    id: '3',
    title: 'Follow-up leaf check',
    description: 'Compare paddy leaf images with last week. Look for blast spread.',
    dueDate: '3 days',
    type: 'checkup',
    status: 'pending',
    crop: 'Paddy',
  },
  {
    id: '4',
    title: 'Organic fertilizer dose',
    description: 'Apply Jeevamrut @ 200L/acre on tomato beds.',
    dueDate: 'Yesterday',
    type: 'treatment',
    status: 'delayed',
    crop: 'Tomato',
  },
  {
    id: '5',
    title: 'Weeding — Maize plot',
    description: 'Manual weeding between rows before flowering stage.',
    dueDate: '2 days ago',
    type: 'treatment',
    status: 'done',
    crop: 'Maize',
  },
]

const TASK_ICONS: Record<TaskType, any> = {
  treatment:  Leaf,
  irrigation: Droplet,
  spray:      AlertTriangle,
  checkup:    Calendar,
  harvest:    CheckCircle2,
}

const TASK_COLORS: Record<TaskType, string> = {
  treatment:  '#1D9E75',
  irrigation: '#0284C7',
  spray:      '#D4860A',
  checkup:    '#4F46A8',
  harvest:    '#3DAF6E',
}

const STATUS_VARIANT: Record<TaskStatus, any> = {
  pending:  'warning',
  done:     'success',
  delayed:  'error',
  offline:  'neutral',
}

export default function TasksScreen({ navigation }: any) {
  const { theme } = useTheme()
  const farmer = useAuthStore((s) => s.farmer)
  const [tasks, setTasks] = useState<Task[]>(SAMPLE_TASKS)
  const [filter, setFilter] = useState<'all' | TaskStatus>('all')

  const filtered = filter === 'all' ? tasks : tasks.filter((t) => t.status === filter)
  const pending = tasks.filter((t) => t.status === 'pending').length
  const delayed = tasks.filter((t) => t.status === 'delayed').length

  const toggleDone = (id: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, status: t.status === 'done' ? 'pending' : 'done' } : t,
      ),
    )
  }

  const filters: { key: 'all' | TaskStatus; label: string }[] = [
    { key: 'all',     label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'delayed', label: 'Delayed' },
    { key: 'done',    label: 'Done' },
  ]

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg.base }]}>
      <KMStatusBar />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border.subtle }]}>
        <View>
          <KMText size="2xl" weight="bold">Farm Tasks</KMText>
          <KMText size="base" color={theme.text.tertiary} style={{ marginTop: 4 }}>
            {pending} pending · {delayed} delayed
          </KMText>
        </View>
      </View>

      {/* Summary cards */}
      <View style={styles.summaryRow}>
        {[
          { label: 'Pending', count: pending, color: theme.status.warning, bg: theme.status.warningBg },
          { label: 'Delayed', count: delayed, color: theme.status.error, bg: theme.status.errorBg },
          { label: 'Done', count: tasks.filter((t) => t.status === 'done').length, color: theme.status.success, bg: theme.status.successBg },
        ].map((s, i) => (
          <View key={i} style={[styles.summaryCard, { backgroundColor: s.bg, borderColor: s.color + '30' }]}>
            <KMText size="2xl" weight="bold" color={s.color}>{s.count}</KMText>
            <KMText size="xs" color={s.color} weight="bold" style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</KMText>
          </View>
        ))}
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        {filters.map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            onPress={() => setFilter(key)}
            style={[styles.filterChip, {
              backgroundColor: filter === key ? theme.accent.primary : theme.bg.surface,
              borderColor: filter === key ? theme.accent.primary : theme.border.default,
            }]}
            activeOpacity={0.7}
          >
            <KMText
              size="sm"
              weight="bold"
              color={filter === key ? theme.text.inverse : theme.text.secondary}
            >
              {label}
            </KMText>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <CheckCircle2 size={48} color={theme.text.tertiary} />
            <KMText size="lg" weight="medium" color={theme.text.tertiary} align="center" style={{ marginTop: spacing.md }}>
              No tasks in this category
            </KMText>
          </View>
        ) : (
          filtered.map((task) => {
            const Icon = TASK_ICONS[task.type]
            const accentColor = TASK_COLORS[task.type]
            const isDone = task.status === 'done'

            return (
              <TouchableOpacity
                key={task.id}
                activeOpacity={0.8}
                style={[styles.taskCard, {
                  backgroundColor: theme.bg.surface,
                  borderColor: isDone ? theme.border.subtle : theme.border.default,
                  opacity: isDone ? 0.7 : 1,
                  ...(isDone ? {} : shadows.sm),
                }]}
              >
                {/* Left: check toggle */}
                <TouchableOpacity
                  onPress={() => toggleDone(task.id)}
                  style={styles.checkBtn}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  {isDone
                    ? <CheckCircle2 size={24} color={theme.status.success} />
                    : <Circle size={24} color={theme.border.strong} />
                  }
                </TouchableOpacity>

                {/* Main content */}
                <View style={styles.taskMain}>
                  <View style={styles.taskTitleRow}>
                    <KMText
                      size="base"
                      weight="bold"
                      style={[isDone ? styles.doneTitle : undefined, { flex: 1, paddingRight: 8 }]}
                    >
                      {task.title}
                    </KMText>
                    <KMBadge
                      label={task.status}
                      variant={STATUS_VARIANT[task.status]}
                      size="xs"
                    />
                  </View>
                  <KMText size="sm" color={theme.text.secondary} style={{ marginTop: 2, lineHeight: 20 }}>
                    {task.description}
                  </KMText>
                  <View style={styles.taskMeta}>
                    <View style={[styles.typeTag, { backgroundColor: accentColor + '15' }]}>
                      <Icon size={12} color={accentColor} />
                      <KMText size="xs" color={accentColor} weight="bold" style={{ marginLeft: 4 }}>
                        {task.crop}
                      </KMText>
                    </View>
                    <View style={styles.dueDateRow}>
                      <Clock size={12} color={theme.text.tertiary} />
                      <KMText size="xs" color={theme.text.tertiary} weight="medium" style={{ marginLeft: 4 }}>
                        {task.dueDate}
                      </KMText>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            )
          })
        )}
        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: 4,
  },
  filterScroll: {
    maxHeight: 48,
    marginBottom: spacing.md,
  },
  filterContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    alignItems: 'center',
  },
  filterChip: {
    borderRadius: radii.full,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  checkBtn: {
    marginTop: 2,
  },
  taskMain: {
    flex: 1,
  },
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  doneTitle: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  typeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  dueDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
})
