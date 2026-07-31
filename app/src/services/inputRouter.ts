/**
 * InputRouter — Unified input routing service
 * Accepts text, voice, and image inputs. Auto-detects input type
 * and routes through a single pipeline via searchService.
 */
import { searchService, SearchResult } from './searchService'

export type InputMode = 'text' | 'voice' | 'image' | 'multimodal'

export interface UnifiedInput {
  text?: string
  imageUri?: string | null
  imageB64?: string | null
  audioUri?: string | null
  detectedLanguage?: string
  threadId?: string | null
}

export interface RoutedResult extends SearchResult {
  inputMode: InputMode
}

class InputRouterService {
  /**
   * Detect the type of input based on what's provided.
   */
  detectInputType(input: UnifiedInput): InputMode {
    const hasText = !!(input.text && input.text.trim().length > 0)
    const hasImage = !!(input.imageUri || input.imageB64)
    const hasAudio = !!input.audioUri

    if (hasText && hasImage) return 'multimodal'
    if (hasImage) return 'image'
    if (hasAudio) return 'voice'
    return 'text'
  }

  /**
   * Route unified input through the search pipeline.
   * Normalizes all modalities into a single searchService.search() call.
   */
  async routeInput(input: UnifiedInput): Promise<RoutedResult> {
    const mode = this.detectInputType(input)

    // Normalize the query text
    let queryText = input.text?.trim() || ''

    // For image-only input, generate a default query
    if (mode === 'image' && !queryText) {
      queryText = 'Diagnose crop leaf disease from this image'
    }

    // For voice-only, the transcript should already be in text
    if (mode === 'voice' && !queryText) {
      queryText = 'Agricultural query from voice input'
    }

    // Build image context if available
    let imageContext: any = null
    if (input.imageUri || input.imageB64) {
      imageContext = {
        hasImage: true,
        imageUri: input.imageUri || null,
      }
    }

    // Execute search through unified pipeline
    const result = await searchService.search(
      queryText,
      input.threadId || null,
      imageContext,
      input.imageB64 || null,
      input.detectedLanguage
    )

    return {
      ...result,
      inputMode: mode,
    }
  }

  /**
   * Get a human-readable label for the input mode.
   */
  getModeLabel(mode: InputMode): { icon: string; label: string } {
    switch (mode) {
      case 'voice':
        return { icon: '🎤', label: 'Voice' }
      case 'image':
        return { icon: '📷', label: 'Image' }
      case 'multimodal':
        return { icon: '🔗', label: 'Text + Image' }
      default:
        return { icon: '⌨', label: 'Text' }
    }
  }
}

export const inputRouter = new InputRouterService()
