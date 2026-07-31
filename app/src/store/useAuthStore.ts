import { create } from 'zustand'
import { secureStore } from '../utils/secureStore'
import { MMKV } from 'react-native-mmkv'

const storage = new MMKV()

export interface FarmerContext {
  farmerId: string
  name: string
  phone: string
  state: string
  district: string
  block: string
  registeredCrops: string[]
  landAcres: number
  soilType: string
  irrigationType: string
  preferredLanguage: string
  cropPhase: string // e.g. 'germination' | 'vegetative' | 'flowering' | 'maturity'
}

interface AuthState {
  token: string | null
  farmer: FarmerContext | null
  isAuthenticated: boolean
  isLoading: boolean
  isOnboarded: boolean
  setToken: (token: string | null) => Promise<void>
  setFarmer: (farmer: Partial<FarmerContext> | null) => void
  setOnboarded: (onboarded: boolean) => void
  logout: () => Promise<void>
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  farmer: null,
  isAuthenticated: false,
  isLoading: true,
  isOnboarded: false,

  setToken: async (token) => {
    if (token) {
      await secureStore.setItemAsync('auth_token', token)
      storage.set('auth_token', token)
      set({ token, isAuthenticated: true })
    } else {
      await secureStore.deleteItemAsync('auth_token')
      storage.delete('auth_token')
      set({ token: null, isAuthenticated: false })
    }
  },

  setFarmer: (farmer) => {
    if (farmer) {
      const current = get().farmer || {} as FarmerContext
      const updated = { ...current, ...farmer } as FarmerContext
      storage.set('farmer_context', JSON.stringify(updated))
      set({ farmer: updated })
    } else {
      storage.delete('farmer_context')
      set({ farmer: null })
    }
  },

  setOnboarded: (isOnboarded) => {
    storage.set('is_onboarded', isOnboarded)
    set({ isOnboarded })
  },

  logout: async () => {
    await secureStore.deleteItemAsync('auth_token')
    storage.delete('auth_token')
    storage.delete('farmer_context')
    storage.delete('is_onboarded')
    set({ token: null, farmer: null, isAuthenticated: false, isOnboarded: false })
  },

  initialize: async () => {
    try {
      set({ isLoading: true })
      let token = await secureStore.getItemAsync('auth_token')
      if (!token) {
        token = storage.getString('auth_token') || null
      }
      
      const cachedContext = storage.getString('farmer_context')
      let farmer = null
      if (cachedContext) {
        try {
          farmer = JSON.parse(cachedContext)
        } catch (e) {}
      }

      const isOnboarded = storage.getBoolean('is_onboarded') || !!(farmer && farmer.name)

      set({
        token,
        farmer,
        isAuthenticated: !!token,
        isOnboarded,
        isLoading: false
      })
    } catch (e) {
      set({ isLoading: false })
    }
  }
}))
