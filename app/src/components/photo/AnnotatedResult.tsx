import React from 'react'
import { StyleSheet, View, Image, TouchableOpacity } from 'react-native'
import { colors, spacing, radii, shadows } from '../ui/tokens'
import { VaaniText } from '../ui/VaaniText'
import { ChevronRight } from 'lucide-react-native'

interface AnnotatedResultProps {
  imageUri: string
  disease: string
  confidence: number
  severity: string
  treatmentPlan: {
    immediate: string
    chemical: string
    organic: string
    costEstimate: string
  }
  onAskClick: () => void
}

export const AnnotatedResult: React.FC<AnnotatedResultProps> = ({
  imageUri,
  disease,
  confidence,
  severity,
  treatmentPlan,
  onAskClick
}) => {
  return (
    <View style={styles.container}>
      {/* Leaf photo with bounding box overlays */}
      <View style={styles.imageContainer}>
        {imageUri && imageUri !== 'mock_captured_image_uri' ? (
          <Image source={{ uri: imageUri }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.placeholderImage]}>
            <VaaniText size="xxl">🍃</VaaniText>
            <VaaniText size="sm" color={colors.text.secondary} style={styles.placeholderText}>
              Leaf Photo Viewfinder
            </VaaniText>
          </View>
        )}

        {/* Mock bounding box overlay */}
        <View style={styles.boundingBox}>
          <View style={styles.boxTag}>
            <VaaniText size="xs" weight="bold" color="#fff">
              BLAST {(confidence * 100).toFixed(0)}%
            </VaaniText>
          </View>
        </View>
      </View>

      {/* Detection parameters card */}
      <View style={styles.resultsCard}>
        <VaaniText size="md" weight="bold" color={colors.green.bright} style={styles.title}>
          Detection Result
        </VaaniText>
        
        <View style={styles.row}>
          <VaaniText size="base" weight="semibold">Disease:</VaaniText>
          <VaaniText size="base" color={colors.text.primary}>{disease}</VaaniText>
        </View>

        <View style={styles.row}>
          <VaaniText size="sm" color={colors.text.secondary}>Severity:</VaaniText>
          <VaaniText size="sm" weight="bold" color={colors.amber.bright}>
            {severity.toUpperCase()} ●●●○○
          </VaaniText>
        </View>

        <View style={styles.row}>
          <VaaniText size="sm" color={colors.text.secondary}>Confidence:</VaaniText>
          <VaaniText size="sm" color={colors.text.primary}>{(confidence * 100).toFixed(0)}%</VaaniText>
        </View>
      </View>

      {/* Treatment summary */}
      <View style={styles.treatmentCard}>
        <VaaniText size="sm" weight="bold" color={colors.amber.bright} style={styles.label}>
          Immediate action:
        </VaaniText>
        <VaaniText size="sm" style={styles.val}>
          {treatmentPlan.immediate}
        </VaaniText>

        <VaaniText size="sm" weight="bold" color={colors.green.bright} style={styles.label}>
          Chemical:
        </VaaniText>
        <VaaniText size="sm" style={styles.val}>
          {treatmentPlan.chemical}
        </VaaniText>

        <VaaniText size="sm" weight="bold" color={colors.sand.bright} style={styles.label}>
          Organic:
        </VaaniText>
        <VaaniText size="sm" style={styles.val}>
          {treatmentPlan.organic}
        </VaaniText>

        <VaaniText size="xs" color={colors.text.tertiary} style={styles.label}>
          Estimated Cost: <VaaniText size="xs" weight="bold" color={colors.green.bright}>{treatmentPlan.costEstimate}</VaaniText>
        </VaaniText>
      </View>

      {/* Inter-linking conversational button */}
      <TouchableOpacity onPress={onAskClick} style={styles.askBtn}>
        <VaaniText size="base" weight="semibold" color={colors.text.inverse}>
          Ask about this disease
        </VaaniText>
        <ChevronRight size={18} color={colors.text.inverse} />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    padding: spacing.sm,
  },
  imageContainer: {
    height: 200,
    width: '100%',
    borderRadius: radii.md,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    backgroundColor: '#1E190E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    marginTop: spacing.sm,
  },
  boundingBox: {
    position: 'absolute',
    top: '30%',
    left: '25%',
    width: '50%',
    height: '40%',
    borderColor: colors.red,
    borderWidth: 2,
    borderRadius: radii.sm,
  },
  boxTag: {
    backgroundColor: colors.red,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  resultsCard: {
    backgroundColor: colors.bg.card,
    borderColor: colors.border.default,
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  title: {
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  treatmentCard: {
    backgroundColor: colors.bg.card2,
    borderColor: colors.border.strong,
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  label: {
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  val: {
    color: colors.text.primary,
  },
  askBtn: {
    backgroundColor: colors.green.bright,
    borderRadius: radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    ...shadows.card,
  },
})
export default AnnotatedResult;
