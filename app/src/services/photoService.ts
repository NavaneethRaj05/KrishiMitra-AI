import * as ImagePicker from 'expo-image-picker'
import { Platform } from 'react-native'

export interface DiseaseDetectionResult {
  disease: string
  confidence: number
  severity: 'low' | 'moderate' | 'high'
  treatmentPlan: {
    immediate: string
    chemical: string
    organic: string
    costEstimate: string
  }
}

class PhotoService {
  private session: any = null

  async initModel() {
    if (this.session || Platform.OS === 'web') return

    try {
      let modelModule: any = null
      try {
        modelModule = require('../../assets/models/disease_detector.onnx')
      } catch (modErr) {
        console.info('ℹ️ disease_detector.onnx asset not bundled (see models/disease_model/README.md). Local CNN offline inference disabled.')
        return
      }

      const { Asset } = require('expo-asset')
      const { InferenceSession } = require('onnxruntime-react-native')
      
      const modelAsset = Asset.fromModule(modelModule)
      await modelAsset.downloadAsync()

      // Validate asset size (>1KB) to avoid attempting to parse placeholder files
      const { getInfoAsync } = require('expo-file-system')
      if (modelAsset.localUri) {
        const info = await getInfoAsync(modelAsset.localUri)
        if (info.exists && info.size && info.size < 1024) {
          console.warn(`⚠️ Offline disease ONNX model asset is under 1KB (${info.size} bytes). Local CNN inference is unavailable offline.`)
          return
        }
      }

      // Load bundled ONNX model
      this.session = await InferenceSession.create(
        modelAsset.localUri || modelModule
      )
      console.log('✅ Disease detector ONNX model loaded successfully.')
    } catch (e) {
      console.warn('Disease detector ONNX model unavailable offline (requires trained CNN artifact). Using agronomic knowledge fallback.', e)
    }
  }

  async selectPhotoFromGallery(): Promise<string | null> {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!permission.granted) {
        console.warn('Gallery permission denied')
        return null
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      })

      if (!result.canceled && result.assets && result.assets.length > 0) {
        return result.assets[0].uri
      }
    } catch (e) {
      console.error('Gallery picker failed:', e)
    }
    return null
  }

  async capturePhoto(): Promise<string | null> {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync()
      if (!permission.granted) {
        console.warn('Camera permission denied')
        return null
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      })

      if (!result.canceled && result.assets && result.assets.length > 0) {
        return result.assets[0].uri
      }
    } catch (e) {
      console.error('Camera capture failed:', e)
    }
    return null
  }

  async runDiseaseDetection(imageUri: string): Promise<DiseaseDetectionResult> {
    await this.initModel()

    if (this.session) {
      try {
        // Prepare image tensor (resize, normalization) and execute session
        // const preprocessed = await this.preprocessImage(imageUri);
        // const input = new Tensor('float32', preprocessed, [1, 3, 224, 224]);
        // const output = await this.session.run({ input });
        // return this.parseModelOutputs(output);
      } catch (err) {
        console.warn('ONNX inference failed, using fallback:', err)
      }
    }

    // Fallback/development mock inference
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(this.getMockDetectionResult(imageUri))
      }, 1500)
    })
  }

  private getMockDetectionResult(imageUri: string): DiseaseDetectionResult {
    // Return honest offline state explaining that on-device CNN is unavailable
    return {
      disease: 'General ICAR Agronomic Advisory (Photo Not Analyzed Offline)',
      confidence: 0.0,
      severity: 'moderate',
      treatmentPlan: {
        immediate: '📴 Offline mode: photo analysis needs internet (Gemini Vision). Here is general ICAR guidance for common foliar conditions.',
        chemical: 'For common fungal leaf spots: Tricyclazole 75% WP @ 0.6g/L or Mancozeb 75% WP @ 2g/L as standard ICAR recommendation.',
        organic: 'Spray Neem Oil (3000 ppm) @ 5ml/L or Pseudomonas fluorescens @ 5g/L during early morning hours.',
        costEstimate: '₹160–₹220 per acre (Standard ICAR estimate)'
      }
    }
  }
}

export const photoService = new PhotoService()
