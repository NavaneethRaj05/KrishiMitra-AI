import React, { useState, useEffect } from 'react'
import { StyleSheet, View, TouchableOpacity, Modal, Alert, ActivityIndicator } from 'react-native'
import { Camera, CameraView } from 'expo-camera'
import { X, ImageIcon, Zap, RefreshCw } from 'lucide-react-native'
import Svg, { Rect } from 'react-native-svg'
import { colors, spacing, radii } from '../ui/tokens'
import { VaaniText } from '../ui/VaaniText'
import { photoService } from '../../services/photoService'

interface PhotoCaptureProps {
  onClose: () => void
  navigation: any
  onPhotoSelected?: (uri: string) => void | Promise<void>
}

export const PhotoCapture: React.FC<PhotoCaptureProps> = ({ onClose, navigation, onPhotoSelected }) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [mode, setMode] = useState<'disease' | 'pest' | 'soil'>('disease')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync()
      setHasPermission(status === 'granted')
    })()
  }, [])

  const handleGallerySelect = async () => {
    const uri = await photoService.selectPhotoFromGallery()
    if (uri) {
      processPhoto(uri)
    }
  }

  const handleCapture = async () => {
    // Standard mock capture to make it fully functional in emulator and web
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      processPhoto('mock_captured_image_uri')
    }, 1000)
  }

  const processPhoto = async (uri: string) => {
    setLoading(true)
    if (onPhotoSelected) {
      await onPhotoSelected(uri)
      setLoading(false)
      onClose()
      return
    }
    const result = await photoService.runDiseaseDetection(uri)
    setLoading(false)
    onClose()
    
    // Navigate to annotated result screen
    navigation.navigate('SearchResult', {
      query: `Treatment for ${result.disease}`,
      imageUri: uri,
      imageContext: result,
      autoSubmit: true
    })
  }

  if (hasPermission === null) {
    return (
      <Modal visible transparent>
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={colors.green.bright} />
        </View>
      </Modal>
    )
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
            <X size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <VaaniText size="md" weight="bold">
            Scan Crop
          </VaaniText>
          <TouchableOpacity style={styles.headerBtn}>
            <Zap size={20} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        {/* Viewfinder Area */}
        <View style={styles.viewfinderContainer}>
          {hasPermission ? (
            <CameraView style={StyleSheet.absoluteFillObject} />
          ) : (
            <View style={styles.cameraFallback}>
              <VaaniText size="sm" color={colors.text.secondary} align="center">
                Camera access not granted. Click "Gallery" to upload a leaf photo.
              </VaaniText>
            </View>
          )}

          {/* SVG Guide Overlay Frame */}
          <Svg style={[StyleSheet.absoluteFillObject, { pointerEvents: 'none' } as any]}>
            <Rect
              x="10%"
              y="15%"
              width="80%"
              height="70%"
              rx={radii.md}
              fill="none"
              stroke={colors.green.bright}
              strokeWidth="2"
              strokeDasharray="10, 5"
            />
          </Svg>

          <View style={styles.guideTextContainer}>
            <VaaniText size="sm" weight="semibold" color={colors.green.bright} align="center">
              Position leaf inside the outline frame
            </VaaniText>
          </View>
        </View>

        {/* Mode Selector tabs */}
        <View style={styles.tabContainer}>
          {(['disease', 'pest', 'soil'] as const).map((t) => {
            const isSelected = mode === t
            return (
              <TouchableOpacity
                key={t}
                onPress={() => setMode(t)}
                style={[styles.tab, isSelected && styles.tabSelected]}
              >
                <VaaniText size="sm" color={isSelected ? colors.text.inverse : colors.text.secondary} weight="bold">
                  {t.toUpperCase()}
                </VaaniText>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Action Controls */}
        <View style={styles.controlsContainer}>
          <TouchableOpacity onPress={handleGallerySelect} style={styles.controlBtn}>
            <ImageIcon size={24} color={colors.text.primary} />
            <VaaniText size="xs" color={colors.text.secondary} style={styles.controlText}>
              Gallery
            </VaaniText>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleCapture} style={styles.captureBtn} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={colors.text.inverse} />
            ) : (
              <View style={styles.captureInnerCircle} />
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => Alert.alert('Batch mode', 'Batch processing coming soon.')} style={styles.controlBtn}>
            <RefreshCw size={24} color={colors.text.primary} />
            <VaaniText size="xs" color={colors.text.secondary} style={styles.controlText}>
              Batch
            </VaaniText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: colors.bg.base,
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: spacing.base,
    borderBottomColor: colors.border.default,
    borderBottomWidth: 1,
  },
  headerBtn: {
    padding: spacing.sm,
  },
  viewfinderContainer: {
    flex: 1,
    backgroundColor: '#000',
    position: 'relative',
  },
  cameraFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  guideTextContainer: {
    position: 'absolute',
    bottom: spacing.lg,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.bg.card,
    borderRadius: radii.md,
    margin: spacing.base,
    padding: 2,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  tabSelected: {
    backgroundColor: colors.green.bright,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: spacing.xl,
    paddingTop: spacing.sm,
  },
  controlBtn: {
    alignItems: 'center',
    padding: spacing.sm,
    width: 80,
  },
  controlText: {
    marginTop: spacing.xs,
  },
  captureBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureInnerCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
})
export default PhotoCapture;
