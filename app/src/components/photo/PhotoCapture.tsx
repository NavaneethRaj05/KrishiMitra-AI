/**
 * PhotoCapture — full-screen camera / gallery modal for crop scanning.
 * Theme-aware: adapts to light / dark / system.
 */

import React, { useState, useEffect } from 'react'
import {
  StyleSheet, View, TouchableOpacity, Modal, Alert, ActivityIndicator,
} from 'react-native'
import { Camera, CameraView } from 'expo-camera'
import { X, ImageIcon, Zap, RefreshCw } from 'lucide-react-native'
import Svg, { Rect } from 'react-native-svg'
import { useTheme } from '../../hooks/useTheme'
import { spacing, radii } from '../../theme/tokens'
import { KMText } from '../ui/Text'
import { photoService } from '../../services/photoService'

interface PhotoCaptureProps {
  onClose: () => void
  navigation: any
  onPhotoSelected?: (uri: string) => void | Promise<void>
}

export const PhotoCapture: React.FC<PhotoCaptureProps> = ({
  onClose,
  navigation,
  onPhotoSelected,
}) => {
  const { theme } = useTheme()
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [mode, setMode] = useState<'disease' | 'pest' | 'soil'>('disease')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    Camera.requestCameraPermissionsAsync().then(({ status }) =>
      setHasPermission(status === 'granted'),
    )
  }, [])

  const handleGallerySelect = async () => {
    const uri = await photoService.selectPhotoFromGallery()
    if (uri) processPhoto(uri)
  }

  const handleCapture = () => {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      processPhoto('mock_captured_image_uri')
    }, 900)
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
    navigation.navigate('AskResult', {
      query: `Treatment for ${result.disease}`,
      imageUri: uri,
      imageContext: result,
    })
  }

  if (hasPermission === null) {
    return (
      <Modal visible transparent>
        <View style={[styles.overlay, { backgroundColor: theme.bg.base }]}>
          <ActivityIndicator size="large" color={theme.accent.primary} />
        </View>
      </Modal>
    )
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: theme.bg.base }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border.subtle }]}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
            <X size={24} color={theme.text.primary} />
          </TouchableOpacity>
          <KMText size="md" weight="semibold">Scan Crop</KMText>
          <TouchableOpacity style={styles.headerBtn}>
            <Zap size={20} color={theme.text.secondary} />
          </TouchableOpacity>
        </View>

        {/* Viewfinder */}
        <View style={styles.viewfinder}>
          {hasPermission ? (
            <CameraView style={StyleSheet.absoluteFillObject} />
          ) : (
            <View style={[styles.cameraFallback, { backgroundColor: theme.bg.subtle }]}>
              <KMText size="sm" color={theme.text.secondary} align="center">
                Camera permission not granted.{'\n'}Use Gallery to upload a leaf photo.
              </KMText>
            </View>
          )}

          {/* Guide frame */}
          <Svg style={[StyleSheet.absoluteFillObject, { pointerEvents: 'none' } as any]}>
            <Rect
              x="8%"
              y="12%"
              width="84%"
              height="72%"
              rx={radii.md}
              fill="none"
              stroke={theme.accent.primary}
              strokeWidth="2"
              strokeDasharray="12,6"
            />
          </Svg>

          <View style={styles.guideLabel}>
            <KMText size="sm" weight="semibold" color={theme.accent.primary} align="center">
              Centre the leaf within the frame
            </KMText>
          </View>
        </View>

        {/* Mode tabs */}
        <View style={[styles.tabs, { backgroundColor: theme.bg.surface, borderColor: theme.border.default }]}>
          {(['disease', 'pest', 'soil'] as const).map((m) => (
            <TouchableOpacity
              key={m}
              onPress={() => setMode(m)}
              style={[
                styles.tab,
                mode === m && { backgroundColor: theme.accent.primary },
              ]}
            >
              <KMText
                size="xs"
                weight="bold"
                color={mode === m ? theme.text.inverse : theme.text.secondary}
              >
                {m.toUpperCase()}
              </KMText>
            </TouchableOpacity>
          ))}
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity onPress={handleGallerySelect} style={styles.controlBtn}>
            <ImageIcon size={24} color={theme.text.primary} />
            <KMText size="xs" color={theme.text.secondary} style={styles.controlLabel}>Gallery</KMText>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleCapture}
            disabled={loading}
            style={[styles.captureBtn, { borderColor: theme.text.inverse }]}
          >
            {loading
              ? <ActivityIndicator color={theme.text.inverse} />
              : <View style={[styles.captureInner, { backgroundColor: theme.text.inverse }]} />
            }
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => Alert.alert('Batch mode', 'Batch processing coming soon.')}
            style={styles.controlBtn}
          >
            <RefreshCw size={24} color={theme.text.primary} />
            <KMText size="xs" color={theme.text.secondary} style={styles.controlLabel}>Batch</KMText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: spacing.base,
    borderBottomWidth: 1,
  },
  headerBtn: {
    padding: spacing.sm,
    width: 40,
    alignItems: 'center',
  },
  viewfinder: {
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
  guideLabel: {
    position: 'absolute',
    bottom: spacing.lg,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  tabs: {
    flexDirection: 'row',
    borderRadius: radii.md,
    borderWidth: 1,
    margin: spacing.base,
    padding: 3,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
  },
  controls: {
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
  controlLabel: {
    marginTop: spacing.xs,
  },
  captureBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
})

export default PhotoCapture
