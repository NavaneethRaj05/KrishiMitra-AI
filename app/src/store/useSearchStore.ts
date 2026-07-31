import { create } from 'zustand'

export interface Citation {
  source: string
  title: string
  url: string
  snippet: string
  authority_badge?: string
  authority_tier?: 'gold' | 'silver' | 'bronze' | 'basic'
  relevance_score?: number
}

export interface SourceBreakdown {
  rag: number
  kag: number
  web: number
}

interface SearchState {
  currentQuery: string
  currentAnswer: string | null
  currentCitations: Citation[]
  currentFollowUps: string[]
  currentThreadId: string | null
  isSearching: boolean
  intent: string | null
  offlineFallbackUsed: boolean
  confidenceScore: number
  sourceBreakdown: SourceBreakdown
  detectedLanguage: string
  answerLanguage: string
  inputMode: 'text' | 'voice' | 'image' | 'multimodal'
  
  setQuery: (query: string) => void
  setAnswer: (answer: string | null) => void
  setCitations: (citations: Citation[]) => void
  setFollowUps: (followUps: string[]) => void
  setThreadId: (threadId: string | null) => void
  setSearching: (isSearching: boolean) => void
  setIntent: (intent: string | null) => void
  setOfflineFallbackUsed: (used: boolean) => void
  setConfidenceScore: (score: number) => void
  setSourceBreakdown: (breakdown: SourceBreakdown) => void
  setDetectedLanguage: (lang: string) => void
  setAnswerLanguage: (lang: string) => void
  setInputMode: (mode: 'text' | 'voice' | 'image' | 'multimodal') => void
  resetSearch: () => void
}

export const useSearchStore = create<SearchState>((set) => ({
  currentQuery: '',
  currentAnswer: null,
  currentCitations: [],
  currentFollowUps: [],
  currentThreadId: null,
  isSearching: false,
  intent: null,
  offlineFallbackUsed: false,
  confidenceScore: 0,
  sourceBreakdown: { rag: 0, kag: 0, web: 0 },
  detectedLanguage: 'en',
  answerLanguage: 'en',
  inputMode: 'text',

  setQuery: (currentQuery) => set({ currentQuery }),
  setAnswer: (currentAnswer) => set({ currentAnswer }),
  setCitations: (currentCitations) => set({ currentCitations }),
  setFollowUps: (currentFollowUps) => set({ currentFollowUps }),
  setThreadId: (currentThreadId) => set({ currentThreadId }),
  setSearching: (isSearching) => set({ isSearching }),
  setIntent: (intent) => set({ intent }),
  setOfflineFallbackUsed: (offlineFallbackUsed) => set({ offlineFallbackUsed }),
  setConfidenceScore: (confidenceScore) => set({ confidenceScore }),
  setSourceBreakdown: (sourceBreakdown) => set({ sourceBreakdown }),
  setDetectedLanguage: (detectedLanguage) => set({ detectedLanguage }),
  setAnswerLanguage: (answerLanguage) => set({ answerLanguage }),
  setInputMode: (inputMode) => set({ inputMode }),
  
  resetSearch: () => set({
    currentQuery: '',
    currentAnswer: null,
    currentCitations: [],
    currentFollowUps: [],
    isSearching: false,
    intent: null,
    offlineFallbackUsed: false,
    confidenceScore: 0,
    sourceBreakdown: { rag: 0, kag: 0, web: 0 },
    detectedLanguage: 'en',
    answerLanguage: 'en',
    inputMode: 'text',
  })
}))
