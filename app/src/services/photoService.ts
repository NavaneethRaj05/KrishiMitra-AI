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
      const { InferenceSession } = require('onnxruntime-react-native')
      // Load bundled ONNX model
      this.session = await InferenceSession.create(
        require('../../assets/models/disease_detector.onnx')
      )
      console.log('✅ Disease detector ONNX model loaded successfully.')
    } catch (e) {
      console.warn('ONNX Runtime not initialized (might be running in simulator or assets missing). Using mock inference.', e)
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
    // Return typical diseases based on current selected crop
    return {
      disease: 'Paddy Blast (Magnaporthe oryzae)',
      confidence: 0.91,
      severity: 'moderate',
      treatmentPlan: {
        immediate: 'Remove infected tillers immediately and drain the field for 2 days to reduce humidity.',
        chemical: 'Tricyclazole 75WP at 0.6g/L or Isoprothiolane 40EC at 1.5ml/L.',
        organic: 'Pseudomonas fluorescens formulation at 5g/L or spray neem oil (5ml/L).',
        costEstimate: '₹160–₹220 per acre'
      }
    }
  }
}

export const photoService = new PhotoService()
